"use server";

import { revalidatePath } from "next/cache";
import { rereadThreshold } from "@/lib/extract";
import { type FormData, allFields, emptyData, normalize, referrerFields, schema, staffFields } from "@/lib/form";
import { summaryColumns } from "@/lib/referrals";
import { T, createUploadTargets, db, safeName, type UploadTarget } from "@/lib/supabase";
import { type Extraction, validate } from "@/lib/validate";

export interface FileMeta {
  fileName: string;
  mimeType: string;
}

export interface StartScanResult {
  id: string;
  original: UploadTarget;
  pages: UploadTarget[];
}

/** Next.js hides thrown server-action errors in production, so actions return them instead. */
async function reported<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Create a referral from an uploaded scan and hand back upload targets for the original file and each page.
 * "scan" is a fax for the coordinator queue; "prefill" is a referrer's paper form that pre-fills the online form.
 */
export async function startScan(original: FileMeta, pageCount: number, purpose: "scan" | "prefill" = "scan") {
  return reported(() => createScan(original, pageCount, purpose));
}

async function createScan(original: FileMeta, pageCount: number, purpose: "scan" | "prefill"): Promise<StartScanResult> {
  if (pageCount < 1 || pageCount > 40) throw new Error("Upload between 1 and 40 pages");
  const supabase = db();

  const { data: referral, error } = await supabase
    .from(T.referrals)
    .insert({ source: purpose === "prefill" ? "portal" : "scan", status: "processing", data: emptyData(allFields) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const id = referral.id as string;

  const originalPath = `${id}/original-${safeName(original.fileName)}`;
  const pagePaths = Array.from({ length: pageCount }, (_, i) => `${id}/page-${String(i + 1).padStart(2, "0")}.jpg`);

  const { error: docErr } = await supabase.from(T.documents).insert([
    { referral_id: id, kind: "original", file_name: original.fileName, mime_type: original.mimeType, storage_path: originalPath },
    ...pagePaths.map((path, i) => ({
      referral_id: id,
      kind: "page",
      page_number: i + 1,
      mime_type: "image/jpeg",
      storage_path: path,
    })),
  ]);
  if (docErr) throw new Error(docErr.message);

  const [originalTarget, ...pageTargets] = await createUploadTargets([originalPath, ...pagePaths]);
  return { id, original: originalTarget, pages: pageTargets };
}

export interface PrefillResult {
  status: "processing" | "draft";
  data?: FormData;
  extraction?: Extraction;
  error?: string | null;
}

async function loadDraft(id: string) {
  const { data, error } = await db()
    .from(T.referrals)
    .select("source, status, data, extraction, pipeline, error")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.source !== "portal" || !["processing", "draft"].includes(data.status)) {
    throw new Error("This scan is no longer available. Upload it again or fill in the form.");
  }
  return data;
}

/** The referrer's form polls this while their uploaded paper form is read. */
export async function getPrefill(id: string) {
  return reported(async (): Promise<PrefillResult> => {
    const d = await loadDraft(id);
    if (d.status === "processing") return { status: "processing" };
    return {
      status: "draft",
      data: normalize(d.data ?? {}, referrerFields),
      extraction: d.extraction as Extraction,
      error: d.error,
    };
  });
}

export interface AttachmentMeta extends FileMeta {
  label: string;
}

/**
 * Save an online referral and hand back upload targets for its supporting documents.
 * With draftId, the referral pre-filled from the referrer's uploaded paper form is submitted.
 */
export async function submitPortalReferral(raw: Record<string, unknown>, attachments: AttachmentMeta[], draftId?: string) {
  return reported(() => createPortalReferral(raw, attachments, draftId));
}

async function createPortalReferral(
  raw: Record<string, unknown>,
  attachments: AttachmentMeta[],
  draftId?: string,
): Promise<{ id: string; uploads: UploadTarget[] } | { errors: string[] }> {
  const data = { ...emptyData(allFields), ...normalize(raw, referrerFields) };
  // The referrer has checked every field against their own paper form, so read confidence no longer applies.
  const flags = validate(data);
  const missing = flags.filter((f) => f.kind === "missing" || f.kind === "invalid");
  if (missing.length) return { errors: missing.map((f) => f.message) };

  const supabase = db();
  let id: string;
  if (draftId) {
    const draft = await loadDraft(draftId);
    if (draft.status !== "draft") throw new Error("Your scan is still being read. Try again in a moment.");
    // Let the coordinator see which fields the referrer corrected after the scan was read.
    const read = normalize(draft.data ?? {}, referrerFields);
    const referrerEdits = referrerFields.filter((f) => JSON.stringify(read[f.id]) !== JSON.stringify(data[f.id])).map((f) => f.id);
    const { error } = await supabase
      .from(T.referrals)
      .update({
        status: "needs_review",
        data,
        flags,
        pipeline: { ...(draft.pipeline ?? {}), referrerEdits },
        error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...summaryColumns(data),
      })
      .eq("id", draftId);
    if (error) throw new Error(error.message);
    id = draftId;
  } else {
    const { data: referral, error } = await supabase
      .from(T.referrals)
      .insert({ source: "portal", status: "needs_review", data, flags, ...summaryColumns(data) })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = referral.id as string;
  }

  const paths = attachments.map((a, i) => `${id}/attachments/${i + 1}-${safeName(a.fileName)}`);
  if (attachments.length) {
    const { error: docErr } = await supabase.from(T.documents).insert(
      attachments.map((a, i) => ({
        referral_id: id,
        kind: "attachment",
        label: schema.attachments.items.includes(a.label) ? a.label : "Other",
        file_name: a.fileName,
        mime_type: a.mimeType,
        storage_path: paths[i],
      })),
    );
    if (docErr) throw new Error(docErr.message);
  }

  revalidatePath("/referrals");
  return { id, uploads: await createUploadTargets(paths) };
}

async function loadExtraction(id: string): Promise<Extraction> {
  const { data, error } = await db().from(T.referrals).select("extraction").eq("id", id).single();
  if (error) throw new Error(error.message);
  return (data.extraction ?? {}) as Extraction;
}

/** Coordinator saves corrections to the referral fields. Confirming clears low-confidence flags. */
export async function saveReview(id: string, raw: Record<string, unknown>, confirm: boolean) {
  return reported(() => updateReview(id, raw, confirm));
}

async function updateReview(id: string, raw: Record<string, unknown>, confirm: boolean) {
  const supabase = db();
  const { data: current, error: curErr } = await supabase.from(T.referrals).select("data, status, source").eq("id", id).single();
  if (curErr) throw new Error(curErr.message);

  const data = { ...current.data, ...normalize(raw, referrerFields) };
  // Once a person has checked the fields (coordinator confirming, or the referrer on the portal), the model's uncertainty no longer applies.
  const extraction = confirm || current.source === "portal" ? undefined : await loadExtraction(id);
  const flags = validate(data, { extraction, confidenceThreshold: rereadThreshold });

  const decided = current.status === "approved" || current.status === "denied";
  const { error } = await supabase
    .from(T.referrals)
    .update({
      data,
      flags,
      updated_at: new Date().toISOString(),
      ...summaryColumns(data),
      ...(confirm && !decided ? { status: "reviewed", reviewed_at: new Date().toISOString() } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/referrals/${id}`);
  revalidatePath("/referrals");
  return { ok: true as const };
}

/** Staff-only box: record the approval decision. */
export async function saveDecision(id: string, raw: Record<string, unknown>) {
  return reported(() => updateDecision(id, raw));
}

async function updateDecision(id: string, raw: Record<string, unknown>) {
  const supabase = db();
  const { data: current, error: curErr } = await supabase.from(T.referrals).select("data, status").eq("id", id).single();
  if (curErr) throw new Error(curErr.message);

  const staff = normalize(raw, staffFields);
  const data = { ...current.data, ...staff };
  const staffFlags = validate(data, { fields: staffFields }).filter((f) => f.kind === "missing" || f.kind === "invalid");
  if (staffFlags.length) return { errors: staffFlags.map((f) => f.message) };

  const status = staff.approved === "Yes" ? "approved" : staff.approved === "No" ? "denied" : current.status;
  const { error } = await supabase
    .from(T.referrals)
    .update({ data, status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/referrals/${id}`);
  revalidatePath("/referrals");
  return { ok: true as const };
}
