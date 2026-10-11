import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { rereadThreshold } from "@/lib/extract";
import { requireUser } from "@/lib/auth";
import { getReferral } from "@/lib/referrals";
import { ReviewClient } from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/referrals/${id}`);
  const found = await getReferral(id);
  if (!found) notFound();
  const { referral, documents, supporting } = found;

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
