import { assessmentGaps } from "@/lib/assessment";
import type { SupportingDoc } from "@/lib/documents";
import type { FormData } from "@/lib/form";
import { ageOn, buildHandoff } from "@/lib/handoff";
import type { Flag } from "@/lib/validate";

/**
 * The Housing & Services Summary: the Care Coordinator's picture of the client once the assessment is filled,
 * with a chronic homelessness determination, a service plan and what HMIS still needs. Plain code, no model.
 */
export interface HousingSummary {
  client: {
    name: string | null;
    preferredName: string | null;
    age: number | null;
    dob: string | null;
    phone: string | null;
    contactMethod: string | null;
    language: string | null;
    veteran: string | null;
    household: string | null;
  };
  stay: {
    hospital: string | null;
    admissionDate: string | null;
    /** The recuperative care authorization ends: the date housing needs to be lined up by. */
    authorizedThrough: string | null;
    daysLeft: number | null;
    diagnoses: string[];
    medicationCount: number;
    nursingNeeds: string[];
  };
  homelessness: {
    priorSituation: string | null;
    lengthThere: string | null;
    episodeStart: string | null;
    times3yrs: string | null;
    months3yrs: number | null;
    chronic: { status: "yes" | "no" | "unknown"; reason: string };
  };
  health: {
    disabling: string | null;
    conditions: string[];
    notes: string | null;
    insurance: string | null;
    pcp: string | null;
  };
  income: {
    has: string | null;
    sources: string[];
    monthly: number | null;
    noncash: string[];
    pending: string | null;
  };
  documents: { have: string[]; missing: string[] };
  housing: {
    goal: string | null;
    ces: string | null;
    barriers: string[];
    accessibility: string | null;
    area: string | null;
  };
  plan: PlanRow[];
  goals: string | null;
  strengths: string | null;
  /** Problems that keep the record out of HMIS or leave the plan incomplete. */
  hmis: { ready: boolean; issues: string[] };
  assessedBy: string | null;
  assessmentDate: string | null;
  nextReview: string | null;
}

export interface PlanRow {
  need: string;
  goal: string;
  firstStep: string;
  due: string | null;
}

/** Measurable goal and first step for each service need. */
const PLAN: Record<string, [string, string]> = {
  "Benefits enrollment": ["Income or benefits application submitted", "Screen for SSI/SSDI, CalFresh and General Relief; book the appointment"],
  "Mental health services": ["Connected to an outpatient mental health provider", "Referral to county behavioral health; confirm intake date"],
  "Substance use treatment": ["Engaged in a substance use program of the client's choosing", "Offer harm reduction options and treatment referrals"],
  "Employment / job search": ["Resume done and two applications submitted", "Enroll in the employment workshop"],
  Transportation: ["Gets to every scheduled appointment", "Set up Medi-Cal transportation and a bus pass"],
  "Food assistance": ["Steady access to food", "CalFresh application and local pantry list"],
  "Life skills": ["Attends two life skills sessions a month", "Add to the life skills group calendar"],
  "Legal aid": ["Legal barrier reviewed by an attorney", "Referral to the legal aid clinic"],
  "Primary care connection": ["Established with a primary care provider and seen once", "Choose a PCP with the health plan and book a new patient visit"],
  "Home health": ["Home health care continues after the move", "Confirm the home health agency can follow the client to the new address"],
};

/** Needs a housing application or the move itself depends on. */
const BEFORE_MOVE = new Set(["Benefits enrollment", "Primary care connection", "Home health"]);

const STREET_OR_SHELTER = /not meant for habitation|emergency shelter|safe haven/i;

