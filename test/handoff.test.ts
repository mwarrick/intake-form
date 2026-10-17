import { describe, expect, it } from "vitest";
import type { SupportingDoc } from "@/lib/documents";
import { ageOn, allergyMatch, buildHandoff } from "@/lib/handoff";

const doc = (doc_type: string, data: Record<string, unknown>): SupportingDoc => ({
  id: doc_type + Math.random(),
  doc_type,
  label: null,
  document_id: null,
  pages: [1],
  status: "done",
  data: data as SupportingDoc["data"],
  error: null,
});

const form = {
  patient_name: "Tamara Ellis",
  dob: "1965-04-07",
  approved: "Yes",
  admission_date: "2026-10-12",
  los_authorized_days: 21,
  insulin: "Yes",
  wounds: "Yes",
  wounds_detail: "L lower leg 4x3cm",
  independent_wound_care: "No",
  home_health_ordered: "Yes",
  assistive_device: "Yes",
  assistive_device_explain: "front wheel walker",
  active_infection: "No",
};

const docs = [
  doc("medications", {
    allergies: ["see chart"],
    medications: [
      { name: "Insulin glargine", dose: "22 units", route: "SC", frequency: "Nightly" },
      { name: "Trimethoprim-sulfamethoxazole DS", dose: "1 tab", route: "PO", frequency: "BID" },
      { name: "Oxycodone", dose: "5 mg", route: "PO", frequency: "q6h PRN" },
    ],
  }),
  doc("history_physical", { allergies: ["Sulfa? (patient unsure)"], diagnoses: ["LLE cellulitis"], oriented_x4: true }),
  doc("authorization", { authorization_number: "RC-1", approved_days: 14, end_date: "2026-10-24", status: "approved" }),
  doc("vitals", { taken_at: "2026-10-08T22:00", blood_pressure: "138/84" }),
  doc("vitals", { taken_at: "2026-10-09T06:00", blood_pressure: "132/80", oxygen: "room air" }),
  doc("therapy_notes", { note_date: "2026-10-08T11:30", adls_independent: true, recommendations: "Continue walker" }),
  doc("therapy_notes", { note_date: "2026-10-09T14:00", adls_independent: false, discipline: "Nursing", recommendations: "Set-up for dressing" }),
];

const flags = [
  { kind: "eligibility" as const, message: "Active infection: MRSA on culture from 2026-10-02, not documented as cleared" },
  { kind: "conflict" as const, field: "los_authorized_days", message: "Authorization approves 14 days; the form asks for 21" },
];

describe("buildHandoff", () => {
  const h = buildHandoff(form, docs, flags, new Date("2026-10-12T12:00:00"));

  it("fills the header from the form, the authorization and the patient's age", () => {
    expect(h.patient.age).toBe(61);
    expect(h.stay).toMatchObject({ approved: true, authNumber: "RC-1", daysApproved: 14, daysRequested: 21, endDate: "2026-10-24" });
  });

  it("puts high alerts first: isolation, a possible allergy, wound care", () => {
    const high = h.alerts.filter((a) => a.level === "high").map((a) => a.label);
    expect(high).toEqual(["Contact precautions: active infection", "Allergy check: Trimethoprim-sulfamethoxazole DS", "Wound care: not independent"]);
    expect(h.alerts.findIndex((a) => a.level === "medium")).toBe(high.length);
    expect(h.alerts.map((a) => a.label)).toEqual(expect.arrayContaining(["Allergies unclear", "Insulin-dependent diabetic", "Fall risk", "Needs help with daily activities"]));
  });

  it("marks medication handling and keeps conflicts", () => {
    const notes = Object.fromEntries(h.medications.rows.map((r) => [r.name, r.notes]));
    expect(notes["Insulin glargine"]).toEqual(["Refrigerate unopened"]);
    expect(notes["Oxycodone"]).toEqual(["Controlled: count and lock"]);
    expect(notes["Trimethoprim-sulfamethoxazole DS"]).toEqual(["Possible allergy: Sulfa? (patient unsure)"]);
    expect(h.conflicts).toEqual(["Authorization approves 14 days; the form asks for 21"]);
  });

  it("uses the newest vitals and mobility note", () => {
    expect(h.baseline.vitals?.bp).toBe("132/80");
    expect(h.baseline.mobility?.adls).toBe(false);
    expect(h.recommendations.map((r) => r.source)).toEqual(["Therapy recommendations", "Nursing recommendations"]);
  });

  it("works from the form alone, with the end date worked out from the admission date", () => {
    const bare = buildHandoff({ ...form, admission_date: "2026-10-12" }, [], []);
    expect(bare.alerts.map((a) => a.label)).toContain("No allergies listed");
    expect(bare.stay.endDate).toBeNull(); // no approved days without the authorization
  });
});

describe("allergyMatch", () => {
  it("matches drug classes and named drugs, and ignores NKDA", () => {
    expect(allergyMatch("Amoxicillin 500 mg", ["PCN (rash)"])).toBe("PCN (rash)");
    expect(allergyMatch("Lisinopril", ["Lisinopril - cough"])).toBe("Lisinopril - cough");
    expect(allergyMatch("Ibuprofen", ["NKDA"])).toBeNull();
    expect(allergyMatch("Metformin", ["Sulfa"])).toBeNull();
  });
});

describe("ageOn", () => {
  it("counts birthdays", () => {
    expect(ageOn("1965-10-13", new Date("2026-10-12T12:00:00"))).toBe(60);
    expect(ageOn("1965-10-12", new Date("2026-10-12T12:00:00"))).toBe(61);
  });
});
