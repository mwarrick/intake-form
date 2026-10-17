import "server-only";
import { runPipeline, rereadThreshold, type PageImage } from "@/lib/extract";
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

    const result = await runPipeline(pages, saveProgress);
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

    // The form is ready for review now; supporting documents in the packet are read after it.
    await readPacketDocuments(referralId, pages, result.pipeline.pageTypes ?? []);
    await refreshDocFlags(referralId, data);
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
