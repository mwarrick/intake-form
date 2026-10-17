import "server-only";
import OpenAI from "openai";
import { type Field, type FormData, normalize, paperFields, schema } from "@/lib/form";
import { DOC_TYPES } from "@/lib/documents";
import type { ReadProgress } from "@/lib/progress";
import { ORIENTATIONS, ORIENTATION_HINT, type Orientation, turnFor, turnImage } from "@/lib/upright";
import type { Extraction, FieldLocation } from "@/lib/validate";

export interface PageImage {
  pageNumber: number;
  /** data: URL (image/jpeg or image/png) */
  dataUrl: string;
}

export interface PipelineResult {
  /** The pages, turned upright where the classifier found them sideways or upside down. */
  pages: PageImage[];
  data: FormData;
  extraction: Extraction;
  pipeline: {
    formPages: number[];
    /** What each faxed page is; supporting documents are read from these. */
    pageTypes?: PageType[];
    classifyNotes?: string;
    /** Multi-page packet with no page labelled as the referral form: the form fields were not read. */
    noForm?: boolean;
    /** Pages turned upright, with the degrees they were turned clockwise. */
    turned?: { page: number; degrees: number }[];
    extractNotes?: string;
    rereadFields: string[];
    /** Portal referrals pre-filled from a scan: fields the referrer changed before submitting. */
    referrerEdits?: string[];
    models: { classify: string | null; extract: string; reread: string | null };
    usage: { step: string; model: string; input_tokens: number; output_tokens: number; ms: number }[];
    /** Only while the scan is being read (lib/process.ts); replaced by the rest when it's done. */
    progress?: ReadProgress;
  };
}

export const models = {
  classify: process.env.OPENAI_MODEL_CLASSIFY || "gpt-5.4-nano",
  // Supporting documents (H&P, med list, culture…) are mostly typed text.
  docs: process.env.OPENAI_MODEL_DOCS || "gpt-5.4-mini",
  extract: process.env.OPENAI_MODEL_EXTRACT || "gpt-5.4-mini",
  // Transcribing every page of a packet to text for the admission criteria check.
  transcribe: process.env.OPENAI_MODEL_TRANSCRIBE || "gpt-5.4-mini",
  // Judging the admission criteria against the whole packet: needs the strongest reasoning.
  criteria: process.env.OPENAI_MODEL_CRITERIA || "gpt-5.5",
  // Set OPENAI_MODEL_REREAD to an empty string to skip the second reading.
  reread: process.env.OPENAI_MODEL_REREAD ?? "gpt-5.5",
};

export const rereadThreshold = Number(process.env.EXTRACT_REREAD_THRESHOLD || 0.75);
/** Patient identity fields get the second reading whatever the first reading's confidence: a wrong one is costly. */
export const alwaysReread = ["patient_name", "mrn", "dob"];

let client: OpenAI | undefined;
function openai(): OpenAI {
  client ??= new OpenAI();
  return client;
}

export type Usage = PipelineResult["pipeline"]["usage"];

export async function jsonCall<T>(opts: {
  step: string;
  model: string;
  instructions: string;
  text: string;
  images: { dataUrl: string; detail: "low" | "high" }[];
  /** PDFs, as data: URLs. */
  files?: { dataUrl: string; filename: string }[];
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  usage: Usage;
}): Promise<T> {
  const started = Date.now();
  const response = await openai().responses.create({
    model: opts.model,
    instructions: opts.instructions,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: opts.text },
          ...opts.images.map((img) => ({ type: "input_image" as const, image_url: img.dataUrl, detail: img.detail })),
          ...(opts.files ?? []).map((f) => ({ type: "input_file" as const, file_data: f.dataUrl, filename: f.filename, detail: "high" as const })),
        ],
      },
    ],
    text: { format: { type: "json_schema", name: opts.schemaName, schema: opts.jsonSchema, strict: true } },
  });

  opts.usage.push({
    step: opts.step,
    model: opts.model,
    input_tokens: response.usage?.input_tokens ?? 0,
    output_tokens: response.usage?.output_tokens ?? 0,
    ms: Date.now() - started,
  });

  if (response.status === "incomplete") {
    throw new Error(`${opts.step}: response incomplete (${response.incomplete_details?.reason ?? "unknown reason"})`);
  }
  const text = response.output_text;
  if (!text) throw new Error(`${opts.step}: model returned no output (it may have refused)`);
  return JSON.parse(text) as T;
}

// ---------- Step 1: sort the faxed pages ----------

export const PAGE_TYPES = ["referral_form", "info_sheet", ...DOC_TYPES.map((d) => d.id), "other"] as const;

