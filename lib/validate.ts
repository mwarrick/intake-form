import { type Field, type FormData, fieldsById, isEmpty, isRequired, referrerFields } from "@/lib/form";

export type FlagKind = "missing" | "invalid" | "ambiguous" | "eligibility" | "low_confidence" | "disagreement";

export interface Flag {
  kind: FlagKind;
  field?: string;
  message: string;
}

/** Per-field extraction details stored with scanned referrals. */
export interface FieldExtraction {
  confidence: number;
  raw: string | null;
  model: string;
  // set when a second model re-read the field and disagreed with the first pass
  firstPass?: { value: unknown; confidence: number; model: string };
}

export type Extraction = Record<string, FieldExtraction>;

const ELIGIBILITY_MESSAGES: Record<string, string> = {
  self_admin_meds: "Patient must be able to self-administer medications",
  ambulatory: "Patient must be able to walk 100 ft. and transfer independently",
  active_infection: "Active infection must be cleared by a doctor or CID before admission",
  "Cognitive Impairment": "Cognitive impairment is an exclusion criterion",
  "Registered Sex Offender": "Registered sex offenders are not eligible",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{1,2}:\d{2}(\s?[AaPp][Mm])?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

function formatProblem(field: Field, v: FormData[string]): string | null {
  if (isEmpty(v)) return null;
  const s = String(v);
  switch (field.type) {
    case "date":
      return isValidIsoDate(s) ? null : "is not a valid date";
    case "time":
      return TIME.test(s) ? null : "is not a valid time";
    case "email":
      return EMAIL.test(s) ? null : "is not a valid email address";
    case "phone":
      return s.replace(/\D/g, "").length >= 10 ? null : "needs at least 10 digits";
    default:
      if (field.pattern && !new RegExp(field.pattern).test(s)) return "is not in the expected format";
      return null;
  }
}

/**
 * Hand-written dates like 03/04/1980 can be read either way round, and the form itself
 * labels DOB "dd/mm/yyy" while US hospitals usually write mm/dd/yyyy.
 */
export function isAmbiguousDate(raw: string | null | undefined): boolean {
  const m = raw?.match(/^\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\s*$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a <= 12 && b <= 12 && a !== b;
}

export interface ValidateOptions {
  fields?: Field[];
  extraction?: Extraction;
  confidenceThreshold?: number;
}

export function validate(data: FormData, opts: ValidateOptions = {}): Flag[] {
  const fields = opts.fields ?? referrerFields;
  const threshold = opts.confidenceThreshold ?? 0.75;
  const flags: Flag[] = [];

  for (const f of fields) {
    const v = data[f.id];

    if (isRequired(f, data) && isEmpty(v)) {
      flags.push({ kind: "missing", field: f.id, message: `${f.label} is required` });
    }

    const problem = formatProblem(f, v);
    if (problem) flags.push({ kind: "invalid", field: f.id, message: `${f.label} ${problem}` });

    if (f.type === "yes_no" && typeof f.eligibility === "string") {
      const fails = (f.eligibility === "must_be_yes" && v === "No") || (f.eligibility === "review_if_yes" && v === "Yes");
      if (fails) {
        flags.push({ kind: "eligibility", field: f.id, message: ELIGIBILITY_MESSAGES[f.id] ?? `${f.label}: ${v}` });
      }
    }

    if (f.type === "multi_choice" && f.eligibility && typeof f.eligibility === "object" && Array.isArray(v)) {
      for (const opt of v) {
        if (f.eligibility[opt] === "exclusion") {
          flags.push({ kind: "eligibility", field: f.id, message: ELIGIBILITY_MESSAGES[opt] ?? `${opt} is an exclusion` });
        }
      }
    }

    const ex = opts.extraction?.[f.id];
    if (ex) {
      if (f.type === "date" && isAmbiguousDate(ex.raw)) {
        flags.push({
          kind: "ambiguous",
          field: f.id,
          message: `${f.label} "${ex.raw}" could be read as month/day or day/month`,
        });
      }
      if (ex.firstPass) {
        flags.push({
          kind: "disagreement",
          field: f.id,
          message: `${f.label}: two readings disagreed (${fmt(ex.firstPass.value)} vs ${fmt(v)})`,
        });
      } else if (ex.confidence < threshold) {
        flags.push({
          kind: "low_confidence",
          field: f.id,
          message: `${f.label} was hard to read (${Math.round(ex.confidence * 100)}%)`,
        });
      }
    }
  }

  return flags;
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "blank";
  return Array.isArray(v) ? (v.length ? v.join(", ") : "none") : `"${v}"`;
}

export function flagsByField(flags: Flag[]): Map<string, Flag[]> {
  const m = new Map<string, Flag[]>();
  for (const fl of flags) {
    if (!fl.field) continue;
    m.set(fl.field, [...(m.get(fl.field) ?? []), fl]);
  }
  return m;
}

export function fieldLabel(id: string): string {
  return fieldsById.get(id)?.label ?? id;
}
