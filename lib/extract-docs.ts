import "server-only";
import { crossCheck } from "@/lib/crosscheck";
import { DOC_TYPES, type DocData, type DocType, type SupportingDoc, docJsonSchema, docTypeByLabel, docTypesById } from "@/lib/documents";
import { type PageImage, type PageType, type Usage, jsonCall, models } from "@/lib/extract";
import type { FormData } from "@/lib/form";
import { BUCKET, T, db } from "@/lib/supabase";

const DOC_INSTRUCTIONS = `You read hospital records attached to a recuperative care referral (for patients experiencing homelessness who are ready for discharge).
Rules:
- Read only what the document says. Never infer or invent. Use null (or an empty list) for anything not stated.
- Dates as ISO yyyy-mm-dd; date-times as yyyy-mm-ddTHH:MM in the document's local time.
- Booleans: true or false only when the document states it (e.g. "independent with transfers", "A&Ox4", "hx of dementia"); otherwise null.
- For lists of medications or infections, include every row.
- Where the document has several entries over time (vitals, notes), use the most recent.`;

export interface DocInput {
  images?: PageImage[];
  file?: { dataUrl: string; filename: string };
}

export async function readDocument(type: DocType, input: DocInput, usage: Usage): Promise<DocData> {
  const { notes, ...data } = await jsonCall<DocData & { notes: string }>({
    step: `doc:${type.id}`,
    model: models.docs,
    instructions: DOC_INSTRUCTIONS,
    text: `This should be the patient's ${type.label}. Read it into the schema.`,
    images: (input.images ?? []).map((p) => ({ dataUrl: p.dataUrl, detail: "high" })),
    files: input.file ? [input.file] : [],
    schemaName: type.id,
    jsonSchema: docJsonSchema(type),
    usage,
  });
  return { ...data, notes: notes || null };
}

/**
 * Consecutive pages labeled with the same document type become one document; for types a packet holds
 * only one of (face sheet, authorization, H&P), every page of that type does, even when other pages split them.
 */
export function groupPages(pageTypes: PageType[]): { type: DocType; pages: number[] }[] {
  const groups: { type: DocType; pages: number[] }[] = [];
  for (const p of [...pageTypes].sort((a, b) => a.page - b.page)) {
    const type = docTypesById.get(p.type);
    if (!type) continue;
    const last = groups.at(-1);
    const same = type.onePerPacket
      ? groups.find((g) => g.type.id === type.id)
      : last && last.type.id === type.id && last.pages.at(-1) === p.page - 1
        ? last
        : undefined;
    if (same) same.pages.push(p.page);
    else groups.push({ type, pages: [p.page] });
  }
  return groups;
}

