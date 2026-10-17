import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { crossCheck } from "@/lib/crosscheck";
import { DOC_TYPES, type DocData, type SupportingDoc, docJsonSchema } from "@/lib/documents";
import { type FormData, emptyData } from "@/lib/form";

const dir = new URL("../samples/synthetic/", import.meta.url);
const form = (sample: string): FormData => ({ ...emptyData(), ...JSON.parse(readFileSync(new URL(`${sample}.json`, dir), "utf8")).expected });
const key = (sample: string) => JSON.parse(readFileSync(new URL(`documents/${sample}/answer-key.json`, dir), "utf8"));
const doc = (doc_type: string, data: DocData): SupportingDoc => ({ id: doc_type, doc_type, label: null, document_id: "x", pages: null, status: "done", data, error: null });

// A perfect reading of each sample's documents in samples/synthetic/documents/.
const READS: Record<string, SupportingDoc[]> = {
  "sample-1-clean": [
    doc("demographics", { patient_name: "DELGADO, MARCUS", dob: "1968-11-23", mrn: "OC4471209" }),
    doc("authorization", { member_name: "DELGADO, MARCUS", member_dob: "1968-11-23", authorization_number: "RC-2026-118842", status: "Approved", approved_days: 14, end_date: "2026-10-24" }),
    doc("history_physical", { patient_name: "DELGADO, MARCUS", cognitive_impairment: false, oriented_x4: true, infections: [] }),
    doc("progress_notes", { patient_name: "DELGADO, MARCUS", medically_stable: true, oriented_x4: true, infections: [] }),
    doc("vitals", { patient_name: "DELGADO, MARCUS", taken_at: "2026-10-10T08:00", oxygen: "Room air" }),
    doc("medications", { patient_name: "DELGADO, MARCUS", medications: [{ name: "Furosemide", dose: "40 mg", route: "PO", frequency: "Daily" }, { name: "Nicotine patch", dose: "14 mg", route: "Transdermal", frequency: "Daily" }] }),
    doc("therapy_notes", { patient_name: "DELGADO, MARCUS", ambulation_distance_ft: 300, assistive_device: "none", transfers_independent: true, adls_independent: true }),
  ],
  "sample-2-messy": [
    doc("demographics", { patient_name: "ELLIS, TAMARA", dob: "1965-04-07", mrn: "SJ-0093381" }),
    doc("authorization", { member_name: "ELLIS, TAMARA", authorization_number: "RC-2026-119207", status: "Approved", approved_days: 14, end_date: "2026-10-24" }),
    doc("history_physical", { patient_name: "ELLIS, TAMARA", cognitive_impairment: false, oriented_x4: true, infections: [{ organism: "Cellulitis with abscess", site: "left lower leg", status: "improving" }] }),
    doc("vitals", { patient_name: "ELLIS, TAMARA", taken_at: "2026-10-09T06:00", oxygen: "Room air" }),
    doc("medications", { patient_name: "ELLIS, TAMARA", medications: [{ name: "Insulin glargine", dose: "18 units", route: "SC", frequency: "Nightly" }] }),
    doc("therapy_notes", { patient_name: "ELLIS, TAMARA", ambulation_distance_ft: 150, assistive_device: "front-wheeled walker", transfers_independent: true, adls_independent: true }),
    doc("culture", { patient_name: "ELLIS, TAMARA", collected_at: "2026-10-02", result: "positive", organism: "Staphylococcus aureus (MRSA)", mrsa: true, cleared: false }),
  ],
  "sample-3-ineligible": [
    doc("demographics", { patient_name: "PIKE, GERALD", dob: "1952-02-14", mrn: "FV2290141" }),
    doc("authorization", { member_name: "PIKE, GERALD", authorization_number: null, status: "Pending clinical review", approved_days: null }),
    doc("history_physical", { patient_name: "PIKE, GERALD", cognitive_impairment: true, oriented_x4: false, infections: [{ organism: "MRSA pneumonia", site: "RLL", status: "active" }] }),
    doc("vitals", { patient_name: "PIKE, GERALD", taken_at: "2026-10-10T10:00", oxygen: "2L NC" }),
    doc("medications", { patient_name: "PIKE, GERALD", medications: [{ name: "Vancomycin", dose: "1.25 g", route: "IV (PICC)", frequency: "Every 12 hours" }] }),
    doc("therapy_notes", { patient_name: "PIKE, GERALD", ambulation_distance_ft: 40, assistive_device: "rolling walker", transfers_independent: false, adls_independent: false }),
    doc("culture", { patient_name: "PIKE, GERALD", collected_at: "2026-09-29", result: "positive", organism: "MRSA", mrsa: true, cleared: null }),
  ],
};

