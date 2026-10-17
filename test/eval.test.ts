/**
 * Accuracy check: run the real OpenAI pipeline on samples/synthetic and score every field
 * against the answer key. Costs real API calls, so it only runs with EVAL=1:
 *
 *   npm run eval
 *   OPENAI_MODEL_EXTRACT=gpt-5.5 OPENAI_MODEL_REREAD= npm run eval   # try another model, no re-read
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { models, runPipeline, type PageImage } from "@/lib/extract";
import { fieldsById, referrerFields } from "@/lib/form";

const DIR = fileURLToPath(new URL("../samples/synthetic/", import.meta.url));
const run = process.env.EVAL === "1";

// Same size the browser renders before upload.
function pageImages(pdf: string): PageImage[] {
  const out = mkdtempSync(join(tmpdir(), "illintake-eval-"));
  execFileSync("pdftoppm", ["-jpeg", "-jpegopt", "quality=85", "-scale-to-x", "1700", "-scale-to-y", "-1", pdf, join(out, "p")]);
  return readdirSync(out)
    .filter((f) => f.endsWith(".jpg"))
    .sort()
    .map((f, i) => ({
      pageNumber: i + 1,
      dataUrl: `data:image/jpeg;base64,${readFileSync(join(out, f)).toString("base64")}`,
    }));
}

function norm(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (Array.isArray(v)) return [...v].map(String).sort().join("|");
  return String(v).trim().toLowerCase().replace(/\s+/g, " ");
}

describe.skipIf(!run)("extraction accuracy", () => {
  const samples = readdirSync(DIR).filter((f) => f.endsWith(".pdf")).sort();
  const summary: Record<string, unknown>[] = [];

  for (const pdf of samples) {
    it(pdf, { timeout: 300_000 }, async () => {
      const key = JSON.parse(readFileSync(join(DIR, pdf.replace(/\.pdf$/, ".json")), "utf8"));
      const result = await runPipeline(pageImages(join(DIR, pdf)));

      const wrong = referrerFields
        .filter((f) => norm(result.data[f.id]) !== norm(key.expected[f.id]))
        .map((f) => ({
          field: f.id,
          expected: key.expected[f.id],
          got: result.data[f.id],
          confidence: result.extraction[f.id]?.confidence,
        }));
      // A wrong value the model was confident about is the dangerous kind: review won't highlight it.
      const confidentlyWrong = wrong.filter((w) => (w.confidence ?? 0) >= Number(process.env.EXTRACT_REREAD_THRESHOLD || 0.75));
      const tokens = result.pipeline.usage.reduce((s, u) => s + u.input_tokens + u.output_tokens, 0);
      const seconds = result.pipeline.usage.reduce((s, u) => s + u.ms, 0) / 1000;

      summary.push({
        sample: pdf,
        accuracy: `${referrerFields.length - wrong.length}/${referrerFields.length}`,
        confidentlyWrong: confidentlyWrong.length,
        formPagesFound: result.pipeline.formPages.join(","),
        formPagesExpected: key.form_pages.join(","),
        reread: result.pipeline.rereadFields.length,
        tokens,
        seconds: Math.round(seconds),
      });
      console.log(`\n${pdf}: ${referrerFields.length - wrong.length}/${referrerFields.length} fields correct`);
      for (const w of wrong) {
        console.log(
          `  ${fieldsById.get(w.field)?.label}: expected ${JSON.stringify(w.expected)}, got ${JSON.stringify(w.got)} (${Math.round((w.confidence ?? 0) * 100)}%)`,
        );
      }
      expect(result.pipeline.formPages).toEqual(key.form_pages);
    });
  }

  it("writes the summary", () => {
    console.log(`\nModels: ${JSON.stringify(models)}`);
    console.table(summary);
    writeFileSync(join(DIR, "..", `eval-${Date.now()}.json`), JSON.stringify({ models, summary }, null, 2));
  });
});
