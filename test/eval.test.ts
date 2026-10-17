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
import { fieldsById, paperFields } from "@/lib/form";

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

      const wrong = paperFields
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
        accuracy: `${paperFields.length - wrong.length}/${paperFields.length}`,
        confidentlyWrong: confidentlyWrong.length,
        formPagesFound: result.pipeline.formPages.join(","),
        formPagesExpected: key.form_pages.join(","),
        reread: result.pipeline.rereadFields.length,
        tokens,
        seconds: Math.round(seconds),
      });
      console.log(`\n${pdf}: ${paperFields.length - wrong.length}/${paperFields.length} fields correct`);
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

describe.skipIf(!run)("supporting document accuracy", async () => {
  const { readDocument } = await import("@/lib/extract-docs");
  const { crossCheck } = await import("@/lib/crosscheck");
  const { docTypesById } = await import("@/lib/documents");
  const { emptyData } = await import("@/lib/form");
  const docsDir = join(DIR, "documents");
  const same = (a: unknown, b: unknown) =>
    typeof b === "number" && Array.isArray(a) ? a.length === b : typeof b === "string" && typeof a === "string" ? norm(a).includes(norm(b)) || norm(b).includes(norm(a)) : JSON.stringify(a) === JSON.stringify(b);

  for (const sample of readdirSync(docsDir).sort()) {
    it(sample, { timeout: 300_000 }, async () => {
      const key = JSON.parse(readFileSync(join(docsDir, sample, "answer-key.json"), "utf8"));
      const form = { ...emptyData(), ...JSON.parse(readFileSync(join(DIR, `${sample}.json`), "utf8")).expected };
      const usage: Parameters<typeof readDocument>[2] = [];
      type KeyDoc = { doc_type: string; file: string; handwritten: boolean; expected: Record<string, unknown> };
      const read = await Promise.all(
        (key.documents as KeyDoc[]).map(async (d) => {
          const pdf = readFileSync(join(docsDir, sample, d.file)).toString("base64");
          const data = await readDocument(docTypesById.get(d.doc_type)!, { file: { dataUrl: `data:application/pdf;base64,${pdf}`, filename: d.file } }, usage);
          const wrong = Object.entries(d.expected)
            .filter(([k, v]) => {
              // "dose:<medication>" checks a handwritten correction on the medication list.
              if (k.startsWith("dose:")) {
                const row = (Array.isArray(data.medications) ? data.medications : []).find((m: any) => norm(m?.name).includes(norm(k.slice(5))));
                return !same((row as any)?.dose, v);
              }
              return !same(data[k], v);
            })
            .map(([k, v]) => `${d.file}${d.handwritten ? " (handwritten)" : ""} ${k}: expected ${JSON.stringify(v)}, got ${JSON.stringify(k.startsWith("dose:") ? data.medications : data[k])}`);
          return { doc: { id: d.file, doc_type: d.doc_type, label: null, document_id: "x", pages: null, status: "done" as const, data, error: null }, wrong };
        }),
      );
      const flags = crossCheck(form, read.map((r) => r.doc), key.received_at);
      const missedFlags = (key.expected_flags as [string, string][]).filter(
        ([kind, match]) => !flags.some((f) => f.kind === kind && (f.field === match || f.message.toLowerCase().includes(match.toLowerCase()))),
      );
      const wrong = read.flatMap((r) => r.wrong);
      console.log(`\n${sample} documents: ${wrong.length} wrong values, ${missedFlags.length} missed flags, ${usage.reduce((s, u) => s + u.input_tokens + u.output_tokens, 0)} tokens`);
      for (const w of wrong) console.log(`  ${w}`);
      for (const m of missedFlags) console.log(`  missed flag ${m.join(": ")}`);
      for (const f of flags) console.log(`  · ${f.kind}: ${f.message}`);
      expect(missedFlags).toEqual([]);
    });
  }
});
