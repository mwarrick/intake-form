import { describe, expect, it } from "vitest";
import { type FormData, emptyData, fieldsById, isVisible, normalize, referrerFields } from "@/lib/form";
import { isAmbiguousDate, validate } from "@/lib/validate";

const complete = (): FormData => ({
  ...emptyData(),
  referring_hospital: "St. Example Medical Center",
  referrer_name: "Jordan Lee, MSW",
  referrer_phone: "(714) 555-0100",
  patient_name: "Test Patient",
  mrn: "A123456",
  dob: "1971-03-04",
  chief_complaint: "Cellulitis, LLE",
  admit_date: "2026-10-01",
});

const kinds = (flags: ReturnType<typeof validate>, field: string) =>
  flags.filter((f) => f.field === field).map((f) => f.kind);

describe("validate", () => {
  it("passes a complete referral with no flags", () => {
    expect(validate(complete())).toEqual([]);
  });

  it("requires follow-up explanations only when triggered", () => {
    const d = complete();
    expect(kinds(validate(d), "wounds_detail")).toEqual([]);
    d.wounds = "Yes";
    expect(kinds(validate(d), "wounds_detail")).toEqual(["missing"]);
  });

  it("flags admission criteria", () => {
    const d = { ...complete(), ambulatory: "No", self_admin_meds: "Yes", behavioral_flags: ["Forgetful", "Registered Sex Offender"] };
    const flags = validate(d).filter((f) => f.kind === "eligibility");
    expect(flags.map((f) => f.field)).toEqual(["ambulatory", "behavioral_flags"]);
  });

  it("checks formats", () => {
    const d = { ...complete(), ssn_last4: "12a4", admit_date: "2026-02-30", referrer_email: "nope" };
    const flags = validate(d);
    expect(kinds(flags, "ssn_last4")).toEqual(["invalid"]);
    expect(kinds(flags, "admit_date")).toEqual(["invalid"]);
    expect(kinds(flags, "referrer_email")).toEqual(["invalid"]);
  });

  it("flags low confidence, disagreement and ambiguous dates from extraction", () => {
    const flags = validate(complete(), {
      confidenceThreshold: 0.75,
      extraction: {
        mrn: { confidence: 0.5, raw: "A12345?", model: "m" },
        dob: { confidence: 0.95, raw: "3/4/71", model: "m" },
        patient_name: { confidence: 0.55, raw: "Test Patient", model: "m2", firstPass: { value: "Tess Patient", confidence: 0.6, model: "m1" } },
      },
    });
    expect(kinds(flags, "mrn")).toEqual(["low_confidence"]);
    expect(kinds(flags, "dob")).toEqual(["ambiguous"]);
    expect(kinds(flags, "patient_name")).toEqual(["disagreement"]);
  });
});

describe("form helpers", () => {
  it("detects day/month ambiguity", () => {
    expect(isAmbiguousDate("03/04/1971")).toBe(true);
    expect(isAmbiguousDate("13/04/1971")).toBe(false);
    expect(isAmbiguousDate("04/04/1971")).toBe(false);
    expect(isAmbiguousDate("March 4 1971")).toBe(false);
  });

  it("shows follow-ups only when triggered", () => {
    const insulin = fieldsById.get("insulin")!;
    expect(isVisible(insulin, { diabetes: "No" })).toBe(false);
    expect(isVisible(insulin, { diabetes: "Yes" })).toBe(true);
    const dxType = fieldsById.get("mental_health_dx_type")!;
    expect(isVisible(dxType, { behavioral_flags: ["Mental Health DX"] })).toBe(true);
  });

  it("normalizes posted values", () => {
    const out = normalize({ los_authorized_days: "14", patient_name: "  ", behavioral_flags: ["Forgetful", "Bogus"] }, referrerFields);
    expect(out.los_authorized_days).toBe(14);
    expect(out.patient_name).toBeNull();
    expect(out.behavioral_flags).toEqual(["Forgetful"]);
  });
});