const CLASSIFY_INSTRUCTIONS = `You sort pages of faxed hospital referral packets for a recuperative care program.
Label every page with one type:
- referral_form: the "${schema.form}" (form code ${schema.formCode}) page with the fill-in sections "Referring Party", "Patient Information", "Hospital Admission Details", "History of Health & Living Situation", "Behavioral and Mental Health Status" and the "ILLUMINATION STAFF ONLY" box.
- info_sheet: the program's informational page titled "Recuperative Care with Illumination / A SAFE PLACE TO HEAL" (admission criteria and checklist only, nothing filled in).
${DOC_TYPES.map((d) => `- ${d.id}: ${d.recognize}`).join("\n")}
- other: fax cover sheets and anything else.
Pages may be scanned sideways or upside down; label them by what they are, and give each page's
${ORIENTATION_HINT}`;

export interface PageType {
  page: number;
  type: (typeof PAGE_TYPES)[number];
}

async function classifyPages(
  pages: PageImage[],
  usage: Usage,
): Promise<{ pages: PageType[]; orientations: Map<number, Orientation>; notes: string }> {
  const result = await jsonCall<{ pages: (PageType & { orientation: Orientation })[]; notes: string }>({
    step: "classify",
    model: models.classify,
    instructions: CLASSIFY_INSTRUCTIONS,
    text: `There are ${pages.length} pages, in order, numbered ${pages.map((p) => p.pageNumber).join(", ")}. Label each one.`,
    images: pages.map((p) => ({ dataUrl: p.dataUrl, detail: "low" })),
    schemaName: "page_types",
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["pages", "notes"],
      properties: {
        pages: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["page", "type", "orientation"],
            properties: {
              page: { type: "integer" },
              type: { type: "string", enum: [...PAGE_TYPES] },
              orientation: { type: "string", enum: [...ORIENTATIONS] },
            },
          },
        },
        notes: { type: "string", description: "One short sentence describing the packet." },
      },
    },
    usage,
  });
  const valid = new Set(pages.map((p) => p.pageNumber));
  const labelled = result.pages.filter((p) => valid.has(p.page));
  return {
    pages: labelled.map(({ page, type }) => ({ page, type })),
    orientations: new Map(labelled.map((p) => [p.page, p.orientation])),
    notes: result.notes,
  };
}

/** Ask once more about pages that were just turned: a sideways page can be turned the wrong way. */
async function checkOrientation(pages: PageImage[], usage: Usage): Promise<Map<number, Orientation>> {
  const result = await jsonCall<{ pages: { page: number; orientation: Orientation }[] }>({
    step: "orient",
    model: models.classify,
    instructions: `You check that scanned pages are the right way up. For each page give its\n${ORIENTATION_HINT}`,
    text: `Pages ${pages.map((p) => p.pageNumber).join(", ")}, in order.`,
    images: pages.map((p) => ({ dataUrl: p.dataUrl, detail: "low" })),
    schemaName: "page_orientation",
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["pages"],
      properties: {
        pages: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["page", "orientation"],
            properties: { page: { type: "integer" }, orientation: { type: "string", enum: [...ORIENTATIONS] } },
          },
        },
      },
    },
    usage,
  });
  return new Map(result.pages.map((p) => [p.page, p.orientation]));
}

/** Turn sideways and upside-down pages upright, then check the turned ones once and correct any still wrong. */
async function turnUpright(
  pages: PageImage[],
  orientations: Map<number, Orientation>,
  usage: Usage,
): Promise<{ pages: PageImage[]; turned: { page: number; degrees: number }[] }> {
  const degrees = new Map(pages.map((p) => [p.pageNumber, turnFor(orientations.get(p.pageNumber) ?? "upright")]));
  const turn = (list: PageImage[]) =>
    Promise.all(list.map(async (p) => ({ ...p, dataUrl: await turnImage(p.dataUrl, degrees.get(p.pageNumber) ?? 0) })));
  const changed = pages.filter((p) => degrees.get(p.pageNumber));
  if (!changed.length) return { pages, turned: [] };

  let upright = await turn(changed);
  const again = await checkOrientation(upright, usage);
  const wrong = upright.filter((p) => turnFor(again.get(p.pageNumber) ?? "upright"));
  if (wrong.length) {
    for (const p of wrong) degrees.set(p.pageNumber, (degrees.get(p.pageNumber)! + turnFor(again.get(p.pageNumber)!)) % 360);
    const fixed = new Map((await turn(changed.filter((p) => wrong.some((w) => w.pageNumber === p.pageNumber)))).map((p) => [p.pageNumber, p]));
    upright = upright.map((p) => fixed.get(p.pageNumber) ?? p);
  }
  const byNumber = new Map(upright.map((p) => [p.pageNumber, p]));
  return {
    pages: pages.map((p) => byNumber.get(p.pageNumber) ?? p),
    turned: changed.map((p) => ({ page: p.pageNumber, degrees: degrees.get(p.pageNumber)! })).filter((t) => t.degrees),
  };
}

