import { describe, expect, it } from "vitest";
import { findDataIssues } from "@/lib/dataquality";
import type { MetricReferral } from "@/lib/metrics";

const ref = (id: string, over: Partial<MetricReferral>): MetricReferral => ({
  id,
  created_at: "2026-09-20T17:00:00Z",
  status: "approved",
  source: "portal",
  referring_hospital: "Harbor View",
  patient_name: `Patient ${id}`,
  data: { authorization_number: "RC-1", admission_date: "2026-09-21", los_authorized_days: 21 },
  doc_flags: [],
  decided_at: "2026-09-20T18:00:00Z",
  ...over,
});

const TODAY = "2026-10-12";

describe("findDataIssues", () => {
  it("finds nothing on a complete record", () => {
    const r = ref("ok", {});
    expect(findDataIssues([r], [{ referral_id: "ok", status: "complete", data: { hmis_consent: "Yes" } }], TODAY)).toEqual({ issues: [], records: 0, untimed: 0 });
  });

  it("checks the decision, authorization and admission", () => {
    const { issues, untimed } = findDataIssues(
      [
        ref("d1", { status: "denied", data: { approved: "No" } }),
        ref("d2", { status: "denied", data: { denial_category: "No bed available" }, decided_at: null }),
        ref("a1", { data: { admission_date: "2026-10-11" } }),
        ref("a2", { data: { authorization_number: "RC-2" } }),
        ref("a3", { data: { authorization_number: "RC-3", admission_date: "2026-10-10" } }),
        ref("p1", { status: "needs_review", data: {}, decided_at: null }),
        ref("x", { status: "draft", data: {} }),
      ],
      [],
      TODAY,
    );
    expect(issues.map((i) => `${i.referralId}:${i.type}`)).toEqual([
      "d1:no_denial_category",
      "a1:no_auth_number",
      "a1:no_authorized_days",
      "a2:no_admission_date",
      "a3:no_authorized_days",
    ]);
    expect(untimed).toBe(1);
  });

  it("lists missing documents and conflicts left at approval, not other flags", () => {
    const { issues } = findDataIssues(
      [
        ref("a", {
          doc_flags: [
            { kind: "document", message: "Missing: Medication List" },
            { kind: "document", message: "Not received (if needed): Current Progress Notes" },
            { kind: "conflict", field: "los_authorized_days", message: "Authorization approves 14 days; the form asks for 21" },
          ],
        }),
      ],
      [{ referral_id: "a", status: "complete", data: { hmis_consent: "Yes" } }],
      TODAY,
    );
    expect(issues.map((i) => [i.type, i.detail, i.fix])).toEqual([
      ["approved_missing_document", "Medication List", "review"],
      ["approved_with_conflict", "Authorization approves 14 days; the form asks for 21", "review"],
    ]);
  });

  it("checks the housing assessment a week after admission", () => {
    const { issues, records } = findDataIssues(
      [ref("none", {}), ref("draft", {}), ref("noconsent", {}), ref("new", { data: { authorization_number: "RC-9", admission_date: "2026-10-08", los_authorized_days: 14 } })],
      [
        { referral_id: "draft", status: "draft", data: {} },
        { referral_id: "noconsent", status: "complete", data: { hmis_consent: "No" } },
      ],
      TODAY,
    );
    expect(issues.map((i) => `${i.referralId}:${i.type}:${i.fix}`)).toEqual([
      "none:assessment_not_started:assessment",
      "draft:assessment_draft:assessment",
      "noconsent:no_hmis_consent:assessment",
    ]);
    expect(records).toBe(3);
  });
});
