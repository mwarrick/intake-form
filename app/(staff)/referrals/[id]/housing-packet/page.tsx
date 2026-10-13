import { notFound, redirect } from "next/navigation";
import { HousingPacketView } from "@/components/HousingPacketView";
import { requireUser } from "@/lib/auth";
import { getAssessment, getReferral } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export default async function HousingPacketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/referrals/${id}/housing-packet`);
  const [found, assessment] = await Promise.all([getReferral(id), getAssessment(id)]);
  if (!found) notFound();
  if (!assessment) redirect(`/referrals/${id}/assessment`);
  return <HousingPacketView referral={found.referral} supporting={found.supporting} assessment={assessment} />;
}
