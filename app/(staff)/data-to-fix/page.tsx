import { DataToFixView } from "@/components/DataToFixView";
import { requireUser } from "@/lib/auth";
import { findDataIssues } from "@/lib/dataquality";
import { localDate } from "@/lib/metrics";
import { loadMetricsData } from "@/lib/referrals";

export const dynamic = "force-dynamic";

/**
 * Records that would fail a contract or grant report, each linked to where it gets fixed. For the Manager of
 * Care Coordination and anyone preparing reports; limited to what intake and the handoffs capture.
 */
export default async function DataToFix({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireUser("/data-to-fix");
  const { type } = await searchParams;
  const { referrals, assessments } = await loadMetricsData();
  return <DataToFixView q={findDataIssues(referrals, assessments, localDate(new Date()))} type={type} />;
}