describe("crossCheck against the sample answer keys", () => {
  for (const sample of Object.keys(READS)) {
    it(sample, () => {
      const k = key(sample);
      const flags = crossCheck(form(sample), READS[sample], k.received_at);
      // Every expected flag is raised…
      for (const [kind, match] of k.expected_flags as [string, string][]) {
        expect(flags.some((f) => f.kind === kind && (f.field === match || f.message.toLowerCase().includes(match.toLowerCase()))), `${kind}: ${match}\n${JSON.stringify(flags, null, 1)}`).toBe(true);
      }
      // …and no conflicts beyond them.
      const expectedConflicts = (k.expected_flags as [string, string][]).filter(([kind]) => kind === "conflict").length;
      expect(flags.filter((f) => f.kind === "conflict").length).toBe(expectedConflicts);
    });
  }

  it("the clean sample raises nothing but the culture it didn't need", () => {
    expect(crossCheck(form("sample-1-clean"), READS["sample-1-clean"], "2026-10-10T14:20")).toEqual([
      { kind: "document", message: "Not received (if needed): Blood or Wound Culture", field: undefined },
    ]);
  });

  it("lists missing required documents and 'if needed' ones not received", () => {
    const flags = crossCheck(form("sample-1-clean"), [], "2026-10-10T14:20");
    expect(flags.filter((f) => f.kind === "document").map((f) => f.message)).toEqual(
      DOC_TYPES.map((t) => (t.required ? `Missing: ${t.label}` : `Not received (if needed): ${t.label.replace(" (if needed)", "")}`)),
    );
  });

  it("counts a culture as missing when the form reports an infection or wound", () => {
    for (const answer of [{ active_infection: "Yes" }, { wounds: "Yes" }] as FormData[]) {
      const flags = crossCheck({ ...form("sample-1-clean"), ...answer }, READS["sample-1-clean"], "2026-10-10T14:20");
      expect(flags.map((f) => f.message)).toContain("Missing: Blood or Wound Culture (the form reports an active infection or wound)");
    }
  });

  it("explains a DOB that is the form's with day and month swapped", () => {
    const flags = crossCheck({ ...form("sample-2-messy"), dob: "1965-07-04" }, READS["sample-2-messy"], "2026-10-10T14:20");
    expect(flags.find((f) => f.field === "dob")?.message).toContain("day and month swapped");
  });

  it("matches 'Last, First' to 'First Last' and ignores middle initials", () => {
    const flags = crossCheck({ ...form("sample-1-clean"), patient_name: "Marcus A. Delgado" }, READS["sample-1-clean"], "2026-10-10T14:20");
    expect(flags.filter((f) => f.field === "patient_name")).toEqual([]);
  });
});

describe("document schemas", () => {
  it("are valid for OpenAI strict mode", () => {
    const check = (n: Record<string, any>): boolean =>
      n.type !== "object"
        ? !n.items || check(n.items)
        : n.additionalProperties === false &&
          Object.keys(n.properties).length === n.required.length &&
          Object.values(n.properties).every((p) => check(p as Record<string, any>));
    for (const t of DOC_TYPES) expect(check(docJsonSchema(t)), t.id).toBe(true);
  });
});
