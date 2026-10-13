import type { Assessment } from "@/lib/assessment";
import { addDays, localDate, type MetricReferral } from "@/lib/metrics";

/**
 * Records that would fail a contract or grant report, limited to what intake and the handoffs capture: the
 * decision, the authorization and admission, documents and conflicts left at approval, and the housing assessment's
 * HMIS consent. Each issue says where it gets fixed. Plain code over stored rows.
 */
export type IssueType =
  | "no_denial_category"
  | "no_auth_number"
  | "no_admission_date"
  | "no_authorized_days"
  | "approved_missing_document"
  | "approved_with_conflict"
  | "assessment_not_started"
  | "assessment_draft"
  | "no_hmis_consent";

export interface Issue {
  type: IssueType;
  referralId: string;
  patient: string | null;
  hospital: string | null;
  received: string;
  detail?: string;
  /** Page where it gets fixed. */
  fix: "review" | "assessment";
}

export const ISSUE_TYPES: Record<IssueType, { label: string; why: string; fix: Issue["fix"] }> = {
  no_denial_category: { label: "Denied with no denial category", why: "Denials can't be counted by reason", fix: "review" },
  no_auth_number: { label: "Approved with no authorization number", why: "Billing and payer reports need it", fix: "review" },
  no_admission_date: { label: "Approved with no admission date", why: "Capacity and length of stay can't be worked out", fix: "review" },
  no_authorized_days: { label: "Approved with no authorized days", why: "The stay's end date is unknown", fix: "review" },
  approved_missing_document: { label: "Approved with a required document missing", why: "The file is incomplete for audit", fix: "review" },
  approved_with_conflict: { label: "Approved with records that conflict with the form", why: "The form may be wrong in reports", fix: "review" },
  assessment_not_started: { label: "Housing assessment not started a week after admission", why: "No HMIS intake for the client", fix: "assessment" },
  assessment_draft: { label: "Housing assessment still a draft a week after admission", why: "HMIS answers are incomplete", fix: "assessment" },
  no_hmis_consent: { label: "HMIS consent not signed", why: "The client can't be entered in HMIS or counted", fix: "assessment" },
};

export interface DataQuality {
  issues: Issue[];
  /** Records with at least one issue. */
  records: number;
  /** Decisions made before decision times were kept: counted as untimed in reports, nothing to fix. */
  untimed: number;
}

export function findDataIssues(
  referrals: MetricReferral[],
  assessments: Pick<Assessment, "referral_id" | "status" | "data">[],
  today = localDate(new Date()),
): DataQuality {
  const byReferral = new Map(assessments.map((a) => [a.referral_id, a]));
  const issues: Issue[] = [];
  let untimed = 0;

  for (const r of referrals) {
    if (r.status === "draft" || r.status === "processing") continue;
    const add = (type: IssueType, detail?: string) =>
      issues.push({ type, referralId: r.id, patient: r.patient_name ?? null, hospital: r.referring_hospital, received: r.created_at, detail, fix: ISSUE_TYPES[type].fix });
    const d = r.data;
    const has = (id: string) => d[id] !== null && d[id] !== undefined && d[id] !== "";

    if ((r.status === "approved" || r.status === "denied") && !r.decided_at) untimed++;
    if (r.status === "denied" && !has("denial_category")) add("no_denial_category");
    if (r.status !== "approved") continue;

    if (!has("authorization_number")) add("no_auth_number");
    if (!has("admission_date")) add("no_admission_date");
    else if (typeof d.los_authorized_days !== "number") add("no_authorized_days");
    for (const f of r.doc_flags) {
      if (f.kind === "document" && f.message.startsWith("Missing: ")) add("approved_missing_document", f.message.replace("Missing: ", ""));
      if (f.kind === "conflict") add("approved_with_conflict", f.message);
    }

    // Housing assessment, once the patient has been in for a week.
    const admitted = typeof d.admission_date === "string" ? d.admission_date : null;
    if (!admitted || addDays(admitted, 7) > today) continue;
    const a = byReferral.get(r.id);
    if (!a) add("assessment_not_started", `Admitted ${admitted}`);
    else if (a.status === "draft") add("assessment_draft", `Admitted ${admitted}`);
    else if (a.data.hmis_consent !== "Yes") add("no_hmis_consent");
  }

  return { issues, records: new Set(issues.map((i) => i.referralId)).size, untimed };
}
