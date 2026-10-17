import { describe, expect, it } from "vitest";
import { normalizeAssessment } from "@/lib/assessment";
import { crossCheck } from "@/lib/crosscheck";
import type { SupportingDoc } from "@/lib/documents";
import { allFields, emptyData, normalize } from "@/lib/form";
import { buildHousingPacket } from "@/lib/packet";
import { MOCK_PATIENTS } from "@/scripts/mock-patients";

const TODAY = new Date("2026-10-12T12:00:00");

function packet(name: string) {
  const p = MOCK_PATIENTS.find((m) => m.referral.patient_name === name)!;
  const data = { ...emptyData(allFields), ...normalize(p.referral, allFields) };
  const docs = p.docs.map((d, i) => ({ id: String(i), doc_type: d.type, label: null, document_id: null, pages: null, status: "done", data: d.data, error: null })) as SupportingDoc[];
  return buildHousingPacket(data, normalizeAssessment(p.assessment!.data), docs, crossCheck(data, docs, p.receivedAt), TODAY);
}

describe("buildHousingPacket", () => {
  it("budgets 30% of income, rounded down to $5", () => {
    expect(packet("Kevin Brooks").budget).toMatchObject({ monthlyIncome: 1180, maxRent: 350 });
    expect(packet("Maria Santos").budget).toMatchObject({ monthlyIncome: 0, maxRent: 0 });
  });

  it("collects unit needs from the household, assessment and records", () => {
    expect(packet("Maria Santos").unitNeeds).toEqual(expect.arrayContaining(["Studio or 1 bedroom", "Pet-friendly", "Prefers Spanish; ask for a property contact who speaks it"]));
    expect(packet("Kevin Brooks").unitNeeds).toContain("Ground floor preferred (seizures)");
    const jim = MOCK_PATIENTS.find((m) => m.referral.patient_name === "James Whitaker")!;
    expect(jim.assessment).toBeDefined();
    expect(packet("James Whitaker").unitNeeds).toEqual(expect.arrayContaining(["Refrigerator for insulin or other medications", "Ground floor or elevator (uses offloading boot, walker)"]));
  });

  it("pairs every barrier with an approach and lists the documents to get", () => {
    const maria = packet("Maria Santos");
    expect(maria.barriers.map((b) => b.barrier)).toEqual(["No income", "Missing ID documents", "Pets"]);
    expect(maria.barriers.every((b) => b.approach !== "Discuss with the care team")).toBe(true);
    const status = Object.fromEntries(maria.documents.map((d) => [d.name, d.status]));
    expect(status).toMatchObject({ "Photo ID (CA ID or driver's license)": "need", "Birth certificate": "have", "Disability verification (PSH)": "check" });
    expect(Object.fromEntries(packet("Kevin Brooks").documents.map((d) => [d.name, d.status]))["HMIS consent and CES enrollment"]).toBe("need");
  });

  it("suggests at least three independent living goals", () => {
    for (const name of ["Maria Santos", "Kevin Brooks", "James Whitaker"]) expect(packet(name).livingGoals.length).toBeGreaterThanOrEqual(3);
    expect(packet("Kevin Brooks").livingGoals[0]).toMatch(/Medication management/);
  });
});
