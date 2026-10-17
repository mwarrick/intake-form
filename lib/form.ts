import regionsJson from "@/schema/field-regions.json";
import schemaJson from "@/schema/referral-form.json";

export type FieldType =
  | "text"
  | "longtext"
  | "phone"
  | "email"
  | "date"
  | "time"
  | "integer"
  | "yes_no"
  | "single_choice"
  | "multi_choice";

export type FieldValue = string | number | string[] | null;
export type FormData = Record<string, FieldValue>;
export type Condition = Record<string, string>;

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  pattern?: string;
  note?: string;
  showWhen?: Condition;
  requiredWhen?: Condition;
  explainWhen?: string;
  /** Asked on the online form only; there is no place for it on the paper form, so the reader skips it. */
  notOnPaper?: boolean;
  // "must_be_yes" | "review_if_yes" for yes_no fields, or option -> "exclusion" for multi_choice
  eligibility?: string | Record<string, string>;
}

export interface Section {
  id: string;
  label: string;
  instructions?: string;
  phi?: boolean;
  staffOnly?: boolean;
  fields: Field[];
}

export interface FormSchema {
  form: string;
  formCode: string;
  page: number;
  sections: Section[];
  attachments: { label: string; items: string[] };
}

export const schema = schemaJson as FormSchema;

export const referrerSections = schema.sections.filter((s) => !s.staffOnly);
export const staffSection = schema.sections.find((s) => s.staffOnly)!;

export const allFields: Field[] = schema.sections.flatMap((s) => s.fields);
export const referrerFields: Field[] = referrerSections.flatMap((s) => s.fields);
/** Fields printed on the paper form, i.e. what the scan reader looks for. */
export const paperFields: Field[] = referrerFields.filter((f) => !f.notOnPaper);
export const staffFields: Field[] = staffSection.fields;
export const fieldsById = new Map(allFields.map((f) => [f.id, f]));

/** Where a field sits on the paper form page: [left, top, right, bottom] as fractions of the page. */
export type Region = [number, number, number, number];
/** Generated from the blank form PDF by scripts/make_regions.py. */
export const fieldRegions = regionsJson as unknown as Record<string, Region>;

export const YES_NO = ["Yes", "No"] as const;

export function isEmpty(v: FieldValue | undefined): boolean {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
}

/** Every key in the condition must match; a multi_choice value matches if it includes the option. */
export function matches(cond: Condition, data: FormData): boolean {
  return Object.entries(cond).every(([id, expected]) => {
    const v = data[id];
    return Array.isArray(v) ? v.includes(expected) : v === expected;
  });
}

/** Whether the online form shows a field. Follow-up fields appear once the answer that triggers them is given. */
export function isVisible(field: Field, data: FormData): boolean {
  if (field.showWhen) return matches(field.showWhen, data);
  if (field.requiredWhen) return matches(field.requiredWhen, data);
  return true;
}

export function isRequired(field: Field, data: FormData): boolean {
  if (field.required) return true;
  return field.requiredWhen ? matches(field.requiredWhen, data) : false;
}

/** Empty values for every field, so forms start controlled. */
export function emptyData(fields: Field[] = allFields): FormData {
  return Object.fromEntries(fields.map((f) => [f.id, f.type === "multi_choice" ? [] : null]));
}

/** Coerce posted or extracted values into the shape each field type stores. */
export function normalize(data: Record<string, unknown>, fields: Field[] = allFields): FormData {
  const out: FormData = {};
  for (const f of fields) {
    const v = data[f.id];
    if (f.type === "multi_choice") {
      out[f.id] = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!f.options?.includes(x)) : [];
    } else if (f.type === "integer") {
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
      out[f.id] = Number.isFinite(n) ? Math.trunc(n) : null;
    } else if (typeof v === "string") {
      const s = v.trim();
      out[f.id] = s === "" ? null : s;
    } else {
      out[f.id] = null;
    }
  }
  return out;
}