// ---------- Step 2 and 3: read fields ----------

function valueSchema(f: Field): Record<string, unknown> {
  switch (f.type) {
    case "yes_no":
      return { type: ["string", "null"], enum: ["Yes", "No", null] };
    case "single_choice":
      return { type: ["string", "null"], enum: [...(f.options ?? []), null] };
    case "multi_choice":
      return { type: "array", items: { type: "string", enum: f.options ?? [] } };
    case "integer":
      return { type: ["integer", "null"] };
    default:
      return { type: ["string", "null"] };
  }
}

function fieldHint(f: Field): string {
  const parts = [`- ${f.id}: "${f.label}" (${f.type.replace("_", " ")}`];
  if (f.options) parts.push(`; options: ${f.options.join(" | ")}`);
  parts.push(")");
  if (f.note) parts.push(` Note: ${f.note}`);
  return parts.join("");
}

// Where a field is, so the review screen can outline it on any version of the form.
const locationProperties = {
  page: { type: ["integer", "null"], description: "Packet page number the field's printed label is on; null if the field isn't on these pages." },
  left: { type: ["number", "null"], description: "Box around the printed label and its answer area, as fractions of the page image (0 = left edge, 1 = right edge)." },
  top: { type: ["number", "null"], description: "Top of that box (0 = top edge of the page image, 1 = bottom)." },
  right: { type: ["number", "null"], description: "Right of that box." },
  bottom: { type: ["number", "null"], description: "Bottom of that box." },
};
const LOCATION_KEYS = Object.keys(locationProperties);

/** `locate: false` leaves out each field's page and box (the second reading keeps the first one's). */
export function fieldsJsonSchema(fields: Field[], { locate = true } = {}): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["fields", "notes"],
    properties: {
      fields: {
        type: "object",
        additionalProperties: false,
        required: fields.map((f) => f.id),
        properties: Object.fromEntries(
          fields.map((f) => [
            f.id,
            {
              type: "object",
              additionalProperties: false,
              required: ["value", "raw", "confidence", "corrected", "redacted", ...(locate ? LOCATION_KEYS : [])],
              properties: {
                value: valueSchema(f),
                raw: { type: ["string", "null"], description: "Exactly what is handwritten or marked, before normalizing. null if blank." },
                confidence: { type: "number", description: "0 to 1: how sure you are that value is what the referrer wrote." },
                corrected: {
                  type: "boolean",
                  description: "true if anything in this field was crossed out, scribbled over, struck through or written over.",
                },
                redacted: {
                  type: "boolean",
                  description: "true if the answer area is covered by a solid black box (removed for privacy); value is then null.",
                },
                ...(locate ? locationProperties : {}),
              },
            },
          ]),
        ),
      },
      notes: { type: "string", description: "Anything a coordinator should know about the scan: illegible areas, crossed-out answers, writing in margins." },
    },
  };
}

const LOCATION_RULE = `
- Location: for every field, give the page and a box around its printed label and answer area (the line, boxes or
  options a referrer writes in), as fractions of that page image. Even a blank field has a location. Use null only
  when the field isn't printed on these pages (this version of the form doesn't ask it).`;

const EXTRACT_INSTRUCTIONS = `You transcribe hand-filled "${schema.form}" (${schema.formCode}) referral forms that were scanned or faxed.
Rules:
- Read only what is written or marked on the form. Never infer or invent a value. If a field is blank, value is null (or [] for check-all lists).
- Solid black boxes are redactions (removed for privacy), not blanks. If a field's answer is covered by one, value is null and redacted is true. Never guess what is under it.
- Yes/No questions are answered by circling "Yes" or "No", ticking a box, or writing a mark next to one option. A word with an asterisk (Yes* / No*) means that answer requires an explanation; the asterisk is printed, not part of the answer.
- Crossed-out answers: a mark or option that is scribbled over, struck through, crossed out with lines or zigzags, or blacked out is CANCELLED. It is never the answer, even if it was also circled or ticked. The answer is the remaining clean mark on the other option; if every mark is cancelled, value is null. Set corrected to true for that field, describe both marks in raw (e.g. "Yes circled and scribbled out; No circled"), and mention it in notes.
- If both options look marked and neither is crossed out, use the one that looks intended, keep confidence below 0.6, and set corrected to true.
- Checkbox groups ("c Male c Female ...") use a check, X, fill or circle on the box or label.
- Dates: return ISO yyyy-mm-dd. Assume US month/day/year order unless the writing makes day/month order unambiguous (a first number above 12). Put the date exactly as written in raw.
- Times: return HH:MM 24-hour.
- Phone numbers: return digits formatted as (XXX) XXX-XXXX, keeping any extension.
- Last 4 of SSN: exactly 4 digits.
- Keep medical abbreviations as written (e.g. "CHF exacerbation", "LLE cellulitis", "Rt heel stage 2").
- Confidence: 0.95+ only when the writing is clear; 0.6-0.85 when you had to interpret messy writing or faint marks; below 0.6 when you are guessing. A clearly blank field has high confidence that it is blank.`;

