import { describe, expect, it } from "vitest";
import { RULES, RULE_GROUPS, type RuleResult, rulesById, summarize } from "@/lib/criteria";

const result = (rule_id: string, outcome: RuleResult["outcome"]): RuleResult => ({ rule_id, outcome, evidence: null, pages: [], note: "" });

describe("admission criteria", () => {
  it("loads every rule once, from the outline, the body systems and the form", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ["GEN-1", "MH-2", "INF-1", "CARD-6", "NEU-X5", "FORM-X4", "FORM-X5"]) expect(rulesById.has(id), id).toBe(true);
    expect(rulesById.get("NEU-X5")?.kind).toBe("exclude");
    expect(rulesById.get("GI-E1")?.kind).toBe("eligible");
  });

  it("leaves out form rules the outline supersedes", () => {
    for (const id of ["FORM-M6", "FORM-X3", "FORM-X6"]) expect(rulesById.has(id), id).toBe(false);
    expect(rulesById.get("OTH-2")?.humanReview).toBe(true);
  });

  it("groups only real rules", () => {
    for (const g of Object.values(RULE_GROUPS)) for (const id of g.rules) expect(rulesById.has(id), id).toBe(true);
  });

  it("checks every rule, each in exactly one group", () => {
    const grouped = Object.values(RULE_GROUPS).flatMap((g) => g.rules);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(new Set(grouped)).toEqual(new Set(RULES.map((r) => r.id)));
  });

  it("puts exclusions first, lists missing documents to request, and never counts unknown as fine", () => {
    const s = summarize([
      result("INF-1", "concern"),
      result("MOB-3", "concern"),
      result("MH-2", "concern"),
      result("ID-Q1", "concern"),
      result("INF-2", "unknown"),
      result("MH-5", "unknown"),
      result("ID-Q2", "unknown"),
      result("MH-3", "ok"),
      result("OTH-3", "not_applicable"),
    ]);
    expect(s.concerns.map((r) => r.rule_id)).toEqual(["MH-2", "MOB-3"]);
    expect(s.request.map((r) => r.rule_id)).toEqual(["INF-1", "INF-2"]);
    expect(s.unknown.map((r) => r.rule_id)).toEqual(["MH-5"]);
  });
});
