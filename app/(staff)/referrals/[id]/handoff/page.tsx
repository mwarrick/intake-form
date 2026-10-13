import { notFound } from "next/navigation";
import { HandoffView } from "@/components/HandoffView";
import { requireUser } from "@/lib/auth";
import { getAssessment, getReferral } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export default async function HandoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/referrals/${id}/handoff`);
  const [found, assessment] = await Promise.all([getReferral(id), getAssessment(id)]);
  if (!found) notFound();
  return <HandoffView {...found} assessment={assessment?.status} />;
}