interface RawField {
  value: unknown;
  raw: string | null;
  confidence: number;
  corrected?: boolean;
  redacted?: boolean;
  page?: number | null;
  left?: number | null;
  top?: number | null;
  right?: number | null;
  bottom?: number | null;
}

/** A field's place from the reader, if it gave a usable one: a box inside one of the form pages. */
export function fieldLocation(r: RawField | undefined, pages: number[]): FieldLocation | undefined {
  if (!r || r.page == null || !pages.includes(r.page)) return undefined;
  const box = [r.left, r.top, r.right, r.bottom];
  if (!box.every((n) => typeof n === "number" && Number.isFinite(n))) return undefined;
  // Some models answer in thousandths or percent rather than fractions.
  const scale = Math.max(...(box as number[])) > 1.5 ? (Math.max(...(box as number[])) > 100 ? 1000 : 100) : 1;
  const [left, top, right, bottom] = (box as number[]).map((n) => Math.min(1, Math.max(0, n / scale)));
  // A box that's empty, or covers most of the page, doesn't point anywhere.
  if (right - left < 0.01 || bottom - top < 0.005 || right - left > 0.98 || bottom - top > 0.3) return undefined;
  return { page: r.page, box: [left, top, right, bottom] };
}

async function readFields(opts: {
  step: string;
  model: string;
  fields: Field[];
  pages: PageImage[];
  extraText?: string;
  /** Ask for each field's page and box too; costly, so only the first reading does. */
  locate?: boolean;
  usage: Usage;
}): Promise<{
  fields: Record<string, RawField>;
  notes: string;
}> {
  return jsonCall({
    step: opts.step,
    model: opts.model,
    instructions: opts.locate === false ? EXTRACT_INSTRUCTIONS : EXTRACT_INSTRUCTIONS + LOCATION_RULE,
    text: [
      `Transcribe these fields from the form page image(s). The images are packet page${opts.pages.length > 1 ? "s" : ""} ${opts.pages.map((p) => p.pageNumber).join(", ")}, in that order.`,
      ...opts.fields.map(fieldHint),
      opts.extraText ?? "",
    ].join("\n"),
    images: opts.pages.map((p) => ({ dataUrl: p.dataUrl, detail: "high" })),
    schemaName: "referral_fields",
    jsonSchema: fieldsJsonSchema(opts.fields, { locate: opts.locate !== false }),
    usage: opts.usage,
  });
}

function sameValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) =>
    Array.isArray(v) ? [...v].sort().join("|") : typeof v === "string" ? v.trim().toLowerCase() : v ?? null;
  return norm(a) === norm(b);
}

type ProgressStep = Omit<ReadProgress, "startedAt">;

export interface SortedPages {
  /** The pages, turned upright where needed. */
  pages: PageImage[];
  pageTypes: PageType[];
  classifyNotes?: string;
  classifyModel: string | null;
  turned: { page: number; degrees: number }[];
}

/**
 * A one-page upload is the form page; otherwise the cheap model labels every page and says which ones
 * are sideways or upside down, and those are turned upright.
 */
export async function sortPages(scanned: PageImage[], usage: Usage): Promise<SortedPages> {
  if (scanned.length <= 1) {
    return { pages: scanned, pageTypes: scanned.map((p) => ({ page: p.pageNumber, type: "referral_form" })), classifyModel: null, turned: [] };
  }
  const sorted = await classifyPages(scanned, usage);
  const { pages, turned } = await turnUpright(scanned, sorted.orientations, usage);
  return { pages, pageTypes: sorted.pages, classifyNotes: sorted.notes, classifyModel: models.classify, turned };
}

