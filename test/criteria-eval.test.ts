/**
 * Admission criteria check on the real de-identified packets (R01 to R11), scored against IHH's decisions.
 * Costs real API calls, so it only runs with EVAL_CRITERIA=1:
 *
 *   npm run eval:criteria                       # every packet
 *   PACKETS=R05,R10 npm run eval:criteria       # some of them
 *
 * The packets stay outside git (samples/packets-real/, or PACKETS_DIR). Page text is cached next to them in
 * cache/, so changing the rules or the prompt only re-runs the check. Results go to runs/<time>/ there too:
 * they quote the charts, so they must not be committed. IHH's decisions are read only after the check, to score it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { RULE_GROUPS, type RuleResult, rulesById, summarize } from "@/lib/criteria";
import { type PageText, checkCriteria, transcribePages } from "@/lib/criteria-check";
import { type PageImage, type Usage, models, sortPages } from "@/lib/extract";

const run = process.env.EVAL_CRITERIA === "1";
const DIR = process.env.PACKETS_DIR || fileURLToPath(new URL("../samples/packets-real/", import.meta.url));
const DECISIONS = fileURLToPath(new URL("../docs/1-referral-intake/eval/decisions.json", import.meta.url));
const only = process.env.PACKETS?.split(",").map((s) => s.trim());

// Same size the browser renders before upload.
function pageImages(pdf: string): PageImage[] {
  const out = mkdtempSync(join(tmpdir(), "illintake-criteria-"));
  execFileSync("pdftoppm", ["-jpeg", "-jpegopt", "quality=85", "-scale-to-x", "1700", "-scale-to-y", "-1", pdf, join(out, "p")]);
  return readdirSync(out)
    .filter((f) => f.endsWith(".jpg"))
    .sort()
    .map((f, i) => ({ pageNumber: i + 1, dataUrl: `data:image/jpeg;base64,${readFileSync(join(out, f)).toString("base64")}` }));
}

/** Pages labelled, turned and transcribed once per packet. */
async function packetText(id: string, usage: Usage): Promise<{ pages: PageText[]; turned: { page: number; degrees: number }[] }> {
  const cache = join(DIR, "cache", `${id}.json`);
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8"));
  const sorted = await sortPages(pageImages(join(DIR, `${id}.pdf`)), usage);
  const pages = await transcribePages(sorted.pages, sorted.pageTypes, usage);
  mkdirSync(join(DIR, "cache"), { recursive: true });
  const out = { pages, turned: sorted.turned, models: { classify: sorted.classifyModel, transcribe: models.transcribe } };
  writeFileSync(cache, JSON.stringify(out, null, 1));
  return out;
}

const line = (r: RuleResult) =>
  `  ${r.rule_id} ${r.outcome.toUpperCase()}${r.pages.length ? ` (p. ${r.pages.join(", ")})` : ""}: ${r.note}${r.evidence ? ` "${r.evidence}"` : ""}`;

describe.skipIf(!run)("admission criteria on the real packets", () => {
  const packets = existsSync(DIR)
    ? readdirSync(DIR)
        .filter((f) => /^R\d+\.pdf$/.test(f))
        .map((f) => f.replace(".pdf", ""))
        .filter((id) => !only || only.includes(id))
        .sort()
    : [];
  const outDir = join(DIR, "runs", new Date().toISOString().replace(/[:.]/g, "-"));
  const rows: { id: string; concerns: RuleResult[]; request: RuleResult[]; unknown: RuleResult[]; tokens: number; seconds: number }[] = [];

  for (const id of packets) {
    it(id, { timeout: 900_000 }, async () => {
      const usage: Usage = [];
      const { pages, turned } = await packetText(id, usage);
      const results = await checkCriteria(pages, usage);
      const s = summarize(results);
      const tokens = usage.reduce((n, u) => n + u.input_tokens + u.output_tokens, 0);
      const seconds = Math.round(usage.reduce((n, u) => n + u.ms, 0) / 1000);
      rows.push({ id, concerns: s.concerns, request: s.request, unknown: s.unknown, tokens, seconds });
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, `${id}.json`), JSON.stringify({ id, groups: Object.keys(RULE_GROUPS), turned, results, usage }, null, 1));
      console.log(`\n${id}: ${pages.length} pages, ${s.concerns.length} concerns, ${s.request.length} to request, ${s.unknown.length} unknown\n${s.concerns.map(line).join("\n")}`);
    });
  }

  it("scores against IHH's decisions", () => {
    if (!rows.length) return;
    const decisions = existsSync(DECISIONS)
      ? new Map<string, string>(JSON.parse(readFileSync(DECISIONS, "utf8")).packets.map((p: { packet_id: string; decision: string }) => [p.packet_id, p.decision]))
      : new Map<string, string>();
    const md = [
      `# Admission criteria check (${Object.values(RULE_GROUPS).map((g) => g.label).join("; ")})`,
      "",
      `Model: ${models.criteria}. A packet "flags" when it has at least one concern on an exclude or must rule.`,
      "",
      "| Packet | IHH decided | Flags | Concerns | To request | Unknown | Tokens | Seconds |",
      "|---|---|---|---|---|---|---|---|",
      ...rows
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((r) => {
          const hard = r.concerns.filter((c) => ["exclude", "must"].includes(rulesById.get(c.rule_id)?.kind ?? ""));
          return `| ${r.id} | ${decisions.get(r.id) ?? "?"} | ${hard.length ? "yes" : "no"} | ${r.concerns.map((c) => c.rule_id).join(", ") || "none"} | ${r.request.map((c) => c.rule_id).join(", ") || "none"} | ${r.unknown.length} | ${r.tokens.toLocaleString()} | ${r.seconds} |`;
        }),
      "",
      ...rows.flatMap((r) => [`## ${r.id} (IHH: ${decisions.get(r.id) ?? "?"})`, "", ...r.concerns.map(line), "", "To request:", ...r.request.map(line), "", "Unknown:", ...r.unknown.map(line), ""]),
    ].join("\n");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "summary.md"), md);
    console.log(`\n${md}\n\nSaved to ${outDir}`);
  });
});