async function insertDoc(row: Partial<SupportingDoc> & { referral_id: string }): Promise<string> {
  const { data, error } = await db().from(T.supporting).insert({ ...row, status: "processing" }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Read supporting documents found among a faxed packet's pages. */
export async function readPacketDocuments(referralId: string, pages: PageImage[], pageTypes: PageType[]): Promise<void> {
  await db().from(T.supporting).delete().eq("referral_id", referralId).not("pages", "is", null);
  await Promise.all(
    groupPages(pageTypes).map(async (g) => {
      const id = await insertDoc({ referral_id: referralId, doc_type: g.type.id, label: g.type.label, pages: g.pages });
      const images = pages.filter((p) => g.pages.includes(p.pageNumber));
      await finishDocWith(id, (usage) => readDocument(g.type, { images }, usage));
    }),
  );
}

/** Read every uploaded attachment that hasn't been read yet. */
export async function readAttachments(referralId: string): Promise<void> {
  const supabase = db();
  const { data: attachments, error } = await supabase
    .from(T.documents)
    .select("id, label, file_name, mime_type, storage_path")
    .eq("referral_id", referralId)
    .eq("kind", "attachment");
  if (error) throw new Error(error.message);
  const { data: existing } = await supabase.from(T.supporting).select("document_id").eq("referral_id", referralId);
  const done = new Set((existing ?? []).map((r) => r.document_id));

  await Promise.all(
    (attachments ?? [])
      .filter((a) => !done.has(a.id))
      .map(async (a) => {
        // A label names the checklist item it was attached to; no label means "detect automatically".
        const chosen = a.label ? docTypeByLabel.get(a.label) : undefined;
        if (a.label && !chosen) return;
        const id = await insertDoc({
          referral_id: referralId,
          doc_type: chosen?.id ?? "unknown",
          label: chosen?.label ?? a.file_name,
          document_id: a.id,
        });
        await finishDocWith(id, async (usage) => {
          const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(a.storage_path);
          if (dlErr || !blob) throw new Error(`Could not download ${a.file_name}: ${dlErr?.message}`);
          const mime = a.mime_type || blob.type || "application/pdf";
          const dataUrl = `data:${mime};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;
          const input: DocInput = mime.startsWith("image/")
            ? { images: [{ pageNumber: 1, dataUrl }] }
            : { file: { dataUrl, filename: a.file_name || "document.pdf" } };
          const type = chosen ?? (await detectDocType(input, usage));
          if (!chosen) {
            await supabase
              .from(T.supporting)
              .update({ doc_type: type?.id ?? "other", label: type?.label ?? a.file_name })
              .eq("id", id);
          }
          if (!type) throw new Error("This doesn't look like one of the checklist documents.");
          return readDocument(type, input, usage);
        });
      }),
  );
}

/** Which checklist document an uploaded file is, for files added without choosing one. */
async function detectDocType(input: DocInput, usage: Usage): Promise<DocType | null> {
  const ids = DOC_TYPES.map((d) => d.id);
  const { doc_type } = await jsonCall<{ doc_type: string }>({
    step: "doc:detect",
    model: models.classify,
    instructions: `You sort hospital records attached to a recuperative care referral. Say which one of these documents the file is, or "other" if it is none of them:\n${DOC_TYPES.map((d) => `- ${d.id}: ${d.label}. ${d.recognize}`).join("\n")}`,
    text: "Which document is this?",
    images: (input.images ?? []).map((p) => ({ dataUrl: p.dataUrl, detail: "low" })),
    files: input.file ? [input.file] : undefined,
    schemaName: "document_type",
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["doc_type"],
      properties: { doc_type: { type: "string", enum: [...ids, "other"] } },
    },
    usage,
  });
  return docTypesById.get(doc_type) ?? null;
}

async function finishDocWith(id: string, run: (usage: Usage) => Promise<DocData>): Promise<void> {
  const usage: Usage = [];
  try {
    const data = await run(usage);
    await db().from(T.supporting).update({ status: "done", data, error: null, usage }).eq("id", id);
  } catch (e) {
    console.error(`supporting doc ${id} failed:`, e);
    await db()
      .from(T.supporting)
      .update({ status: "failed", error: e instanceof Error ? e.message : String(e), usage })
      .eq("id", id);
  }
}

export async function loadSupporting(referralId: string): Promise<SupportingDoc[]> {
  const { data, error } = await db()
    .from(T.supporting)
    .select("id, doc_type, label, document_id, pages, status, data, error")
    .eq("referral_id", referralId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportingDoc[];
}

/** Recompute document cross-check flags from the referral's current answers and documents. */
export async function refreshDocFlags(referralId: string, data?: FormData): Promise<void> {
  const supabase = db();
  const { data: ref, error } = await supabase.from(T.referrals).select("data, created_at").eq("id", referralId).single();
  if (error) throw new Error(error.message);
  const docs = await loadSupporting(referralId);
  const flags = crossCheck(data ?? (ref.data as FormData), docs, ref.created_at);
  await supabase.from(T.referrals).update({ doc_flags: flags }).eq("id", referralId);
}
