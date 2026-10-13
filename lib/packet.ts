import type { SupportingDoc } from "@/lib/documents";
import type { FormData } from "@/lib/form";
import { buildHandoff } from "@/lib/handoff";
import { type HousingSummary, buildHousingSummary } from "@/lib/housing";
import type { Flag } from "@/lib/validate";

/**
 * The housing search packet: what the Housing Case Manager needs from the Care Coordinator's assessment to find
 * a unit and move the client in. Profile, budget, unit needs, barriers with ways around them, the documents
 * applications ask for, and suggested independent-living goals. Plain code, no model.
 */
export interface HousingPacket {
  summary: HousingSummary;
  budget: { monthlyIncome: number | null; maxRent: number | null; note: string };
  unitNeeds: string[];
  barriers: { barrier: string; approach: string }[];
  documents: { name: string; status: "have" | "need" | "check"; note?: string }[];
  /** Things about the person's health that the unit or the move has to account for. */
  moveConsiderations: string[];
  /** The posting asks for at least three independent living goals per plan. */
  livingGoals: string[];
}

/** Ways around each barrier, for the first conversation with a landlord or program. */
const APPROACH: Record<string, string> = {
  "No income": "Target subsidized units and PSH, where rent is a share of income. Track the benefits application and use the pending date in applications.",
  "Missing ID documents": "Request replacements now; most applications and CES matches can't move without photo ID and a Social Security card.",
  "Eviction history": "Get the eviction details and a reference from a later landlord or program; PSH and Housing First programs don't screen it out.",
  "Criminal record": "Look for fair-chance housing and ask for an individualized assessment; prepare a short statement and letters of support.",
  "Poor or no credit": "Use properties that accept a program guarantee or no-credit screening; offer the case manager as contact.",
  Pets: "Filter for pet-friendly units and budget for a pet deposit; get vaccination records ready.",
  "Accessibility needs": "Ask for ground floor or elevator units and file a reasonable accommodation request where needed.",
  "Active substance use": "Housing First and harm reduction programs accept active use; avoid sober living unless the client chooses it.",
  "Registered sex offender": "Check each address against residency restrictions before applying; work with programs that serve this group.",
};

