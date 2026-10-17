import "server-only";
import OpenAI from "openai";
import { type Field, type FormData, normalize, paperFields, schema } from "@/lib/form";
import { DOC_TYPES } from "@/lib/documents";
import type { Extraction } from "@/lib/validate";

export interface PageImage {
  pageNumber: number;
  /** data: URL (image/jpeg or image/png) */
  dataUrl: string;
}

export interface PipelineResult {
  data: FormData;
  extraction: Extraction;
  pipeline: {
    formPages: number[];
    /** What each faxed page is; supporting documents are read from these. */
    pageTypes?: PageType[];
    classifyNotes?: string;
    extractNotes?: string;
    rereadFields: string[];
    /** Portal referrals pre-filled from a scan: fields the referrer changed before submitting. */
    referrerEdits?: string[];
    models: { classify: string | null; extract: string; reread: string | null };
    usage: { step: string; model: string; input_tokens: number; output_tokens: number; ms: number }[];
  };
}

export const models = {
  classify: process.env.OPENAI_MODEL_CLASSIFY || "gpt-5.4-nano",
  // Supporting documents (H&P, med list, culture…) are mostly typed text.
  docs: process.env.OPENAI_MODEL_DOCS || "gpt-5.4-mini",
  extract: process.env.OPENAI_MODEL_EXTRACT || "gpt-5.4-mini",
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
- other: fax cover sheets and anything else.`;

export interface PageType {
  page: number;
  type: (typeof PAGE_TYPES)[number];
}

async function classifyPages(pages: PageImage[], usage: Usage): Promise<{ pages: PageType[]; notes: string }> {
  const result = await jsonCall<{ pages: PageType[]; notes: string }>({
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
            required: ["page", "type"],
            properties: { page: { type: "integer" }, type: { type: "string", enum: [...PAGE_TYPES] } },
          },
        },
        notes: { type: "string", description: "One short sentence describing the packet." },
      },
    },
    usage,
  });
  const valid = new Set(pages.map((p) => p.pageNumber));
  return { pages: result.pages.filter((p) => valid.has(p.page)), notes: result.notes };
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

export function fieldsJsonSchema(fields: Field[]): Record<string, unknown> {
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
              required: ["value", "raw", "confidence"],
              properties: {
                value: valueSchema(f),
                raw: { type: ["string", "null"], description: "Exactly what is handwritten or marked, before normalizing. null if blank." },
                confidence: { type: "number", description: "0 to 1: how sure you are that value is what the referrer wrote." },
              },
            },
          ]),
        ),
      },
      notes: { type: "string", description: "Anything a coordinator should know about the scan: illegible areas, crossed-out answers, writing in margins." },
    },
  };
}

const EXTRACT_INSTRUCTIONS = `You transcribe hand-filled "${schema.form}" (${schema.formCode}) referral forms that were scanned or faxed.
Rules:
- Read only what is written or marked on the form. Never infer or invent a value. If a field is blank, value is null (or [] for check-all lists).
- Yes/No questions are answered by circling "Yes" or "No", ticking a box, or writing a mark next to one option. A word with an asterisk (Yes* / No*) means that answer requires an explanation; the asterisk is printed, not part of the answer.
- If both options look marked, or an answer is crossed out and replaced, use the final intended answer, lower confidence, and mention it in notes.
- Checkbox groups ("c Male c Female ...") use a check, X, fill or circle on the box or label.
- Dates: return ISO yyyy-mm-dd. Assume US month/day/year order unless the writing makes day/month order unambiguous (a first number above 12). Put the date exactly as written in raw.
- Times: return HH:MM 24-hour.
- Phone numbers: return digits formatted as (XXX) XXX-XXXX, keeping any extension.
- Last 4 of SSN: exactly 4 digits.
- Keep medical abbreviations as written (e.g. "CHF exacerbation", "LLE cellulitis", "Rt heel stage 2").
- Confidence: 0.95+ only when the writing is clear; 0.6-0.85 when you had to interpret messy writing or faint marks; below 0.6 when you are guessing. A clearly blank field has high confidence that it is blank.`;

async function readFields(opts: {
  step: string;
  model: string;
  fields: Field[];
  pages: PageImage[];
  extraText?: string;
  usage: Usage;
}): Promise<{ fields: Record<string, { value: unknown; raw: string | null; confidence: number }>; notes: string }> {
  return jsonCall({
    step: opts.step,
    model: opts.model,
    instructions: EXTRACT_INSTRUCTIONS,
    text: [
      `Transcribe these fields from the form page image(s):`,
      ...opts.fields.map(fieldHint),
      opts.extraText ?? "",
    ].join("\n"),
    images: opts.pages.map((p) => ({ dataUrl: p.dataUrl, detail: "high" })),
    schemaName: "referral_fields",
    jsonSchema: fieldsJsonSchema(opts.fields),
    usage: opts.usage,
  });
}

function sameValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) =>
    Array.isArray(v) ? [...v].sort().join("|") : typeof v === "string" ? v.trim().toLowerCase() : v ?? null;
  return norm(a) === norm(b);
}

export async function runPipeline(pages: PageImage[]): Promise<PipelineResult> {
  const usage: Usage = [];
  const fields = paperFields;

  // Step 1: a one-page upload is the form page; otherwise let the cheap model find it.
  let formPages = pages;
  let pageTypes: PageType[] = pages.map((p) => ({ page: p.pageNumber, type: "referral_form" }));
  let classifyNotes: string | undefined;
  let classifyModel: string | null = null;
  if (pages.length > 1) {
    classifyModel = models.classify;
    const sorted = await classifyPages(pages, usage);
    classifyNotes = sorted.notes;
    pageTypes = sorted.pages;
    const form = new Set(sorted.pages.filter((p) => p.type === "referral_form").map((p) => p.page));
    if (form.size) formPages = pages.filter((p) => form.has(p.pageNumber));
  }

  // Step 2: read every field.
  const first = await readFields({ step: "extract", model: models.extract, fields, pages: formPages, usage });
  const data = normalize(Object.fromEntries(fields.map((f) => [f.id, first.fields[f.id]?.value])), fields);
  const extraction: Extraction = Object.fromEntries(
    fields.map((f) => {
      const r = first.fields[f.id];
      return [f.id, { confidence: clamp(r?.confidence ?? 0), raw: r?.raw ?? null, model: models.extract }];
    }),
  );

  // Step 3: an independent second reading of the uncertain fields, and the patient identity fields, by a stronger model.
  const unsure = fields.filter((f) => extraction[f.id].confidence < rereadThreshold || alwaysReread.includes(f.id));
  let rereadModel: string | null = null;
  if (unsure.length && models.reread) {
    rereadModel = models.reread;
    const second = await readFields({
      step: "reread",
      model: models.reread,
      fields: unsure,
      pages: formPages,
      extraText:
        "These fields need a careful second reading: some were hard to read on a first pass, and patient identity fields are always double-checked. Look closely at each one; zoom into the area of the form where its label is printed. Read every character of IDs and dates, and watch for writing that runs into printed text.",
      usage,
    });
    const reread = normalize(Object.fromEntries(unsure.map((f) => [f.id, second.fields[f.id]?.value])), unsure);
    for (const f of unsure) {
      const r = second.fields[f.id];
      if (!r) continue;
      const prev = extraction[f.id];
      const conf = clamp(r.confidence);
      if (sameValue(reread[f.id], data[f.id])) {
        // Two models agreeing independently is stronger evidence than either alone.
        extraction[f.id] = { ...prev, confidence: Math.max(prev.confidence, conf), model: `${prev.model}+${models.reread}` };
      } else {
        extraction[f.id] = {
          confidence: Math.min(conf, 0.6),
          raw: r.raw ?? prev.raw,
          model: models.reread,
          firstPass: { value: data[f.id], confidence: prev.confidence, model: prev.model },
        };
        data[f.id] = reread[f.id];
      }
    }
  }

  return {
    data,
    extraction,
    pipeline: {
      formPages: formPages.map((p) => p.pageNumber),
      pageTypes,
      classifyNotes,
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

