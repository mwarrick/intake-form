/**
 * Supporting documents from the referral checklist: what each one is, and what to read from it.
 * Shared by the reader (as a JSON schema), the review screen, and the cross-checks.
 */

export type DocFieldType = "text" | "date" | "datetime" | "number" | "boolean" | "list";

export interface DocField {
  id: string;
  label: string;
  type: DocFieldType;
  hint?: string;
}

/** A field holding a list of rows, e.g. medications or infections. */
export interface DocTable {
  id: string;
  label: string;
  columns: DocField[];
}

export interface DocType {
  id: string;
  /** Matches the checklist item on the referral form. */
  label: string;
  /** Helps the classifier recognize it among faxed pages. */
  recognize: string;
  required: boolean;
  /**
   * The referral form itself satisfies this checklist item, so it is never listed as missing;
   * the document is still read when a hospital sends one.
   */
  coveredByForm?: boolean;
  fields: DocField[];
  tables?: DocTable[];
}

const patient: DocField[] = [
  { id: "patient_name", label: "Patient name", type: "text" },
  { id: "dob", label: "Date of birth", type: "date" },
  { id: "mrn", label: "MRN", type: "text" },
];

const infections: DocTable = {
  id: "infections",
  label: "Infections",
  columns: [
    { id: "organism", label: "Organism / infection", type: "text", hint: "e.g. MRSA, TB, C. diff, VRE, cellulitis" },
    { id: "site", label: "Site", type: "text" },
    { id: "status", label: "Status", type: "text", hint: "active, cleared, ruled out, or unknown, as the document states" },
  ],
};

export const DOC_TYPES: DocType[] = [
  {
    // The checklist's "Client's Demographic Page" is the referral form; a hospital face sheet adds phone, member ID and emergency contact.
    id: "demographics",
    label: "Hospital Face Sheet",
    recognize: "Hospital face sheet / registration page: patient name, DOB, address, phone, insurance, emergency contact.",
    required: false,
    coveredByForm: true,
    fields: [
      ...patient,
      { id: "sex", label: "Sex", type: "text" },
      { id: "address", label: "Address", type: "text", hint: "Write 'homeless' or 'none' exactly as the document does" },
      { id: "phone", label: "Phone", type: "text" },
      { id: "insurance", label: "Primary insurance", type: "text" },
      { id: "member_id", label: "Member ID", type: "text" },
      { id: "emergency_contact", label: "Emergency contact", type: "text" },
      { id: "preferred_language", label: "Preferred language", type: "text" },
    ],
  },
  {
    id: "authorization",
    label: "CalOptima Form/LOA/AUTH",
    recognize: "Health plan authorization or letter of agreement (e.g. CalOptima): auth number, approved service, days, dates.",
    required: true,
    fields: [
      { id: "payer", label: "Payer", type: "text" },
      { id: "member_name", label: "Member name", type: "text" },
      { id: "member_dob", label: "Member DOB", type: "date" },
      { id: "authorization_number", label: "Authorization #", type: "text" },
      { id: "service", label: "Service", type: "text" },
      { id: "status", label: "Status", type: "text", hint: "approved, pending, denied" },
      { id: "approved_days", label: "Approved days", type: "number" },
      { id: "start_date", label: "Start date", type: "date" },
      { id: "end_date", label: "End date", type: "date" },
    ],
  },
  {
    id: "history_physical",
    label: "H&P (History and Physical)",
    recognize: "History and Physical: HPI, past medical history, exam, assessment and plan.",
    required: true,
    fields: [
      ...patient,
      { id: "date_of_service", label: "Date of service", type: "date" },
      { id: "chief_complaint", label: "Chief complaint", type: "text" },
      { id: "diagnoses", label: "Diagnoses", type: "list" },
      { id: "past_medical_history", label: "Past medical history", type: "list" },
      { id: "allergies", label: "Allergies", type: "list" },
      { id: "cognitive_impairment", label: "Cognitive impairment / dementia", type: "boolean" },
      { id: "oriented_x4", label: "Alert and oriented x4", type: "boolean" },
      { id: "substance_use", label: "Substance use", type: "text" },
      { id: "plan", label: "Plan", type: "text" },
    ],
    tables: [infections],
  },
  {
    id: "progress_notes",
    label: "Current Progress Notes (if needed)",
    recognize: "Physician or hospitalist daily progress note (SOAP): subjective, objective, assessment, plan.",
    required: false,
    fields: [
      ...patient,
      { id: "note_date", label: "Note date", type: "datetime" },
      { id: "assessment", label: "Assessment", type: "text" },
      { id: "medically_stable", label: "Medically stable for discharge", type: "boolean" },
      { id: "cognitive_impairment", label: "Cognitive impairment / dementia", type: "boolean" },
      { id: "oriented_x4", label: "Alert and oriented x4", type: "boolean" },
      { id: "plan", label: "Plan", type: "text" },
    ],
    tables: [infections],
  },
  {
    id: "vitals",
    label: "Updated Vitals (last 24 hours)",
    recognize: "Vital signs flowsheet: BP, HR, temperature, respiratory rate, SpO2, with times.",
    required: true,
    fields: [
      ...patient,
      { id: "taken_at", label: "Most recent vitals taken", type: "datetime" },
      { id: "blood_pressure", label: "Blood pressure", type: "text" },
      { id: "heart_rate", label: "Heart rate", type: "number" },
      { id: "temperature_f", label: "Temperature (°F)", type: "number" },
      { id: "resp_rate", label: "Respiratory rate", type: "number" },
      { id: "spo2", label: "SpO2 (%)", type: "number" },
      { id: "oxygen", label: "Oxygen", type: "text", hint: "room air, or the oxygen delivery and flow, e.g. 2L NC" },
    ],
  },
  {
    id: "medications",
    label: "Medication List",
    recognize: "Medication list, MAR or discharge medication reconciliation.",
    required: true,
    fields: [...patient, { id: "allergies", label: "Allergies", type: "list" }],
    tables: [
      {
        id: "medications",
        label: "Medications",
        columns: [
          { id: "name", label: "Medication", type: "text" },
          { id: "dose", label: "Dose", type: "text" },
          { id: "route", label: "Route", type: "text", hint: "PO, IV, SC, IM, topical, inhaled… as written" },
          { id: "frequency", label: "Frequency", type: "text" },
        ],
      },
    ],
  },
  {
    id: "therapy_notes",
    label: "PT/OT or Nursing Notes",
    recognize: "Physical/occupational therapy evaluation or nursing note: mobility, gait, transfers, ADLs.",
    required: true,
    fields: [
      ...patient,
      { id: "note_date", label: "Note date", type: "datetime" },
      { id: "discipline", label: "Discipline", type: "text", hint: "PT, OT or Nursing" },
      { id: "ambulation_distance_ft", label: "Ambulation distance (ft)", type: "number" },
      { id: "assistive_device", label: "Assistive device", type: "text", hint: "'none' if the note says none" },
      { id: "transfers_independent", label: "Transfers independently", type: "boolean" },
      { id: "adls_independent", label: "Independent with ADLs", type: "boolean" },
      { id: "recommendations", label: "Recommendations", type: "text" },
    ],
  },
  {
    id: "culture",
    label: "Blood or Wound Culture (if needed)",
    recognize: "Microbiology lab report: blood/wound/sputum culture, organism, susceptibilities.",
    required: false,
    fields: [
      ...patient,
      { id: "collected_at", label: "Collected", type: "date" },
      { id: "specimen", label: "Specimen", type: "text" },
      { id: "result", label: "Result", type: "text", hint: "positive, negative, no growth, or pending" },
      { id: "organism", label: "Organism", type: "text" },
      { id: "mrsa", label: "MRSA", type: "boolean" },
      { id: "cleared", label: "Cleared by MD / ID", type: "boolean", hint: "true only if the report or an addendum says it was cleared" },
    ],
  },
];

