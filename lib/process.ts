import "server-only";
import { RULE_GROUPS, type CriteriaCheck } from "@/lib/criteria";
import { checkCriteria, transcribePages } from "@/lib/criteria-check";
import { runPipeline, rereadThreshold, models, type PageImage, type PageType, type Usage } from "@/lib/extract";
import type { ReadProgress } from "@/lib/progress";
import { readPacketDocuments, refreshDocFlags } from "@/lib/extract-docs";
import { allFields, emptyData } from "@/lib/form";
import { summaryColumns } from "@/lib/referrals";
import { BUCKET, T, db } from "@/lib/supabase";
import { validate } from "@/lib/validate";

/**
 * Read a referral's page images with the model pipeline and store the results.
 * Faxed scans go to the coordinator queue; a referrer's portal upload becomes a draft that pre-fills their form.
 */
export async function processScan(referralId: string): Promise<void> {
  const supabase = db();
  const { data: ref } = await supabase.from(T.referrals).select("source, pipeline").eq("id", referralId).single();
  const prefill = ref?.source === "portal";
  // Each step is saved on the referral so the upload and review screens can show it; the final pipeline replaces it.
  const startedAt: string = ref?.pipeline?.progress?.startedAt ?? new Date().toISOString();
  const saveProgress = async (p: Omit<ReadProgress, "startedAt">) => {
    const progress: ReadProgress = { ...p, startedAt };
    await supabase.from(T.referrals).update({ pipeline: { progress } }).eq("id", referralId);
  };
  try {
    const { docs, pages } = await loadPages(referralId);

    const result = await runPipeline(pages, saveProgress);
    // Save pages that were turned upright, so the review screen shows them the right way up.
    await Promise.all(
      (result.pipeline.turned ?? []).map(async ({ page }) => {
        const doc = docs.find((d) => d.page_number === page);
        const img = result.pages.find((p) => p.pageNumber === page);
        if (!doc || !img) return;
        const [, mime, b64] = /^data:([^;]+);base64,(.*)$/s.exec(img.dataUrl) ?? [];
        const { error: saveErr } = await supabase.storage
          .from(BUCKET)
          .upload(doc.storage_path, Buffer.from(b64, "base64"), { contentType: mime, upsert: true });
        if (saveErr) console.warn(`could not save page ${page} upright:`, saveErr.message);
      }),
    );
    const data = { ...emptyData(allFields), ...result.data };
    const flags = validate(data, { extraction: result.extraction, confidenceThreshold: rereadThreshold });

    const { error: upErr } = await supabase
      .from(T.referrals)
      .update({
        status: prefill ? "draft" : "needs_review",
        data,
        extraction: result.extraction,
        pipeline: result.pipeline,
        flags,
        error: null,
        updated_at: new Date().toISOString(),
        ...summaryColumns(data),
      })
      .eq("id", referralId);
    if (upErr) throw new Error(upErr.message);

    // The form is ready for review now; supporting documents in the packet are read after it, while the
    // admission criteria are checked against the whole packet. A referrer's pre-fill upload is only their form.
    await Promise.all([
      readPacketDocuments(referralId, result.pages, result.pipeline.pageTypes ?? []).then(() => refreshDocFlags(referralId, data)),
      prefill ? null : checkReferralCriteria(referralId, result.pages, result.pipeline.pageTypes ?? []),
    ]);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`processScan ${referralId} failed:`, e);
    await supabase
      .from(T.referrals)
      // A failed pre-fill stays a draft: the referrer can still type the form in.
      .update({ status: prefill ? "draft" : "failed", error: message, updated_at: new Date().toISOString() })
      .eq("id", referralId);
  }
}

/** A referral's scanned pages, in order, as stored (pages the reader turned were saved upright). */
async function loadPages(referralId: string) {
  const supabase = db();
  const { data: docs, error } = await supabase
    .from(T.documents)
    .select("page_number, storage_path, mime_type")
    .eq("referral_id", referralId)
    .eq("kind", "page")
    .order("page_number");
  if (error) throw new Error(error.message);
  if (!docs?.length) throw new Error("No page images were uploaded");

  const pages: PageImage[] = await Promise.all(
    docs.map(async (d) => {
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(d.storage_path);
      if (dlErr || !blob) throw new Error(`Could not download page ${d.page_number}: ${dlErr?.message}`);
      const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      return { pageNumber: d.page_number as number, dataUrl: `data:${d.mime_type || "image/jpeg"};base64,${b64}` };
    }),
  );
  return { docs, pages };
}

/**
 * Check IHH's admission criteria (lib/criteria.ts) against every page of the packet and store one result per rule
 * on the referral. Without pages (Run again on the review screen) it reads the stored ones. Never throws: a failed
 * check is saved as failed, and the referral itself is unaffected.
 */
export async function checkReferralCriteria(referralId: string, pages?: PageImage[], pageTypes?: PageType[]): Promise<void> {
  const supabase = db();
  const groups = Object.keys(RULE_GROUPS);
  const base: CriteriaCheck = { status: "running", startedAt: new Date().toISOString(), groups, model: models.criteria };
  const save = (c: CriteriaCheck) => supabase.from(T.referrals).update({ criteria: c }).eq("id", referralId);
  await save(base);
  const usage: Usage = [];
  try {
    if (!pages || !pageTypes) {
      const { data: ref, error } = await supabase.from(T.referrals).select("pipeline").eq("id", referralId).single();
      if (error) throw new Error(error.message);
      pages = (await loadPages(referralId)).pages;
      pageTypes = (ref.pipeline?.pageTypes ?? []) as PageType[];
    }
    const text = await transcribePages(pages, pageTypes, usage);
    const results = await checkCriteria(text, usage, groups);
    await save({ ...base, status: "done", finishedAt: new Date().toISOString(), results, usage });
  } catch (e) {
    console.error(`criteria check ${referralId} failed:`, e);
    await save({ ...base, status: "failed", finishedAt: new Date().toISOString(), usage, error: e instanceof Error ? e.message : String(e) });
  }
}
