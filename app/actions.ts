"use server";

import { revalidatePath } from "next/cache";
import { rereadThreshold } from "@/lib/extract";
import { allFields, emptyData, normalize, referrerFields, schema, staffFields } from "@/lib/form";
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

/** Create a scanned referral and hand back upload targets for the original file and each rendered page. */
export async function startScan(original: FileMeta, pageCount: number) {
  return reported(() => createScan(original, pageCount));
}

async function createScan(original: FileMeta, pageCount: number): Promise<StartScanResult> {
  if (pageCount < 1 || pageCount > 40) throw new Error("Upload between 1 and 40 pages");
  const supabase = db();

  const { data: referral, error } = await supabase
    .from(T.referrals)
    .insert({ source: "scan", status: "processing", data: emptyData(allFields) })
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

export interface AttachmentMeta extends FileMeta {
  label: string;
}

/** Save an online referral and hand back upload targets for its supporting documents. */
export async function submitPortalReferral(raw: Record<string, unknown>, attachments: AttachmentMeta[]) {
  return reported(() => createPortalReferral(raw, attachments));
}

async function createPortalReferral(
  raw: Record<string, unknown>,
  attachments: AttachmentMeta[],
): Promise<{ id: string; uploads: UploadTarget[] } | { errors: string[] }> {
  const data = { ...emptyData(allFields), ...normalize(raw, referrerFields) };
  const flags = validate(data);
  const missing = flags.filter((f) => f.kind === "missing" || f.kind === "invalid");
  if (missing.length) return { errors: missing.map((f) => f.message) };

  const supabase = db();
  const { data: referral, error } = await supabase
    .from(T.referrals)
    .insert({ source: "portal", status: "needs_review", data, flags, ...summaryColumns(data) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const id = referral.id as string;

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
  const { data: current, error: curErr } = await supabase.from(T.referrals).select("data, status").eq("id", id).single();
  if (curErr) throw new Error(curErr.message);

  const data = { ...current.data, ...normalize(raw, referrerFields) };
  // Once a person has checked the fields, the model's uncertainty no longer applies.
  const extraction = confirm ? undefined : await loadExtraction(id);
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