export function buildHousingSummary(
  referral: FormData,
  a: FormData,
  docs: SupportingDoc[],
  docFlags: Flag[],
  today = new Date(),
): HousingSummary {
  const h = buildHandoff(referral, docs, docFlags, today);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const list = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

  const dob = h.patient.dob;
  const authorizedThrough = h.stay.endDate;
  const daysLeft = authorizedThrough ? Math.ceil((Date.parse(`${authorizedThrough}T00:00:00`) - startOfDay(today)) / 86_400_000) : null;

  const chronic = chronicStatus(a);

  const have = list(a.id_documents).filter((d) => d !== "None");
  const missing = ["CA ID or driver's license", "Social Security card", "Birth certificate"].filter((d) => !have.includes(d));

  // Service plan: the needs the coordinator picked, plus what the answers imply.
  const needs = [...list(a.services_needed)];
  const add = (n: string) => !needs.includes(n) && needs.push(n);
  if (a.has_pcp === "No") add("Primary care connection");
  if (a.has_income === "No") add("Benefits enrollment");
  if (referral.home_health_ordered === "Yes") add("Home health");
  // Ongoing services get 30 days; what housing depends on is due before the recuperative care stay ends.
  const due = str(a.assessment_date) ? addDays(str(a.assessment_date)!, 30) : null;
  const beforeStayEnds = due && authorizedThrough && authorizedThrough < due ? authorizedThrough : (due ?? authorizedThrough);
  const plan: PlanRow[] = needs
    .filter((n) => PLAN[n])
    .map((n) => ({ need: n, goal: PLAN[n][0], firstStep: PLAN[n][1], due: BEFORE_MOVE.has(n) ? beforeStayEnds : due }));
  if (missing.length) {
    plan.unshift({ need: "ID documents", goal: "Has the documents housing applications ask for", firstStep: `Request ${missing.join(", ")}`, due: beforeStayEnds });
  }
  if (a.ces_enrolled === "No") {
    plan.unshift({ need: "Coordinated Entry", goal: "Enrolled in CES and on the housing match list", firstStep: "Complete the CES assessment", due: beforeStayEnds });
  }

  const issues: string[] = [];
  if (a.hmis_consent !== "Yes") issues.push("HMIS consent not signed: the record can't be entered in HMIS");
  if (a.roi_signed !== "Yes") issues.push("Release of information not signed: can't share with housing or health providers");
  for (const gap of assessmentGaps(a)) issues.push(`Missing: ${gap}`);
  if (chronic.status === "unknown") issues.push("Chronic homelessness can't be determined yet");

  return {
    client: {
      name: h.patient.name,
      preferredName: str(a.preferred_name),
      age: dob ? ageOn(dob, today) : null,
      dob,
      phone: str(a.client_phone) ?? h.patient.phone,
      contactMethod: str(a.contact_method),
      language: h.patient.language,
      veteran: str(a.veteran_status),
      household: [num(a.household_size) && `${a.household_size} ${a.household_size === 1 ? "person" : "people"}`, str(a.household_notes)].filter(Boolean).join("; ") || null,
    },
    stay: {
      hospital: h.stay.hospital,
      admissionDate: h.stay.admissionDate,
      authorizedThrough,
      daysLeft,
      diagnoses: h.situation.diagnoses.length ? h.situation.diagnoses : [h.situation.chiefComplaint].filter((x): x is string => !!x),
      medicationCount: h.medications.rows.length,
      nursingNeeds: h.alerts.map((x) => x.label),
    },
    homelessness: {
      priorSituation: str(a.prior_living_situation),
      lengthThere: str(a.length_of_stay_prior),
      episodeStart: str(a.homeless_start_date),
      times3yrs: str(a.times_homeless_3yrs),
      months3yrs: num(a.months_homeless_3yrs),
      chronic,
    },
    health: {
      disabling: str(a.disabling_condition),
      conditions: list(a.conditions),
      notes: str(a.conditions_explain),
      insurance: str(a.health_insurance) ?? h.stay.insurance,
      pcp: a.has_pcp === "Yes" ? [str(a.pcp_name), str(a.pcp_phone)].filter(Boolean).join(" · ") || "Yes" : null,
    },
    income: {
      has: str(a.has_income),
      sources: list(a.income_sources),
      monthly: num(a.monthly_income),
      noncash: list(a.noncash_benefits).filter((x) => x !== "None"),
      pending: str(a.benefits_pending),
    },
    documents: { have, missing },
    housing: {
      goal: str(a.housing_goal),
      ces: a.ces_enrolled === "Yes" ? (str(a.ces_score) ? `Enrolled · ${a.ces_score}` : "Enrolled") : a.ces_enrolled === "No" ? "Not enrolled" : null,
      barriers: list(a.housing_barriers),
      accessibility: str(a.accessibility_needs),
      area: str(a.preferred_area),
    },
    plan,
    goals: str(a.client_goals),
    strengths: str(a.strengths),
    hmis: { ready: issues.length === 0, issues },
    assessedBy: str(a.assessed_by),
    assessmentDate: str(a.assessment_date),
    nextReview: str(a.next_review_date),
  };
}

/**
 * HUD's chronically homeless definition, simplified: a disabling condition, and living on the street, in a shelter
 * or safe haven either continuously for a year or on four or more occasions in three years totalling 12 months.
 * A hospital stay under 90 days doesn't break the episode.
 */
export function chronicStatus(a: FormData): HousingSummary["homelessness"]["chronic"] {
  const disabling = a.disabling_condition;
  const prior = typeof a.prior_living_situation === "string" ? a.prior_living_situation : null;
  if (!disabling || !prior) return { status: "unknown", reason: "Needs disabling condition and prior living situation" };
  if (disabling !== "Yes") return { status: "no", reason: "No disabling condition" };
  if (!STREET_OR_SHELTER.test(prior)) return { status: "no", reason: `Prior living situation: ${prior}` };
  if (a.length_of_stay_prior === "1 year or longer") return { status: "yes", reason: "Homeless continuously for a year or more, with a disabling condition" };
  const months = typeof a.months_homeless_3yrs === "number" ? a.months_homeless_3yrs : null;
  if (a.times_homeless_3yrs === "Four or more times") {
    if (months === null) return { status: "unknown", reason: "Four or more episodes; total months not recorded" };
    if (months >= 12) return { status: "yes", reason: `Four or more episodes in 3 years totalling ${months} months, with a disabling condition` };
    return { status: "no", reason: `Four or more episodes but only ${months} months in total` };
  }
  if (!a.length_of_stay_prior || !a.times_homeless_3yrs) return { status: "unknown", reason: "Needs length of homelessness and number of episodes" };
  return { status: "no", reason: "Under a year continuously and fewer than four episodes" };
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
