/**
 * IHH's admission criteria (`schema/admission-criteria.json`, from the Adult Recuperative Care Admission
 * Criteria and Eligibility Outline, with rule IDs added by the event organizers) and what the app makes of
 * a check against them. The outline wins over the referral form's shorter list; form rules it supersedes
 * are left out. Plain code: the model only judges each rule (lib/criteria-check.ts).
 */
import source from "@/schema/admission-criteria.json";

export type RuleKind = "must" | "exclude" | "document" | "conditional" | "ask" | "note" | "eligible";

export interface Rule {
  id: string;
  section: string;
  kind: RuleKind;
  text: string;
  /** Always a coordinator's call (e.g. registered sex offender, case by case). */
  humanReview?: boolean;
}

/** What the packet shows for one rule. */
export type Outcome = "ok" | "concern" | "unknown" | "not_applicable";

export interface RuleResult {
  rule_id: string;
  outcome: Outcome;
  /** A short quote from the packet, exactly as written. */
  evidence: string | null;
  pages: number[];
  /** One sentence: why this outcome. */
  note: string;
}

interface SourceRule {
  id: string;
  section?: string;
  kind?: string;
  text: string;
  human_review?: boolean;
  superseded_by?: string;
}

function load(): Rule[] {
  const s = source as unknown as {
    general: { any_of: SourceRule[] };
    rules: SourceRule[];
    by_system: { system: string; eligible: SourceRule[]; ineligible: SourceRule[] }[];
    referral_form_screen: { must_meet_all: SourceRule[]; not_eligible_if: SourceRule[] };
  };
  const rule = (r: SourceRule, section: string, kind: RuleKind): Rule => ({
    id: r.id,
    section,
    kind,
    text: r.text,
    ...(r.human_review ? { humanReview: true } : {}),
  });
  return [
    ...s.general.any_of.map((r) => rule(r, "General", "note")),
    ...s.rules.map((r) => rule(r, r.section ?? "Other", (r.kind ?? "note") as RuleKind)),
    ...s.by_system.flatMap((b) => [
      ...b.eligible.map((r) => rule(r, b.system, "eligible")),
      ...b.ineligible.map((r) => rule(r, b.system, "exclude")),
    ]),
    // The form's rules only where the outline doesn't supersede them (e.g. tuberculosis, refusing detox).
    ...s.referral_form_screen.must_meet_all.filter((r) => !r.superseded_by).map((r) => rule(r, "Referral form", "must")),
    ...s.referral_form_screen.not_eligible_if.filter((r) => !r.superseded_by).map((r) => rule(r, "Referral form", "exclude")),
  ];
}

export const RULES: Rule[] = load();
export const rulesById = new Map(RULES.map((r) => [r.id, r]));

