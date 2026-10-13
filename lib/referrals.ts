import "server-only";
import type { FormData } from "@/lib/form";
import type { Extraction, Flag } from "@/lib/validate";
import type { Assessment } from "@/lib/assessment";
import type { SupportingDoc } from "@/lib/documents";
import type { PipelineResult } from "@/lib/extract";
import { loadSupporting } from "@/lib/extract-docs";
import type { MetricReferral } from "@/lib/metrics";
import { T, db, signedUrls } from "@/lib/supabase";

export type Status = "draft" | "processing" | "needs_review" | "reviewed" | "approved" | "denied" | "failed";

export interface Referral {
  id: string;
  created_at: string;
  updated_at: string;
  source: "scan" | "portal";
  status: Status;
  patient_name: string | null;
  referring_hospital: string | null;
  data: FormData;
  extraction: Extraction;
  flags: Flag[];
  /** Supporting documents vs. the form and admission criteria (lib/crosscheck.ts). */
  doc_flags: Flag[];
  pipeline: Partial<PipelineResult["pipeline"]>;
  error: string | null;
  reviewed_at: string | null;
  /** When the approve/deny decision was recorded; null for undecided referrals and decisions made before it was kept. */
  decided_at: string | null;
}

export interface DocumentRow {
  id: string;
  referral_id: string;
  kind: "page" | "original" | "attachment";
  page_number: number | null;
  label: string | null;
  file_name: string | null;
  mime_type: string | null;
  storage_path: string;
  url?: string;
}

export async function listReferrals(): Promise<Referral[]> {
  const { data, error } = await db()
    .from(T.referrals)
    .select("id, created_at, updated_at, source, status, patient_name, referring_hospital, flags, doc_flags, error, reviewed_at")
    // Referrers' unsubmitted portal uploads (drafts, or still being read) aren't the coordinator's yet.
    .neq("status", "draft")
    .or("source.eq.scan,status.neq.processing")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data as Referral[];
}

/** Approved referrals, for the admissions list: soonest admission first, then those with no date set yet. */
export async function listAdmissions(): Promise<Referral[]> {
  const { data, error } = await db()
    .from(T.referrals)
    .select("id, created_at, updated_at, source, status, patient_name, referring_hospital, data, flags, doc_flags, reviewed_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  const date = (r: Referral) => (typeof r.data.admission_date === "string" ? r.data.admission_date : "9999");
  return (data as Referral[]).sort((a, b) => date(a).localeCompare(date(b)));
}

/** For each referral, whether a given checklist document was received: "done", "processing" or "failed" (read failed but received). */
export async function docStatuses(referralIds: string[], docType: string): Promise<Map<string, SupportingDoc["status"]>> {
  if (!referralIds.length) return new Map();
  const { data, error } = await db().from(T.supporting).select("referral_id, status").eq("doc_type", docType).in("referral_id", referralIds);
  if (error) throw new Error(error.message);
  const rank = { done: 2, processing: 1, failed: 0 } as const;
  const out = new Map<string, SupportingDoc["status"]>();
  for (const r of data ?? []) {
    const s = r.status as SupportingDoc["status"];
    const prev = out.get(r.referral_id as string);
    if (!prev || rank[s] > rank[prev]) out.set(r.referral_id as string, s);
  }
  return out;
}

export async function getReferral(
  id: string,
): Promise<{ referral: Referral; documents: DocumentRow[]; supporting: SupportingDoc[] } | null> {
  const { data: referral, error } = await db().from(T.referrals).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!referral) return null;

  const { data: docs, error: docErr } = await db()
    .from(T.documents)
    .select("*")
    .eq("referral_id", id)
    .order("kind")
    .order("page_number", { ascending: true, nullsFirst: false });
  if (docErr) throw new Error(docErr.message);

  const urls = await signedUrls((docs ?? []).map((d) => d.storage_path));
  const documents = (docs ?? []).map((d) => ({ ...d, url: urls.get(d.storage_path) })) as DocumentRow[];
  return { referral: referral as Referral, documents, supporting: await loadSupporting(id) };
}

export async function getAssessment(referralId: string): Promise<Assessment | null> {
  const { data, error } = await db().from(T.assessments).select("*").eq("referral_id", referralId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Assessment | null;
}

/** Assessment status for each referral, for lists. */
export async function assessmentStatuses(referralIds: string[]): Promise<Map<string, Assessment["status"]>> {
  if (!referralIds.length) return new Map();
  const { data, error } = await db().from(T.assessments).select("referral_id, status").in("referral_id", referralIds);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r) => [r.referral_id as string, r.status as Assessment["status"]]));
}

export function summaryColumns(data: FormData) {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return { patient_name: str(data.patient_name), referring_hospital: str(data.referring_hospital) };
}

/** Everything the program dashboard counts: referrals (no drafts), assessments, and medication lists for acuity. */
export async function loadMetricsData(): Promise<{
  referrals: MetricReferral[];
  assessments: Pick<Assessment, "referral_id" | "status" | "data" | "completed_at">[];
  docs: Map<string, SupportingDoc[]>;
}> {
  const [refs, asmts, meds] = await Promise.all([
    db()
      .from(T.referrals)
      .select("id, created_at, status, source, referring_hospital, patient_name, data, doc_flags, decided_at")
      .not("status", "in", "(draft,processing)")
      .order("created_at", { ascending: false })
      .limit(5000),
    db().from(T.assessments).select("referral_id, status, data, completed_at").limit(5000),
    db().from(T.supporting).select("id, referral_id, doc_type, label, document_id, pages, status, data, error").eq("doc_type", "medications").eq("status", "done").limit(5000),
  ]);
  for (const r of [refs, asmts, meds]) if (r.error) throw new Error(r.error.message);
  const docs = new Map<string, SupportingDoc[]>();
  for (const d of meds.data ?? []) docs.set(d.referral_id, [...(docs.get(d.referral_id) ?? []), d as SupportingDoc]);
  return { referrals: (refs.data ?? []) as MetricReferral[], assessments: asmts.data ?? [], docs };
}
