import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentForm } from "@/components/AssessmentForm";
import { prefillAssessment } from "@/lib/assessment";
import { requireUser } from "@/lib/auth";
import { getAssessment, getReferral } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/referrals/${id}/assessment`);
  const [found, assessment] = await Promise.all([getReferral(id), getAssessment(id)]);
  if (!found) notFound();
  const { referral, supporting } = found;

  const doc = (t: string) => supporting.find((d) => d.doc_type === t && d.status === "done")?.data ?? null;
  const text = (v: unknown) => (typeof v === "string" ? v : null);
  const initial =
    assessment?.data ??
    prefillAssessment(referral.data, {
      insurance: text(doc("demographics")?.insurance),
      phone: text(doc("demographics")?.phone),
      substanceUse: text(doc("history_physical")?.substance_use),
    });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href={`/referrals/${id}/handoff`} className="text-slate-500 hover:text-brand-700">
          ← Admission summary
        </Link>
      </div>
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Housing &amp; Services Assessment</h1>
        <p className="text-sm text-slate-600">
          {referral.patient_name ?? "Client"} · for the Care Coordinator during the recuperative care stay, to plan the move to
          housing. Questions follow the HMIS data elements.{" "}
          {!assessment && "Answers the referral already gave are filled in; confirm them with the client."}
          {assessment?.status === "draft" && "Draft in progress."}
          {assessment?.status === "complete" && `Completed ${new Date(assessment.completed_at!).toLocaleDateString()}.`}
        </p>
      </div>
      <AssessmentForm referralId={id} initial={initial} status={assessment?.status ?? "new"} />
    </div>
  );
}
