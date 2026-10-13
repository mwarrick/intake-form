import { type Field, type FormData, type Section, emptyData, isEmpty, isRequired, isVisible, normalize } from "@/lib/form";

/**
 * Housing & Services Assessment, filled by the Care Coordinator during the recuperative care stay to plan the
 * move to housing. Its questions follow the HUD HMIS universal data elements (prior living situation, homeless
 * history, disabling condition, income and benefits, health insurance) plus the service plan.
 * Uses the same field definitions as the referral form, so the same inputs render it.
 */
export const assessmentSections: Section[] = [
  {
    id: "contact",
    label: "Client contact",
    fields: [
      { id: "preferred_name", label: "Preferred name", type: "text" },
      { id: "client_phone", label: "Phone", type: "phone" },
      { id: "contact_method", label: "Best way to reach", type: "single_choice", options: ["Phone", "Text", "Email", "Through program staff"] },
      { id: "veteran_status", label: "Veteran status", type: "single_choice", required: true, options: ["Yes", "No", "Client doesn't know", "Client refused"] },
      { id: "household_size", label: "Household size (including client)", type: "integer", required: true },
      { id: "household_notes", label: "Household members / pets", type: "text" },
    ],
  },
  {
    id: "homeless_history",
    label: "Living situation and homeless history (HMIS)",
    fields: [
      {
        id: "prior_living_situation",
        label: "Prior living situation (before the hospital)",
        type: "single_choice",
        required: true,
        options: [
          "Place not meant for habitation (street, car, encampment)",
          "Emergency shelter",
          "Safe haven",
          "Transitional housing",
          "Staying with family or friends",
          "Jail or prison",
          "Rental housing",
          "Other",
        ],
      },
      { id: "length_of_stay_prior", label: "How long there", type: "single_choice", required: true, options: ["Under 1 week", "1 week to 1 month", "1 to 3 months", "3 months to 1 year", "1 year or longer"] },
      { id: "homeless_start_date", label: "Date this episode of homelessness started", type: "date", required: true },
      { id: "times_homeless_3yrs", label: "Times homeless in the past 3 years", type: "single_choice", required: true, options: ["One time", "Two times", "Three times", "Four or more times"] },
      { id: "months_homeless_3yrs", label: "Total months homeless in the past 3 years", type: "integer", required: true },
    ],
  },
  {
    id: "disability",
    label: "Health and disabling conditions",
    fields: [
      { id: "disabling_condition", label: "Disabling condition", type: "yes_no", required: true },
      {
        id: "conditions",
        label: "Conditions",
        type: "multi_choice",
        options: ["Physical disability", "Chronic health condition", "Mental health disorder", "Substance use disorder", "Developmental disability", "HIV/AIDS"],
        showWhen: { disabling_condition: "Yes" },
        requiredWhen: { disabling_condition: "Yes" },
      },
      { id: "conditions_explain", label: "Notes on conditions and current treatment", type: "longtext", showWhen: { disabling_condition: "Yes" } },
      { id: "health_insurance", label: "Health insurance", type: "text", required: true },
      { id: "has_pcp", label: "Has a primary care provider", type: "yes_no", required: true },
      { id: "pcp_name", label: "Primary care provider / clinic", type: "text", showWhen: { has_pcp: "Yes" }, requiredWhen: { has_pcp: "Yes" } },
      { id: "pcp_phone", label: "PCP phone", type: "phone", showWhen: { has_pcp: "Yes" } },
    ],
  },
  {
    id: "income",
    label: "Income, benefits and documents",
    fields: [
      { id: "has_income", label: "Any income from any source", type: "yes_no", required: true },
      {
        id: "income_sources",
        label: "Income sources",
        type: "multi_choice",
        options: ["Earned income", "SSI", "SSDI", "VA disability", "Unemployment", "General Relief", "Pension / retirement", "Other"],
        showWhen: { has_income: "Yes" },
        requiredWhen: { has_income: "Yes" },
      },
      { id: "monthly_income", label: "Total monthly income ($)", type: "integer", showWhen: { has_income: "Yes" }, requiredWhen: { has_income: "Yes" } },
      { id: "noncash_benefits", label: "Non-cash benefits", type: "multi_choice", options: ["CalFresh (SNAP)", "WIC", "Section 8 / housing voucher", "Medi-Cal transportation", "None"] },
      { id: "benefits_pending", label: "Applications pending (e.g. SSI filed 9/2026)", type: "text" },
      { id: "id_documents", label: "Documents the client has", type: "multi_choice", options: ["CA ID or driver's license", "Social Security card", "Birth certificate", "Proof of income", "None"] },
    ],
  },
  {
    id: "housing_plan",
    label: "Housing plan",
    fields: [
      {
        id: "housing_goal",
        label: "Housing goal",
        type: "single_choice",
        required: true,
        options: ["Permanent supportive housing", "Rapid rehousing", "Board and care", "Sober living", "Family reunification", "Market-rate rental", "Other"],
      },
      { id: "ces_enrolled", label: "Enrolled in Coordinated Entry (CES)", type: "yes_no", required: true },
      { id: "ces_score", label: "CES assessment score / priority", type: "text", showWhen: { ces_enrolled: "Yes" } },
      {
        id: "housing_barriers",
        label: "Barriers to housing",
        type: "multi_choice",
        options: ["No income", "Missing ID documents", "Eviction history", "Criminal record", "Poor or no credit", "Pets", "Accessibility needs", "Active substance use", "Registered sex offender"],
      },
      { id: "accessibility_needs", label: "Accessibility needs (ground floor, grab bars, wheelchair…)", type: "text" },
      { id: "preferred_area", label: "Preferred area / city", type: "text" },
    ],
  },
  {
    id: "services",
    label: "Services and goals",
    fields: [
      {
        id: "services_needed",
        label: "Services needed",
        type: "multi_choice",
        required: true,
        options: ["Benefits enrollment", "Mental health services", "Substance use treatment", "Employment / job search", "Transportation", "Food assistance", "Life skills", "Legal aid", "Primary care connection", "Home health"],
      },
      { id: "client_goals", label: "Client's goals, in their words", type: "longtext", required: true },
      { id: "strengths", label: "Strengths and supports", type: "longtext" },
      { id: "hmis_consent", label: "Consent to share information in HMIS signed", type: "yes_no", required: true },
      { id: "roi_signed", label: "Release of information for providers signed", type: "yes_no", required: true },
    ],
  },
  {
    id: "staff",
    label: "Care Coordinator",
    fields: [
      { id: "assessed_by", label: "Assessed by", type: "text", required: true },
      { id: "assessment_date", label: "Assessment date", type: "date", required: true },
      { id: "next_review_date", label: "Next service plan review", type: "date" },
    ],
  },
];

