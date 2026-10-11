import "server-only";
import { runPipeline, rereadThreshold, type PageImage } from "@/lib/extract";
import { allFields, emptyData } from "@/lib/form";
import { summaryColumns } from "@/lib/referrals";
import { BUCKET, T, db } from "@/lib/supabase";
import { validate } from "@/lib/validate";

/** Read a scanned referral's page images with the model pipeline and store the results for review. */
export async function processScan(referralId: string): Promise<void> {
  const supabase = db();
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

    const result = await runPipeline(pages);
    const data = { ...emptyData(allFields), ...result.data };
    const flags = validate(data, { extraction: result.extraction, confidenceThreshold: rereadThreshold });

    const { error: upErr } = await supabase
      .from(T.referrals)
      .update({
        status: "needs_review",
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
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`processScan ${referralId} failed:`, e);
    await supabase
      .from(T.referrals)
      .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
      .eq("id", referralId);
  }
}