export function buildHousingPacket(referral: FormData, assessment: FormData, docs: SupportingDoc[], docFlags: Flag[], today = new Date()): HousingPacket {
  const summary = buildHousingSummary(referral, assessment, docs, docFlags, today);
  const h = buildHandoff(referral, docs, docFlags, today);
  const list = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

  // Budget: tenants in subsidized housing usually pay 30% of income.
  const income = summary.income.has === "Yes" ? summary.income.monthly : summary.income.has === "No" ? 0 : null;
  const voucher = summary.income.noncash.includes("Section 8 / housing voucher");
  const budget =
    income === null
      ? { monthlyIncome: null, maxRent: null, note: "Income not recorded" }
      : income === 0
        ? { monthlyIncome: 0, maxRent: 0, note: "No income yet: subsidized or PSH units only, where the tenant share starts at $0" }
        : {
            monthlyIncome: income,
            maxRent: Math.floor((income * 0.3) / 5) * 5,
            note: voucher ? "Has a voucher: tenant pays about 30% of income, the voucher covers the rest" : "About 30% of income, the usual tenant share in subsidized housing",
          };

  // Unit needs from the household, the assessment and what the nurse saw.
  const unitNeeds: string[] = [];
  const size = typeof assessment.household_size === "number" ? assessment.household_size : null;
  if (size) unitNeeds.push(size === 1 ? "Studio or 1 bedroom" : `${Math.ceil(size / 2)}+ bedrooms for ${size} people`);
  const access = summary.housing.accessibility;
  if (access) unitNeeds.push(access);
  const device = h.baseline.mobility?.device;
  if (referral.assistive_device === "Yes" || (device && !/^none$/i.test(device))) {
    if (!access || !/ground|elevator/i.test(access)) unitNeeds.push(`Ground floor or elevator (uses ${String(referral.assistive_device_explain ?? device)})`);
  }
  if (summary.housing.barriers.includes("Pets") || /\b(dog|cat|pet)\b/i.test(String(assessment.household_notes ?? ""))) unitNeeds.push("Pet-friendly");
  if (referral.service_animal === "Yes") unitNeeds.push("Service animal (landlord must allow it)");
  if (h.medications.rows.some((m) => m.notes.includes("Refrigerate unopened"))) unitNeeds.push("Refrigerator for insulin or other medications");
  if (summary.housing.area) unitNeeds.push(`Area: ${summary.housing.area}`);
  if (summary.client.language && !/^english$/i.test(summary.client.language)) unitNeeds.push(`Prefers ${summary.client.language}; ask for a property contact who speaks it`);

  const barriers = summary.housing.barriers.map((b) => ({ barrier: b, approach: APPROACH[b] ?? "Discuss with the care team" }));

  // Documents housing applications and PSH programs ask for.
  const ids = list(assessment.id_documents);
  const has = (d: string) => ids.includes(d);
  const chronic = summary.homelessness.chronic.status === "yes";
  const documents: HousingPacket["documents"] = [
    { name: "Photo ID (CA ID or driver's license)", status: has("CA ID or driver's license") ? "have" : "need" },
    { name: "Social Security card", status: has("Social Security card") ? "have" : "need" },
    { name: "Birth certificate", status: has("Birth certificate") ? "have" : "need" },
    {
      name: "Proof of income or benefits",
      status: has("Proof of income") ? "have" : income === 0 ? "check" : "need",
      note: income === 0 ? (summary.income.pending ? `None yet; pending: ${summary.income.pending}` : "No income; get a zero-income statement") : undefined,
    },
    { name: "HMIS consent and CES enrollment", status: assessment.hmis_consent === "Yes" && assessment.ces_enrolled === "Yes" ? "have" : "need" },
    ...(chronic
      ? [
          { name: "Disability verification (PSH)", status: "check" as const, note: "From a licensed provider; the hospital records here can support it" },
          { name: "Homelessness verification (chronic)", status: "check" as const, note: summary.homelessness.chronic.reason },
        ]
      : []),
  ];

  const moveConsiderations: string[] = [];
  if (summary.stay.authorizedThrough) {
    moveConsiderations.push(
      `Recuperative care ends ${summary.stay.authorizedThrough}${summary.stay.daysLeft !== null ? ` (${summary.stay.daysLeft} days)` : ""}; ask about an extension early if no unit is likely by then`,
    );
  }
  if (referral.home_health_ordered === "Yes") moveConsiderations.push("Home health is ordered: give the agency the new address before move-in");
  if (h.situation.wounds && h.situation.wounds !== "None") moveConsiderations.push(`Wound care continues: ${h.situation.wounds}`);
  if (h.medications.rows.length) moveConsiderations.push(`${h.medications.rows.length} medications: move the pharmacy and keep the 30-day supply going`);
  if (summary.health.pcp) moveConsiderations.push(`Primary care: ${summary.health.pcp}; check the commute from each unit`);
  else moveConsiderations.push("No primary care provider yet: pick one near the new unit");
  for (const a of h.alerts.filter((a) => /behavioral|daily activities|hospice/i.test(a.label))) moveConsiderations.push(`${a.label}${a.detail ? `: ${a.detail}` : ""}`);

  return { summary, budget, unitNeeds, barriers, documents, moveConsiderations, livingGoals: livingGoals(referral, assessment, summary, h) };
}

/** Suggested independent living goals, from what the records and assessment show; at least three. */
function livingGoals(referral: FormData, a: FormData, s: HousingSummary, h: ReturnType<typeof buildHandoff>): string[] {
  const goals: string[] = [];
  const add = (g: string) => !goals.includes(g) && goals.push(g);
  const forgetful = Array.isArray(referral.behavioral_flags) && referral.behavioral_flags.includes("Forgetful");
  if (forgetful || h.medications.rows.length >= 4 || referral.insulin === "Yes") add("Medication management: takes medications on schedule using a pill organizer or reminders");
  if (referral.insulin === "Yes" || referral.diabetes === "Yes") add("Diabetes self-care: checks blood sugar and plans meals within a food budget");
  if (s.income.has === "Yes" || s.income.pending) add("Budgeting: pays rent on time and keeps a monthly budget");
  else add("Income: completes the benefits application and keeps every appointment it needs");
  if (s.stay.diagnoses.length || !s.health.pcp) add("Health appointments: books and attends primary care visits on their own");
  if (Array.isArray(a.services_needed) && a.services_needed.includes("Transportation")) add("Transportation: plans trips by bus or Medi-Cal transportation");
  add("Household upkeep: keeps the unit clean and safe for inspections");
  add("Tenancy: knows the lease rules and how to raise a problem with the landlord");
  return goals.slice(0, Math.max(3, Math.min(goals.length, 5)));
}