export const assessmentFields: Field[] = assessmentSections.flatMap((s) => s.fields);

export interface Assessment {
  id: string;
  referral_id: string;
  status: "draft" | "complete";
  data: FormData;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/** Start an assessment from what the referral already says, so the coordinator confirms rather than re-asks. */
export function prefillAssessment(
  referral: FormData,
  docData: { insurance?: string | null; phone?: string | null; substanceUse?: string | null } = {},
): FormData {
  const out = emptyData(assessmentFields);
  const has = (id: string, opt: string) => Array.isArray(referral[id]) && (referral[id] as string[]).includes(opt);
  if (has("housing_situation", "4+ episodes of homelessness in the past 3 years")) out.times_homeless_3yrs = "Four or more times";
  out.health_insurance = docData.insurance ?? (typeof referral.insurance === "string" ? referral.insurance : null);
  out.client_phone = docData.phone ?? null;

  const conditions: string[] = [];
  if (referral.assistive_device === "Yes" || referral.ambulatory === "No") conditions.push("Physical disability");
  if (referral.diabetes === "Yes" || referral.o2 === "Yes") conditions.push("Chronic health condition");
  if (has("behavioral_flags", "Mental Health DX")) conditions.push("Mental health disorder");
  if (docData.substanceUse && !/^(no\b|none|denies)/i.test(docData.substanceUse)) conditions.push("Substance use disorder");
  if (conditions.length) {
    out.disabling_condition = "Yes";
    out.conditions = conditions;
  }
  if (typeof referral.mental_health_dx_type === "string") out.conditions_explain = referral.mental_health_dx_type;
  return out;
}

/** Required answers still missing, by label. A draft can be saved with gaps; completing needs none. */
export function assessmentGaps(data: FormData): string[] {
  return assessmentFields.filter((f) => isVisible(f, data) && isRequired(f, data) && isEmpty(data[f.id])).map((f) => f.label);
}

export function normalizeAssessment(data: Record<string, unknown>): FormData {
  return normalize(data, assessmentFields);
}
