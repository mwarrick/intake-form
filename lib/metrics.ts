import type { Assessment } from "@/lib/assessment";
import type { SupportingDoc } from "@/lib/documents";
import type { FormData } from "@/lib/form";
import { buildHandoff } from "@/lib/handoff";
import { buildHousingSummary } from "@/lib/housing";
import type { Flag } from "@/lib/validate";

/**
 * Program measures for leadership (Sr. Director of Services and Care Transitions): referral flow, the two-hour
 * decision promise, referral quality by hospital, why referrals don't qualify, patient acuity, capacity and
 * housing progress. Totals only; plain code over the stored referrals and assessments.
 */
export interface MetricReferral {
  id: string;
  created_at: string;
  status: string;
  source: "scan" | "portal";
  referring_hospital: string | null;
  /** Loaded for the data-to-fix list; the dashboard never shows it. */
  patient_name?: string | null;
  data: FormData;
  doc_flags: Flag[];
  decided_at: string | null;
}

export interface Metrics {
  range: { from: string; to: string };
  totals: {
    received: number;
    approved: number;
    denied: number;
    pending: number;
    approvalRate: number | null;
    within2h: number | null;
    medianMinutes: number | null;
    /** Decided referrals with no decision time (decided before it was recorded). */
    untimed: number;
    scans: number;
  };
  weekly: { week: string; approved: number; denied: number; pending: number; medianMinutes: number | null; within2h: number | null }[];
  hospitals: { hospital: string; referrals: number; approvalRate: number | null; missingDocs: number; conflicts: number; medianMinutes: number | null }[];
  denials: Count[];
  criteria: Count[];
  acuity: { label: string; count: number; of: number }[];
  capacity: { inCare: number; arrivingNext7: number; endingNext7: number; avgDaysAuthorized: number | null };
  housing: {
    admitted: number;
    assessed: number;
    completeWithin7: number;
    complete: number;
    chronic: number;
    hmisReady: number;
    barriers: Count[];
    services: Count[];
  };
}

export interface Count {
  label: string;
  count: number;
}

const DECIDED = new Set(["approved", "denied"]);
const PENDING = new Set(["needs_review", "reviewed", "failed"]);

/** Eligibility flags grouped by admission criterion. */
const CRITERIA: [RegExp, string][] = [
  [/^Active infection/, "Active infection"],
  [/walks|transfer|activities of daily living/i, "Mobility / ADLs"],
  [/cognitive|oriented/i, "Cognition"],
  [/^IV medication/, "IV medications"],
  [/medically stable/i, "Not medically stable"],
];