/** Rules checked together in one model call, each with the context the model needs to judge them. */
export const RULE_GROUPS: Record<string, { label: string; rules: string[] }> = {
  mental_health: {
    label: "Mental health and behavior",
    rules: ["MH-1", "MH-2", "MH-3", "MH-4", "MH-5", "OTH-1", "FORM-M2", "FORM-X5", "FORM-X7"],
  },
  infection: {
    label: "Infection and infection control",
    // INT-E1 and INT-E3 are here so a skin infection is judged by the outline, not as an uncleared MRSA/TB/C. diff.
    rules: ["INF-1", "INF-2", "ID-1", "ID-2", "ID-3", "ID-Q1", "ID-Q2", "ID-Q3", "OTH-3", "OTH-4", "FORM-X4", "GI-X3", "INT-E1", "INT-E3"],
  },
  function: {
    label: "Cognition, ADLs and mobility",
    rules: [
      "COG-1", "COG-2", "FORM-M3", "FORM-M5", "FORM-X1", "NEU-X5", "NEU-X3",
      "ADL-1", "ADL-2", "ADL-3", "FORM-M4", "FORM-X2",
      "MOB-1", "MOB-2", "MOB-3", "MOB-4", "NEU-X1",
    ],
  },
  diabetes: {
    label: "Diabetes and endocrine",
    rules: [
      "DM-1", "DM-2", "DM-3", "DM-4", "DM-5", "DM-6", "DM-Q1", "DM-Q2", "DM-Q3",
      "END-E1", "END-E2", "END-E3", "END-X1", "END-X2", "END-X3",
    ],
  },
  cardiac: {
    label: "Cardiac and circulatory",
    rules: [
      "CARD-1", "CARD-2", "CARD-3", "CARD-4", "CARD-5", "CARD-6",
      "CIR-E1", "CIR-E2", "CIR-E3", "CIR-E4", "CIR-E5", "CIR-E6", "CIR-E7", "CIR-X1", "CIR-X2",
    ],
  },
  respiratory: {
    label: "Respiratory",
    rules: [
      "RESP-1", "RESP-2", "RESP-3", "RESP-4", "RESP-Q1", "RESP-Q2",
      "RSP-E1", "RSP-E2", "RSP-E3", "RSP-E4", "RSP-E5", "RSP-E6", "RSP-E7",
      "RSP-X1", "RSP-X2", "RSP-X3", "RSP-X4", "RSP-X5",
    ],
  },
  wounds_bones: {
    label: "Wounds, bones and joints",
    rules: [
      "INT-E2", "INT-E4", "INT-E5", "INT-E6", "INT-E7", "INT-X1", "INT-X2", "INT-X3",
      "MSK-E1", "MSK-E2", "MSK-E3", "MSK-E4", "MSK-X1", "MSK-X2", "MSK-X3", "MSK-X4", "MSK-X5",
    ],
  },
  neuro_gi: {
    label: "Neurology and GI",
    rules: [
      "NEU-E1", "NEU-E2", "NEU-E3", "NEU-E4", "NEU-X2", "NEU-X4", "NEU-X6",
      "GI-E1", "GI-E2", "GI-E3", "GI-E4", "GI-E5", "GI-E6", "GI-E7", "GI-X1", "GI-X2",
    ],
  },
  urinary_eyes: {
    label: "Kidney, urinary and eyes",
    rules: [
      "GU-E1", "GU-E2", "GU-E3", "GU-E4", "GU-E5", "GU-E6", "GU-E7", "GU-X1",
      "OPH-E1", "OPH-E2", "OPH-E3", "OPH-E4", "OPH-E5", "OPH-E6", "OPH-E7",
    ],
  },
  general: {
    label: "Eligibility, hospice and case by case",
    rules: ["GEN-1", "GEN-2", "GEN-3", "FORM-M1", "EOL-1", "OTH-2"],
  },
};

/** A referral's criteria check, stored in its `criteria` column. */
export interface CriteriaCheck {
  status: "running" | "done" | "failed";
  startedAt: string;
  finishedAt?: string;
  /** The rule groups checked (keys of RULE_GROUPS). */
  groups: string[];
  results?: RuleResult[];
  model?: string;
  usage?: { step: string; model: string; input_tokens: number; output_tokens: number; ms: number }[];
  error?: string;
}

/** A check still "running" after this long died with its server function; show it as failed so it can be run again. */
export const CRITERIA_STALE_MS = 10 * 60 * 1000;

export interface CriteriaSummary {
  /** The packet shows a problem against the rule, most serious first. Documents are under `request`. */
  concerns: RuleResult[];
  /** Documents IHH asks for (MRSA and COVID swabs, five sets of vitals, PT/OT notes) that the packet lacks or doesn't settle: ask the hospital. */
  request: RuleResult[];
  /** A rule the patient has to meet, or a document IHH needs, that the packet doesn't settle. */
  unknown: RuleResult[];
  /** Rules that are always the coordinator's call, whatever the packet shows. */
  review: RuleResult[];
}

const SEVERITY: Record<RuleKind, number> = { exclude: 0, must: 1, conditional: 2, document: 3, eligible: 4, ask: 5, note: 6 };

/** Sort a check's results into what the coordinator needs to look at. Unknown is never treated as fine. */
export function summarize(results: RuleResult[]): CriteriaSummary {
  const kind = (r: RuleResult) => rulesById.get(r.rule_id)?.kind ?? "note";
  const bySeverity = (a: RuleResult, b: RuleResult) => SEVERITY[kind(a)] - SEVERITY[kind(b)];
  return {
    concerns: results.filter((r) => r.outcome === "concern" && !["ask", "document"].includes(kind(r))).sort(bySeverity),
    request: results.filter((r) => (r.outcome === "concern" || r.outcome === "unknown") && kind(r) === "document"),
    unknown: results.filter((r) => r.outcome === "unknown" && ["must", "conditional", "exclude"].includes(kind(r))).sort(bySeverity),
    review: results.filter((r) => rulesById.get(r.rule_id)?.humanReview),
  };
}
