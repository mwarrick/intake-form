import Link from "next/link";
import { DateRangePicker } from "@/components/DateRangePicker";
import { StatusBadge, statusLabel } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { addDays, localDate, weekStart } from "@/lib/metrics";
import { type Status, listReferrals, neighborDays, undecidedBefore, withOriginalScan } from "@/lib/referrals";

export const dynamic = "force-dynamic";

const PACIFIC = "America/Los_Angeles";

/** How long ago today's referrals arrived; the time of day for another single day; date and time across a range. */
function received(iso: string, isToday: boolean, isRange: boolean) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (isToday && mins < 60) return `${mins} min ago`;
  if (isToday) return `${Math.floor(mins / 60)} h ${mins % 60} min ago`;
  const opts: Intl.DateTimeFormatOptions = { timeZone: PACIFIC, hour: "numeric", minute: "2-digit" };
  return isRange
    ? new Date(iso).toLocaleString("en-US", { ...opts, month: "short", day: "numeric" })
    : new Date(iso).toLocaleTimeString("en-US", opts);
}

/** "Tuesday, October 14, 2026" for a YYYY-MM-DD day. */
const longDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
const shortDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const spanLabel = (from: string, to: string) => (from === to ? shortDay(from) : `${shortDay(from)} – ${shortDay(to)}`);
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
// Every link names its days; plain /referrals is the default view, which falls back to the latest day with referrals.
// A status filter, when given, rides along so changing days keeps it.
const rangeHref = (from: string, to: string, status?: Status | null) =>
  (from === to ? `/referrals?date=${from}` : `/referrals?from=${from}&to=${to}`) + (status ? `&status=${status}` : "");
/** Queue statuses in the order work moves through them; drafts never reach the queue. */
const FILTER_STATUSES: Status[] = ["needs_review", "reviewed", "approved", "denied", "withdrawn", "processing", "failed"];
/** Preset spans ending no later than today; weeks start Monday, as on the dashboard. */
function quickRanges(today: string) {
  const week = weekStart(today);
  const month = `${today.slice(0, 7)}-01`;
  const lastMonth = `${addDays(month, -1).slice(0, 7)}-01`;
  return [
    { label: "Today", from: today, to: today },
    { label: "This week", from: week, to: today },
    { label: "Last week", from: addDays(week, -7), to: addDays(week, -1) },
    { label: "This month", from: month, to: today },
    { label: "Last month", from: lastMonth, to: addDays(month, -1) },
  ];
}
const validDay =(d: string | undefined, today: string) =>
  d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && d <= today ? d : null;