export const docTypesById = new Map(DOC_TYPES.map((d) => [d.id, d]));
export const docTypeByLabel = new Map(DOC_TYPES.map((d) => [d.label, d]));

export type DocValue = string | number | boolean | string[] | Record<string, string | null>[] | null;
export type DocData = Record<string, DocValue>;

/** One supporting document after reading. */
export interface SupportingDoc {
  id: string;
  doc_type: string;
  label: string | null;
  /** The uploaded file it came from, or the pages of a faxed packet. */
  document_id: string | null;
  pages: number[] | null;
  status: "processing" | "done" | "failed";
  data: DocData | null;
  error: string | null;
}

function fieldSchema(f: DocField): Record<string, unknown> {
  const base = (t: string) => ({ type: [t, "null"], description: [f.label, f.hint].filter(Boolean).join(". ") });
  switch (f.type) {
    case "number":
      return base("number");
    case "boolean":
      return base("boolean");
    case "list":
      return { type: "array", items: { type: "string" }, description: f.label };
    case "date":
      return { ...base("string"), description: `${f.label}. ISO yyyy-mm-dd` };
    case "datetime":
      return { ...base("string"), description: `${f.label}. ISO yyyy-mm-ddTHH:MM (local time, no zone)` };
    default:
      return base("string");
  }
}

/** Strict JSON schema for reading one document type. */
export function docJsonSchema(t: DocType): Record<string, unknown> {
  const props: Record<string, unknown> = Object.fromEntries(t.fields.map((f) => [f.id, fieldSchema(f)]));
  for (const table of t.tables ?? []) {
    props[table.id] = {
      type: "array",
      description: table.label,
      items: {
        type: "object",
        additionalProperties: false,
        required: table.columns.map((c) => c.id),
        properties: Object.fromEntries(table.columns.map((c) => [c.id, { type: ["string", "null"], description: [c.label, c.hint].filter(Boolean).join(". ") }])),
      },
    };
  }
  props.notes = { type: "string", description: "Anything else a referral coordinator should know from this document. Empty if nothing." };
  return { type: "object", additionalProperties: false, required: Object.keys(props), properties: props };
}
