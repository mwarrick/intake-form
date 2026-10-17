import Link from "next/link";
import { DayPicker } from "@/components/DayPicker";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { localDate } from "@/lib/metrics";
import { listReferrals, neighborDays, undecidedBefore, withOriginalScan } from "@/lib/referrals";

export const dynamic = "force-dynamic";

const PACIFIC = "America/Los_Angeles";

/** How long ago today's referrals arrived; the time of day for other days. */
function received(iso: string, isToday: boolean) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (isToday && mins < 60) return `${mins} min ago`;
  if (isToday) return `${Math.floor(mins / 60)} h ${mins % 60} min ago`;
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: PACIFIC, hour: "numeric", minute: "2-digit" });
}

/** "Tuesday, October 14, 2026" for a YYYY-MM-DD day. */
const longDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" });
const shortDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
// Every link names its day; plain /referrals is the default view, which falls back to the latest day with referrals.
const dayHref = (day: string) => `/referrals?date=${day}`;

export default async function Queue({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireUser("/referrals");
  const { date } = await searchParams;
  const today = localDate(new Date());
  const chosen = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && date <= today ? date : null;
  let day = chosen ?? today;
  let [referrals, { prev, next }] = await Promise.all([listReferrals(day), neighborDays(day)]);
  // With no day chosen and nothing yet today, show the latest day that has referrals.
  const fellBack = !chosen && referrals.length === 0 && prev !== null;
  if (fellBack) {
    day = prev!;
    [referrals, { prev, next }] = await Promise.all([listReferrals(day), neighborDays(day)]);
  }
  const isToday = day === today;
  const undecided = await undecidedBefore(day);
  const scanned = await withOriginalScan(referrals.map((r) => r.id));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-900">Referral queue</h1>
          <p className="text-sm text-slate-600">Paper and online referrals for one day, newest first. Decisions are due within two hours.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/upload" className="btn-secondary">Upload scan</Link>
          <Link href="/refer" className="btn-secondary">New online referral</Link>
        </div>
      </div>

      <nav aria-label="Choose a day" className="flex flex-wrap items-center gap-2">
        {prev ? (
          <Link href={dayHref(prev)} className="btn-secondary" title={`Previous day with referrals: ${longDay(prev)}`}>
            <span aria-hidden="true">←</span> {shortDay(prev)}
          </Link>
        ) : (
          <span className="btn-secondary cursor-not-allowed opacity-50" aria-disabled="true">
            <span aria-hidden="true">←</span> Previous
          </span>
        )}
        <DayPicker day={day} today={today} />
        {next ? (
          <Link href={dayHref(next)} className="btn-secondary" title={`Next day with referrals: ${longDay(next)}`}>
            {shortDay(next)} <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span className="btn-secondary cursor-not-allowed opacity-50" aria-disabled="true">
            Next <span aria-hidden="true">→</span>
          </span>
        )}
        {!isToday && (
          <Link href={dayHref(today)} className="btn-secondary">
            Today
          </Link>
        )}
        <h2 className="ml-1 text-sm font-medium text-slate-700" aria-live="polite">
          {isToday ? "Today, " : ""}
          {longDay(day)}: {referrals.length} referral{referrals.length === 1 ? "" : "s"}
        </h2>
      </nav>

      {fellBack && (
        <p className="text-sm text-slate-600">No referrals yet today. Showing {longDay(day)}, the most recent day with referrals.</p>
      )}

      {undecided.length > 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Still undecided from earlier days:{" "}
          {undecided.map((u, i) => (
            <span key={u.day}>
              {i > 0 && ", "}
              <Link href={dayHref(u.day)} className="font-medium underline">
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
            {referrals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No referrals received on this date.
                </td>
              </tr>
            )}
            {referrals.map((r) => {
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
                      {received(r.created_at, isToday)}
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
