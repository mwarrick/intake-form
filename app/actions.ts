"use server";

import { revalidatePath } from "next/cache";
import { assessmentGaps, normalizeAssessment } from "@/lib/assessment";
import { rereadThreshold } from "@/lib/extract";
import { type FormData, allFields, emptyData, normalize, referrerFields, schema, staffFields } from "@/lib/form";
import { fullName, staffOrThrow } from "@/lib/auth";
import { removeFolder } from "@/lib/cleanup";
import { refreshDocFlags } from "@/lib/extract-docs";
import { pacificDayStart } from "@/lib/metrics";
import { summaryColumns } from "@/lib/referrals";
import { BUCKET, T, createUploadTargets, db, safeName, type UploadTarget } from "@/lib/supabase";
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
  return reported(async () => {
    // Both the coordinator's faxes and the online form's pre-fill scans are for signed-in staff only.
    await staffOrThrow();
    return createScan(original, pageCount, purpose);
  });
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
    await staffOrThrow();
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
  return reported(async () => {
    await staffOrThrow();
    return createPortalReferral(raw, attachments, draftId);
  });
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
  // Drafts are cleaned up after a day; a referrer who submits later still gets their referral in, without the scan.
  const draft = draftId ? await loadDraft(draftId).catch(() => null) : null;
  if (draftId && draft) {
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

  // Shows missing checklist items right away; attachments are read once uploaded (see /documents route).
  await refreshDocFlags(id, data);
  revalidatePath("/referrals");
  return { id, uploads: await createUploadTargets(paths) };
}

/**
 * Staff add supporting documents to an existing referral, e.g. ones that arrived after the fax.
 * A file without a checklist label is identified by the reader. Returns upload targets; the browser
 * uploads, then calls the /documents route to read them.
 */
export async function addDocuments(referralId: string, attachments: AttachmentMeta[]) {
  return reported(async () => {
    await staffOrThrow();
    if (!attachments.length || attachments.length > 20) throw new Error("Add between 1 and 20 files");
    const batch = Date.now();
    const paths = attachments.map((a, i) => `${referralId}/attachments/${batch}-${i + 1}-${safeName(a.fileName)}`);
    const { error } = await db().from(T.documents).insert(
      attachments.map((a, i) => ({
        referral_id: referralId,
        kind: "attachment",
        label: schema.attachments.items.includes(a.label) ? a.label : null,
        file_name: a.fileName,
        mime_type: a.mimeType,
        storage_path: paths[i],
      })),
    );
    if (error) throw new Error(error.message);
    return { uploads: await createUploadTargets(paths) };
  });
}

/**
 * Delete a referral and every file uploaded for it, e.g. the wrong file or an unreadable scan, so it can be uploaded again.
 * Approved, denied or withdrawn referrals are records of an outcome; only an admin can delete those.
 */
export async function deleteReferral(id: string) {
  return reported(async () => {
    const user = await staffOrThrow();
    const supabase = db();
    const { data: current, error: curErr } = await supabase.from(T.referrals).select("status").eq("id", id).maybeSingle();
    if (curErr) throw new Error(curErr.message);
    if (!current) return { ok: true as const };
    if (RECORDED.includes(current.status) && user.role !== "admin") {
      throw new Error("This referral has a decision or withdrawal recorded; only an admin can delete it.");
    }
    // Rows first (documents and supporting documents go with it, on delete cascade), then the files.
    const { error } = await supabase.from(T.referrals).delete().eq("id", id);
    if (error) throw new Error(error.message);
    await removeFolder(id);
    revalidatePath("/referrals");
    return { ok: true as const };
  });
}

/**
 * Remove one supporting document, e.g. a wrong file that was added. A separately uploaded file is deleted
 * along with it; pages of a faxed packet stay part of the scan.
 */
