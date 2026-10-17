import "server-only";
import type { FormData } from "@/lib/form";
import type { Extraction, Flag } from "@/lib/validate";
import type { PipelineResult } from "@/lib/extract";
import { T, db, signedUrls } from "@/lib/supabase";

export type Status = "processing" | "needs_review" | "reviewed" | "approved" | "denied" | "failed";

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
  pipeline: Partial<PipelineResult["pipeline"]>;
  error: string | null;
  reviewed_at: string | null;
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
    .select("id, created_at, updated_at, source, status, patient_name, referring_hospital, flags, error, reviewed_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data as Referral[];
}

export async function getReferral(id: string): Promise<{ referral: Referral; documents: DocumentRow[] } | null> {
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
  return { referral: referral as Referral, documents };
}

export function summaryColumns(data: FormData) {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return { patient_name: str(data.patient_name), referring_hospital: str(data.referring_hospital) };
}