export default async function Queue({ searchParams }: { searchParams: Promise<{ date?: string; from?: string; to?: string; status?: string }> }) {
  await requireUser("/referrals");
  const params = await searchParams;
  const status = FILTER_STATUSES.find((s) => s === params.status) ?? null;
  const today = localDate(new Date());
  // ?date= is a single day; ?from=&to= a range (either end alone means that one day).
  let from = validDay(params.from, today) ?? validDay(params.to, today) ?? validDay(params.date, today);
  let to = validDay(params.to, today) ?? from;
  if (from && to && from > to) [from, to] = [to, from];
  const chosen = from !== null;
  from ??= today;
  to ??= today;
  let [referrals, { prev, next }] = await Promise.all([listReferrals(from, to), neighborDays(from, to)]);
  // With no day chosen and nothing yet today, show the latest day that has referrals.
  const fellBack = !chosen && referrals.length === 0 && prev !== null;
  if (fellBack) {
    from = to = prev!;
    [referrals, { prev, next }] = await Promise.all([listReferrals(from, to), neighborDays(from, to)]);
  }
  const isRange = from !== to;
  const isToday = !isRange && from === today;
  // Previous and Next keep the range's length and land on the nearest stretch with referrals.
  const len = days(from, to);
  const prevRange = prev && { from: addDays(prev, 1 - len), to: prev };
  const nextRange = next && { from: next, to: addDays(next, len - 1) < today ? addDays(next, len - 1) : today };
  const undecided = await undecidedBefore(from);
  const counts = new Map<Status, number>();
  for (const r of referrals) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  const shown = status ? referrals.filter((r) => r.status === status) : referrals;
  const scanned = await withOriginalScan(shown.map((r) => r.id));
  const href = (f: string, t: string) => rangeHref(f, t, status);
  const unit = isRange ? "range" : "day";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-900">Referral queue</h1>
          <p className="text-sm text-slate-600">Paper and online referrals for the days you choose, newest first. Decisions are due within two hours.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/upload" className="btn-secondary">Upload scan</Link>
          <Link href="/refer" className="btn-secondary">New online referral</Link>
        </div>
      </div>

      <nav aria-label="Choose dates" className="flex flex-wrap items-center gap-2">
        {prevRange ? (
          <Link href={href(prevRange.from, prevRange.to)} className="btn-secondary" title={`Previous ${unit} with referrals`}>
            <span aria-hidden="true">←</span> {spanLabel(prevRange.from, prevRange.to)}
          </Link>
        ) : (
          <span className="btn-secondary cursor-not-allowed opacity-50" aria-disabled="true">
            <span aria-hidden="true">←</span> Previous
          </span>
        )}
        <DateRangePicker from={from} to={to} today={today} status={status} />
        {nextRange ? (
          <Link href={href(nextRange.from, nextRange.to)} className="btn-secondary" title={`Next ${unit} with referrals`}>
            {spanLabel(nextRange.from, nextRange.to)} <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span className="btn-secondary cursor-not-allowed opacity-50" aria-disabled="true">
            Next <span aria-hidden="true">→</span>
          </span>
        )}
        <span className="flex gap-1 rounded-md border border-slate-200 bg-white p-1 text-sm">
          {quickRanges(today).map((q) => {
            const active = from === q.from && to === q.to;
            return (
              <Link
                key={q.label}
                href={href(q.from, q.to)}
                className={`rounded px-2.5 py-1 ${active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                aria-current={active ? "page" : undefined}
              >
                {q.label}
              </Link>
            );
          })}
        </span>
        <h2 className="ml-1 text-sm font-medium text-slate-700" aria-live="polite">
          {isRange ? `${longDay(from)} – ${longDay(to)}` : `${isToday ? "Today, " : ""}${longDay(from)}`}:{" "}
          {status && `${shown.length} ${statusLabel(status).toLowerCase()} of `}
          {referrals.length} referral
          {referrals.length === 1 ? "" : "s"}
          {referrals.length >= 1000 && " (showing the newest 1,000; choose fewer days to see the rest)"}
        </h2>
      </nav>

      <nav aria-label="Filter by status" className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-600">Status</span>
        <span className="flex flex-wrap gap-1 rounded-md border border-slate-200 bg-white p-1">
          {[null, ...FILTER_STATUSES.filter((s) => counts.has(s) || s === status)].map((s) => {
            const active = s === status;
            return (
              <Link
                key={s ?? "all"}
                href={rangeHref(from, to, s)}
                className={`rounded px-2.5 py-1 ${active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                aria-current={active ? "page" : undefined}
              >
                {s ? statusLabel(s) : "All"}{" "}
                <span className={active ? "text-white/80" : "text-slate-400"}>{s ? (counts.get(s) ?? 0) : referrals.length}</span>
              </Link>
            );
          })}
        </span>
      </nav>

      {fellBack && (
        <p className="text-sm text-slate-600">No referrals yet today. Showing {longDay(from)}, the most recent day with referrals.</p>
      )}

      {undecided.length > 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Still undecided from earlier days:{" "}
          {undecided.map((u, i) => (
            <span key={u.day}>
              {i > 0 && ", "}
              <Link href={rangeHref(u.day, u.day)} className="font-medium underline">
                {shortDay(u.day)} ({u.count})
              </Link>
            </span>
          ))}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Received</th>
              <th className="px-4 py-2 font-medium">Patient</th>
              <th className="px-4 py-2 font-medium">Referring hospital</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium" title="The original faxed or scanned referral form, as uploaded">Fax/scan received</th>
              <th className="px-4 py-2 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  {status ? `No ${statusLabel(status).toLowerCase()} referrals` : "No referrals"}{" "}
                  {isRange ? "received on these dates." : "received on this date."}
                </td>
              </tr>
            )}
            {shown.map((r) => {
              const flags = r.flags ?? [];
              const docFlags = r.doc_flags ?? [];
              const elig = new Set([...flags, ...docFlags].filter((f) => f.kind === "eligibility").map((f) => f.message)).size;
              const attention = flags.filter((f) => f.kind !== "eligibility").length;
              const conflicts = docFlags.filter((f) => f.kind === "conflict").length;
              const overdue =
                (r.status === "needs_review" || r.status === "reviewed") &&
                Date.now() - new Date(r.created_at).getTime() > 2 * 3600 * 1000;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    <Link href={`/referrals/${r.id}`} className="block">
                      {received(r.created_at, isToday, isRange)}
                      {overdue && <span className="ml-2 text-xs font-medium text-red-700">over 2 h</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/referrals/${r.id}`} className="text-brand-700 hover:underline">
                      {r.patient_name ?? (r.status === "processing" ? "Reading…" : "Unnamed")}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{r.referring_hospital ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.source === "scan" ? "Fax/scan" : "Online"}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                    <ScanIndicator received={scanned.has(r.id)} online={r.source !== "scan"} />
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {conflicts > 0 && <span className="mr-2 font-medium text-red-700">{conflicts} conflict{conflicts > 1 ? "s" : ""}</span>}
                    {elig > 0 && <span className="mr-2 text-purple-700">{elig} criteria</span>}
                    {attention > 0 && <span className="text-amber-700">{attention} to check</span>}
                    {flags.length + docFlags.length === 0 && r.status !== "processing" && <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Received or missing; shape and word as well as color. Online referrals have no fax, so they show a dash unless one was added. */
function ScanIndicator({ received, online }: { received: boolean; online: boolean }) {
  if (received)
    return (
      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
        <span aria-hidden="true">✓</span> Received
      </span>
    );
  if (online)
    return (
      <span className="text-slate-400" title="Online referral, no fax expected">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not applicable</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 font-medium text-red-700">
      <span aria-hidden="true">✕</span> Missing
    </span>
  );
}
