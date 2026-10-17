import { DashboardView } from "@/components/DashboardView";
import { requireAdmin } from "@/lib/auth";
import { addDays, computeMetrics, localDate } from "@/lib/metrics";
import { loadMetricsData } from "@/lib/referrals";

export const dynamic = "force-dynamic";

/** Program dashboard for leadership. Admin only: the first page restricted by role. */
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin("/dashboard");
  const { range = "90" } = await searchParams;
  const { referrals, assessments, docs } = await loadMetricsData();
  const today = localDate(new Date());
  const earliest = referrals.reduce((min, r) => (localDate(r.created_at) < min ? localDate(r.created_at) : min), today);
  const from = range === "all" ? earliest : addDays(today, -(range === "30" ? 29 : 89));
  const m = computeMetrics(referrals, assessments, docs, { from, to: today }, today);
  return <DashboardView m={m} range={range === "30" || range === "all" ? range : "90"} />;
}