export async function runPipeline(scanned: PageImage[], onProgress?: (p: ProgressStep) => Promise<void>): Promise<PipelineResult> {
  const usage: Usage = [];
  const report = async (p: ProgressStep) => onProgress?.(p).catch((e) => console.warn("progress update failed:", e));
  const fields = paperFields;

  // Step 1: label the pages and turn sideways ones upright.
  if (scanned.length > 1) await report({ step: "classify", pages: scanned.length });
  const { pages, pageTypes, classifyNotes, classifyModel, turned } = await sortPages(scanned, usage);
  // No form page in a packet: leave the form blank for the coordinator rather than reading every page as the form.
  const formPages = pages.filter((p) => pageTypes.some((t) => t.page === p.pageNumber && t.type === "referral_form"));

  if (!formPages.length) {
    return {
      pages,
      data: normalize({}, fields),
      extraction: {},
      pipeline: {
        formPages: [],
        pageTypes,
        classifyNotes,
        noForm: true,
        turned,
        rereadFields: [],
        models: { classify: classifyModel, extract: models.extract, reread: null },
        usage,
      },
    };
  }

  // Step 2: read every field.
  await report({ step: "extract", pages: pages.length, formPages: formPages.map((p) => p.pageNumber) });
  const first = await readFields({ step: "extract", model: models.extract, fields, pages: formPages, usage });
  const formPageNumbers = formPages.map((p) => p.pageNumber);
  const withLocation = (location: FieldLocation | undefined) => (location ? { location } : {});
  const data = normalize(Object.fromEntries(fields.map((f) => [f.id, first.fields[f.id]?.value])), fields);
  const extraction: Extraction = Object.fromEntries(
    fields.map((f) => {
      const r = first.fields[f.id];
      return [
        f.id,
        {
          confidence: clamp(r?.confidence ?? 0),
          raw: r?.raw ?? null,
          model: models.extract,
          ...(r?.corrected ? { corrected: true } : {}),
          ...(r?.redacted && data[f.id] == null ? { redacted: true } : {}),
          ...withLocation(fieldLocation(r, formPageNumbers)),
        },
      ];
    }),
  );

  // Step 3: an independent second reading by a stronger model of the uncertain fields, answers that were
  // crossed out or changed, and the patient identity fields. A redacted field has nothing to re-read.
  const unsure = fields.filter(
    (f) =>
      !extraction[f.id].redacted &&
      (extraction[f.id].confidence < rereadThreshold || extraction[f.id].corrected || alwaysReread.includes(f.id)),
  );
  let rereadModel: string | null = null;
  if (unsure.length && models.reread) {
    rereadModel = models.reread;
    await report({ step: "reread", pages: pages.length, formPages: formPages.map((p) => p.pageNumber), fields: unsure.length });
    const second = await readFields({
      step: "reread",
      model: models.reread,
      fields: unsure,
      pages: formPages,
      extraText:
        "These fields need a careful second reading: some were hard to read on a first pass, and patient identity fields are always double-checked. Look closely at each one; zoom into the area of the form where its label is printed. Read every character of IDs and dates, and watch for writing that runs into printed text.",
      // Boxes made this step ten times slower; the first reading's are kept.
      locate: false,
      usage,
    });
    const reread = normalize(Object.fromEntries(unsure.map((f) => [f.id, second.fields[f.id]?.value])), unsure);
    for (const f of unsure) {
      const r = second.fields[f.id];
      if (!r) continue;
      const prev = extraction[f.id];
      const conf = clamp(r.confidence);
      const corrected = prev.corrected || r.corrected ? { corrected: true } : {};
      // The second reading doesn't place fields; keep the first reading's box.
      const location = withLocation(prev.location);
      if (sameValue(reread[f.id], data[f.id])) {
        // Two models agreeing independently is stronger evidence than either alone.
        extraction[f.id] = { ...prev, ...corrected, ...location, confidence: Math.max(prev.confidence, conf), model: `${prev.model}+${models.reread}` };
      } else {
        extraction[f.id] = {
          confidence: Math.min(conf, 0.6),
          raw: r.raw ?? prev.raw,
          model: models.reread,
          firstPass: { value: data[f.id], confidence: prev.confidence, model: prev.model },
          ...corrected,
          ...location,
        };
        data[f.id] = reread[f.id];
      }
    }
  }

  return {
    pages,
    data,
    extraction,
    pipeline: {
      formPages: formPages.map((p) => p.pageNumber),
      pageTypes,
      classifyNotes,
      turned,
      extractNotes: first.notes || undefined,
      rereadFields: unsure.map((f) => f.id),
      models: { classify: classifyModel, extract: models.extract, reread: rereadModel },
      usage,
    },
  };
}

function clamp(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