export async function removeSupportingDoc(referralId: string, supportingId: string) {
  return reported(async () => {
    await staffOrThrow();
    const supabase = db();
    const { data: doc, error } = await supabase
      .from(T.supporting)
      .select("id, document_id")
      .eq("id", supportingId)
      .eq("referral_id", referralId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (doc?.document_id) {
      const { data: file } = await supabase.from(T.documents).select("storage_path").eq("id", doc.document_id).maybeSingle();
      // Deleting the uploaded file's row removes what was read from it too (on delete cascade).
      const { error: delErr } = await supabase.from(T.documents).delete().eq("id", doc.document_id);
      if (delErr) throw new Error(delErr.message);
      if (file?.storage_path) await supabase.storage.from(BUCKET).remove([file.storage_path]);
    } else if (doc) {
      const { error: delErr } = await supabase.from(T.supporting).delete().eq("id", doc.id);
      if (delErr) throw new Error(delErr.message);
    }
    await refreshDocFlags(referralId);
    revalidatePath(`/referrals/${referralId}`);
    return { ok: true as const };
  });
}

async function loadExtraction(id: string): Promise<Extraction> {
  const { data, error } = await db().from(T.referrals).select("extraction").eq("id", id).single();
  if (error) throw new Error(error.message);
  return (data.extraction ?? {}) as Extraction;
}

/** Coordinator saves corrections to the referral fields. Confirming clears low-confidence flags. */
export async function saveReview(id: string, raw: Record<string, unknown>, confirm: boolean) {
  return reported(async () => {
    await staffOrThrow();
    return updateReview(id, raw, confirm);
  });
}

async function updateReview(id: string, raw: Record<string, unknown>, confirm: boolean) {
  const supabase = db();
  const { data: current, error: curErr } = await supabase.from(T.referrals).select("data, status, source, reviewed_at").eq("id", id).single();
  if (curErr) throw new Error(curErr.message);

  const data = { ...current.data, ...normalize(raw, referrerFields) };
  // Saving after the fields were confirmed keeps them confirmed.
  const checked = confirm || !!current.reviewed_at;
  // Once a person has checked the fields (coordinator confirming, or the referrer on the portal), the model's uncertainty no longer applies.
  const extraction = checked || current.source === "portal" ? undefined : await loadExtraction(id);
  const flags = validate(data, { extraction, confidenceThreshold: rereadThreshold });

  const decided = RECORDED.includes(current.status);
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
  await refreshDocFlags(id, data);
  revalidatePath(`/referrals/${id}`);
  revalidatePath("/referrals");
  return { ok: true as const };
}

/** Statuses that record an outcome: confirming fields leaves them alone, and only an admin can delete them. */
const RECORDED = ["approved", "denied", "withdrawn"];

/** The withdrawal date and time the coordinator entered (Pacific), as an instant. */
function withdrawalTime(data: FormData): string | null {
  const day = data.withdrawal_date;
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [h, m] = typeof data.withdrawal_time === "string" ? data.withdrawal_time.split(":").map(Number) : [0, 0];
  return new Date(Date.parse(pacificDayStart(day)) + ((h || 0) * 60 + (m || 0)) * 60_000).toISOString();
}

function outcome(approved: unknown): "approved" | "denied" | null {
  return approved === "Yes" ? "approved" : approved === "No" ? "denied" : null;
}

/** Staff-only box: record the approval decision, or that the referral was withdrawn. */
export async function saveDecision(id: string, raw: Record<string, unknown>) {
  return reported(async () => updateDecision(id, raw, fullName(await staffOrThrow())));
}

async function updateDecision(id: string, raw: Record<string, unknown>, reviewer: string) {
  const supabase = db();
  const { data: current, error: curErr } = await supabase
    .from(T.referrals)
    .select("data, status, decided_at, withdrawn_at, reviewed_at")
    .eq("id", id)
    .single();
  if (curErr) throw new Error(curErr.message);

  const staff = normalize(raw, staffFields);
  // Default "Reviewed by" to whoever is signed in.
  if (!staff.reviewed_by) staff.reviewed_by = reviewer;
  const data = { ...current.data, ...staff };
  const staffFlags = validate(data, { fields: staffFields }).filter((f) => f.kind === "missing" || f.kind === "invalid");
  if (staffFlags.length) return { errors: staffFlags.map((f) => f.message) };

  const decision = outcome(data.approved);
  // Withdrawn wins over the decision: an approved patient who left AMA never arrives. Un-withdrawing restores it.
  const withdrawn = data.withdrawn === "Yes";
  const undecided = current.reviewed_at ? "reviewed" : "needs_review";
  const status = withdrawn ? "withdrawn" : (decision ?? (current.status === "withdrawn" ? undecided : current.status));
  // Time the decision when it's first made or changed, so the dashboard can measure the two-hour promise.
  const now = new Date().toISOString();
  const decided_at = decision ? (decision === outcome(current.data.approved) && current.decided_at ? current.decided_at : now) : null;
  const withdrawn_at = withdrawn ? (withdrawalTime(data) ?? current.withdrawn_at ?? now) : null;
  const { error } = await supabase
    .from(T.referrals)
    .update({ data, status, decided_at, withdrawn_at, updated_at: now })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/referrals/${id}`);
  revalidatePath("/referrals");
  return { ok: true as const };
}

/** Save the Care Coordinator's Housing & Services Assessment; completing it needs every required answer. */
export async function saveAssessment(referralId: string, raw: Record<string, unknown>, complete: boolean) {
  return reported(async () => {
    const me = await staffOrThrow();
    const data = normalizeAssessment(raw);
    if (!data.assessed_by) data.assessed_by = fullName(me);
    if (complete) {
      const gaps = assessmentGaps(data);
      if (gaps.length) return { errors: gaps.map((g) => `Required: ${g}`) };
    }
    const now = new Date().toISOString();
    const { error } = await db()
      .from(T.assessments)
      .upsert(
        { referral_id: referralId, data, status: complete ? "complete" : "draft", updated_at: now, completed_at: complete ? now : null },
        { onConflict: "referral_id" },
      );
    if (error) throw new Error(error.message);
    revalidatePath(`/referrals/${referralId}/assessment`);
    revalidatePath(`/referrals/${referralId}/handoff`);
    revalidatePath("/admissions");
    return { ok: true as const };
  });
}
