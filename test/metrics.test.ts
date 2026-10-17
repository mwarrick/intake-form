import { describe, expect, it } from "vitest";
import { type MetricReferral, computeMetrics, localDate, stayEnd } from "@/lib/metrics";

let n = 0;
const ref = (over: Partial<MetricReferral> & { minutes?: number }): MetricReferral => {
  const created = over.created_at ?? "2026-10-01T17:00:00Z";
  const { minutes, ...rest } = over;
  return {
    id: `r${++n}`,
    created_at: created,
    status: "approved",
    source: "scan",
    referring_hospital: "Harbor View",
    data: {},
    doc_flags: [],
    decided_at: minutes === undefined ? null : new Date(Date.parse(created) + minutes * 60_000).toISOString(),
    ...rest,
  };
};

const range = { from: "2026-09-28", to: "2026-10-12" };
const TODAY = "2026-10-12";

describe("computeMetrics", () => {
  const referrals = [
    ref({ minutes: 60, data: { approved: "Yes", admission_date: "2026-10-02", los_authorized_days: 14, wounds: "Yes" } }),
    ref({ minutes: 150, referring_hospital: "Inland Valley", data: { approved: "Yes", admission_date: "2026-10-14", los_authorized_days: 21 } }),
    ref({ status: "denied", minutes: 90, data: { approved: "No", denial_category: "Active infection not cleared" }, doc_flags: [{ kind: "eligibility", message: "Active infection: MRSA on culture" }] }),
    ref({ status: "denied", referring_hospital: "Inland Valley", doc_flags: [{ kind: "document", message: "Missing: Medication List" }, { kind: "conflict", message: "x" }] }),
    ref({ status: "needs_review", created_at: "2026-10-12T16:00:00Z" }),
    ref({ status: "draft" }),
    ref({ created_at: "2026-08-01T17:00:00Z", minutes: 30, data: { approved: "Yes", admission_date: "2026-08-02", los_authorized_days: 14 } }),
  ];
  const m = computeMetrics(
    referrals,
    [{ referral_id: referrals[0].id, status: "complete", completed_at: "2026-10-06T21:00:00Z", data: { assessment_date: "2026-10-06", disabling_condition: "Yes", prior_living_situation: "Emergency shelter", length_of_stay_prior: "1 year or longer", housing_barriers: ["No income"], services_needed: ["Transportation"] } }],
    new Map(),
    range,
    TODAY,
  );

  it("counts the range, leaving out drafts and earlier referrals", () => {
    expect(m.totals).toMatchObject({ received: 5, approved: 2, denied: 2, pending: 1, approvalRate: 0.5, untimed: 1 });
  });

  it("measures the two-hour promise from decision times", () => {
    expect(m.totals.medianMinutes).toBe(90);
    expect(m.totals.within2h).toBeCloseTo(2 / 3);
  });

  it("compares hospitals and groups denials and criteria", () => {
    const iv = m.hospitals.find((h) => h.hospital === "Inland Valley")!;
    expect(iv).toMatchObject({ referrals: 2, approvalRate: 0.5, missingDocs: 0.5, conflicts: 0.5 });
    expect(m.denials).toEqual([
      { label: "Active infection not cleared", count: 1 },
      { label: "Not categorized", count: 1 },
    ]);
    expect(m.criteria).toEqual([{ label: "Active infection", count: 1 }]);
  });

  it("works out capacity from admission dates and authorized days", () => {
    expect(m.capacity).toMatchObject({ inCare: 1, arrivingNext7: 1, endingNext7: 1 });
  });

  it("reports housing progress for patients admitted a week or more ago", () => {
    expect(m.housing).toMatchObject({ admitted: 1, assessed: 1, complete: 1, completeWithin7: 1, chronic: 1 });
    expect(m.housing.barriers).toEqual([{ label: "No income", count: 1 }]);
  });

  it("buckets weeks from Monday and counts acuity", () => {
    expect(m.weekly[0].week).toBe("2026-09-28");
    expect(m.weekly.reduce((a, w) => a + w.approved + w.denied + w.pending, 0)).toBe(5);
    expect(m.acuity.find((a) => a.label === "Wound care")).toEqual({ label: "Wound care", count: 1, of: 2 });
  });
});

describe("stays", () => {
  const stay = (data: Record<string, unknown>) => ref({ minutes: 30, data: { approved: "Yes", admission_date: "2026-09-01", los_authorized_days: 14, ...data } });
  const referrals = [
    stay({ exit_date: "2026-09-15", total_los: 14, extension_requested: "No" }),
    stay({ exit_date: "2026-09-12", total_los: 11 }),
    stay({ exit_date: "2026-09-29", total_los: 28, extension_requested: "Yes" }),
    stay({ extension_requested: "No" }),
    stay({ admission_date: "2026-10-10", extension_requested: "Yes" }),
  ];
  const m = computeMetrics(referrals, [], new Map(), { from: "2026-09-28", to: "2026-10-12" }, TODAY);

  it("measures length of stay, early exits and extensions", () => {
    expect(m.stays).toMatchObject({ exited: 3, medianLos: 14, leftEarly: 1, extended: 2, extensionAsked: 4, noExit: 1 });
    expect(m.stays.los.map((b) => b.count)).toEqual([1, 1, 1, 0]);
  });

  it("ends a stay on its exit date, and leaves an extended stay open", () => {
    expect(stayEnd({ admission_date: "2026-09-01", los_authorized_days: 14 })).toBe("2026-09-15");
    expect(stayEnd({ admission_date: "2026-09-01", los_authorized_days: 14, exit_date: "2026-09-10" })).toBe("2026-09-10");
    expect(stayEnd({ admission_date: "2026-09-01", los_authorized_days: 14, extension_requested: "Yes" })).toBeNull();
    expect(m.capacity.inCare).toBe(1);
  });
});

describe("withdrawals", () => {
  const at = (hours: number) => new Date(Date.parse("2026-10-01T17:00:00Z") + hours * 3_600_000).toISOString();
  const referrals = [
    ref({ minutes: 60, data: { approved: "Yes" } }),
    ref({ status: "denied", minutes: 90, data: { approved: "No" } }),
    // Left AMA while IHH was still reviewing.
    ref({ status: "withdrawn", withdrawn_at: at(1), data: { withdrawn: "Yes", withdrawal_reason: "Patient left the hospital against medical advice (AMA)" } }),
    // Approved in 3 hours, then placed elsewhere and never arrived.
    ref({ status: "withdrawn", minutes: 180, withdrawn_at: at(5), data: { approved: "Yes", withdrawn: "Yes", withdrawal_reason: "Placed with another provider" } }),
  ];
  const m = computeMetrics(referrals, [], new Map(), range, TODAY);

  it("counts withdrawals apart from approvals and denials", () => {
    expect(m.totals).toMatchObject({ received: 4, approved: 1, denied: 1, approvalRate: 0.5, untimed: 0 });
    expect(m.weekly.reduce((a, w) => a + w.withdrawn, 0)).toBe(2);
  });

  it("separates those lost before a decision from approved patients who never arrived", () => {
    expect(m.withdrawals).toMatchObject({ count: 2, rate: 0.5, beforeDecision: 1, afterApproval: 1, leftAma: 1, medianHours: 3 });
    expect(m.withdrawals.reasons.map((r) => r.count)).toEqual([1, 1]);
  });

  it("keeps a decision that came before the withdrawal in decision time", () => {
    expect(m.totals.medianMinutes).toBe(90);
  });
});

describe("localDate", () => {
  it("uses Pacific time", () => {
    expect(localDate("2026-10-13T02:00:00Z")).toBe("2026-10-12");
  });
});