export function computeMetrics(
  referrals: MetricReferral[],
  assessments: Pick<Assessment, "referral_id" | "status" | "data" | "completed_at">[],
  docs: Map<string, SupportingDoc[]>,
  range: { from: string; to: string },
  today: string,
): Metrics {
  const inRange = referrals.filter((r) => {
    const d = localDate(r.created_at);
    return d >= range.from && d <= range.to && r.status !== "draft" && r.status !== "processing";
  });
  const decided = inRange.filter((r) => DECIDED.has(r.status));
  const approved = inRange.filter((r) => r.status === "approved");
  const denied = inRange.filter((r) => r.status === "denied");
  const timed = decided.filter((r) => r.decided_at).map((r) => minutes(r));

  // Weekly flow and decision time, weeks starting Monday.
  const weeks = new Map<string, MetricReferral[]>();
  for (let w = weekStart(range.from); w <= range.to; w = addDays(w, 7)) weeks.set(w, []);
  for (const r of inRange) weeks.get(weekStart(localDate(r.created_at)))?.push(r);
  const weekly = [...weeks].map(([week, rs]) => {
    const t = rs.filter((r) => DECIDED.has(r.status) && r.decided_at).map(minutes);
    return {
      week,
      approved: rs.filter((r) => r.status === "approved").length,
      denied: rs.filter((r) => r.status === "denied").length,
      pending: rs.filter((r) => PENDING.has(r.status)).length,
      medianMinutes: median(t),
      within2h: t.length ? t.filter((m) => m <= 120).length / t.length : null,
    };
  });

  const byHospital = group(inRange, (r) => r.referring_hospital ?? "Unknown");
  const hospitals = [...byHospital]
    .map(([hospital, rs]) => {
      const d = rs.filter((r) => DECIDED.has(r.status));
      return {
        hospital,
        referrals: rs.length,
        approvalRate: d.length ? d.filter((r) => r.status === "approved").length / d.length : null,
        missingDocs: rs.filter((r) => r.doc_flags.some((f) => f.message.startsWith("Missing:"))).length / rs.length,
        conflicts: rs.filter((r) => r.doc_flags.some((f) => f.kind === "conflict")).length / rs.length,
        medianMinutes: median(d.filter((r) => r.decided_at).map(minutes)),
      };
    })
    .sort((a, b) => b.referrals - a.referrals);

  const denials = counts(denied.map((r) => (typeof r.data.denial_category === "string" ? r.data.denial_category : "Not categorized")));
  const criteria = counts(
    inRange.flatMap((r) => {
      const hit = new Set<string>();
      for (const f of r.doc_flags.filter((f) => f.kind === "eligibility")) hit.add(CRITERIA.find(([re]) => re.test(f.message))?.[1] ?? "Other");
      return [...hit];
    }),
  );

  // Acuity of approved patients, from the same alerts the admission summary shows.
  const alerts = approved.map((r) => ({ r, h: buildHandoff(r.data, docs.get(r.id) ?? [], r.doc_flags) }));
  const has = (pred: (x: (typeof alerts)[number]) => boolean) => alerts.filter(pred).length;
  const label = (x: (typeof alerts)[number], re: RegExp) => x.h.alerts.some((a) => re.test(a.label));
  const withMeds = alerts.filter((x) => x.h.medications.rows.length);
  const acuity = [
    { label: "Wound care", count: has((x) => x.r.data.wounds === "Yes"), of: alerts.length },
    { label: "Insulin", count: has((x) => label(x, /^Insulin/)), of: alerts.length },
    { label: "Fall risk", count: has((x) => label(x, /^Fall risk/)), of: alerts.length },
    { label: "Behavioral / mental health", count: has((x) => label(x, /^Behavioral/)), of: alerts.length },
    { label: "Oxygen", count: has((x) => label(x, /^Oxygen/)), of: alerts.length },
    { label: "Controlled medication", count: withMeds.filter((x) => x.h.medications.rows.some((m) => m.notes.some((n) => n.startsWith("Controlled")))).length, of: withMeds.length },
  ];

  // Capacity as of today, across every approved referral (not just the range).
  const stays = referrals
    .filter((r) => r.status === "approved" && typeof r.data.admission_date === "string")
    .map((r) => {
      const start = r.data.admission_date as string;
      const days = typeof r.data.los_authorized_days === "number" ? r.data.los_authorized_days : null;
      return { start, end: days ? addDays(start, days) : null, days };
    });
  const next7 = addDays(today, 7);
  const capacity = {
    inCare: stays.filter((s) => s.start <= today && (!s.end || s.end > today)).length,
    arrivingNext7: stays.filter((s) => s.start > today && s.start <= next7).length,
    endingNext7: stays.filter((s) => s.start <= today && s.end && s.end > today && s.end <= next7).length,
    avgDaysAuthorized: mean(approved.map((r) => r.data.los_authorized_days).filter((d): d is number => typeof d === "number")),
  };

  // Housing: approved patients in the range admitted at least a week ago.
  const byReferral = new Map(assessments.map((a) => [a.referral_id, a]));
  const admitted = approved.filter((r) => typeof r.data.admission_date === "string" && addDays(r.data.admission_date as string, 7) <= today);
  const complete = admitted.flatMap((r) => {
    const a = byReferral.get(r.id);
    return a?.status === "complete" ? [{ r, a }] : [];
  });
  const summaries = complete.map(({ r, a }) => buildHousingSummary(r.data, a.data, docs.get(r.id) ?? [], r.doc_flags, new Date(`${today}T12:00:00`)));
  const housing = {
    admitted: admitted.length,
    assessed: admitted.filter((r) => byReferral.has(r.id)).length,
    complete: complete.length,
    completeWithin7: complete.filter(({ r, a }) => {
      const done = typeof a.data.assessment_date === "string" ? a.data.assessment_date : a.completed_at ? localDate(a.completed_at) : null;
      return done !== null && done <= addDays(r.data.admission_date as string, 7);
    }).length,
    chronic: summaries.filter((s) => s.homelessness.chronic.status === "yes").length,
    hmisReady: summaries.filter((s) => s.hmis.ready).length,
    barriers: counts(summaries.flatMap((s) => s.housing.barriers)),
    services: counts(complete.flatMap(({ a }) => (Array.isArray(a.data.services_needed) ? (a.data.services_needed as string[]) : []))),
  };

  return {
    range,
    totals: {
      received: inRange.length,
      approved: approved.length,
      denied: denied.length,
      pending: inRange.filter((r) => PENDING.has(r.status)).length,
      approvalRate: decided.length ? approved.length / decided.length : null,
      within2h: timed.length ? timed.filter((m) => m <= 120).length / timed.length : null,
      medianMinutes: median(timed),
      untimed: decided.length - timed.length,
      scans: inRange.filter((r) => r.source === "scan").length,
    },
    weekly,
    hospitals,
    denials,
    criteria,
    acuity,
    capacity,
    housing,
  };
}

function minutes(r: MetricReferral): number {
  return (Date.parse(r.decided_at!) - Date.parse(r.created_at)) / 60_000;
}
/** Calendar date in Pacific time, where the program runs. */
export function localDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(typeof iso === "string" ? new Date(iso) : iso);
}
/** The UTC instant a Pacific calendar day (YYYY-MM-DD) starts, allowing for daylight saving time. */
export function pacificDayStart(day: string): string {
  const guess = Date.parse(`${day}T00:00:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const offset = (t: number) => {
    const p = Object.fromEntries(fmt.formatToParts(t).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - t;
  };
  return new Date(guess - offset(guess - offset(guess))).toISOString();
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
/** The Monday that starts the week containing a YYYY-MM-DD day. */
export function weekStart(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return addDays(iso, -((day + 6) % 7));
}
function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}
function mean(xs: number[]): number | null {
  return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
}
function group<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]);
  return m;
}
function counts(xs: string[]): Count[] {
  return [...group(xs, (x) => x)].map(([label, v]) => ({ label, count: v.length })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
