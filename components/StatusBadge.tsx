import type { Status } from "@/lib/referrals";

const STYLES: Record<Status, [string, string]> = {
  draft: ["Draft", "bg-slate-100 text-slate-600"],
  processing: ["Reading…", "bg-sky-100 text-sky-800"],
  needs_review: ["Needs review", "bg-amber-100 text-amber-800"],
  reviewed: ["Reviewed", "bg-slate-200 text-slate-700"],
  approved: ["Approved", "bg-emerald-100 text-emerald-800"],
  denied: ["Denied", "bg-red-100 text-red-800"],
  withdrawn: ["Withdrawn", "bg-violet-100 text-violet-800"],
  failed: ["Read failed", "bg-red-100 text-red-800"],
};

export function StatusBadge({ status }: { status: Status }) {
  const [label, cls] = STYLES[status] ?? [status, "bg-slate-100 text-slate-700"];
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
