import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteReferral } from "@/components/DeleteReferral";
import { StatusBadge } from "@/components/StatusBadge";
import { rereadThreshold } from "@/lib/extract";
import { requireUser } from "@/lib/auth";
import { getReferral } from "@/lib/referrals";
import { ReviewClient } from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/referrals/${id}`);
  const found = await getReferral(id);
  if (!found) notFound();
  const { referral, documents, supporting } = found;
  // A referral with a decision recorded is kept unless an admin deletes it.
  const canDelete = user.role === "admin" || !["approved", "denied"].includes(referral.status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/referrals" className="text-sm text-slate-500 hover:text-brand-700">
          ← Queue
        </Link>
        <h1 className="text-xl font-semibold text-brand-900">{referral.patient_name ?? "Referral"}</h1>
        <StatusBadge status={referral.status} />
        <span className="text-sm text-slate-500">
          {referral.source === "scan" ? "Fax/scan" : "Online"} · received {new Date(referral.created_at).toLocaleString()}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <Link href={`/referrals/${referral.id}/handoff`} className={referral.status === "approved" ? "btn-primary" : "btn-secondary"}>
            Admission summary
          </Link>
          {canDelete && <DeleteReferral id={referral.id} />}
        </span>
      </div>
      <ReviewClient
        key={referral.updated_at}
        referral={referral}
        documents={documents}
        supporting={supporting}
        threshold={rereadThreshold}
      />
    </div>
  );
}
