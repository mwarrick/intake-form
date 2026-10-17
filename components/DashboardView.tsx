import Link from "next/link";
import { BarList, DecisionTrend, WeeklyStack } from "@/components/Charts";
import type { Metrics } from "@/lib/metrics";

const RANGES = [
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const share = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");

/** Leadership view across all referrals: totals only, no patient names. */
export function DashboardView({ m, range, toFix }: { m: Metrics; range: string; toFix?: number }) {
  const t = m.totals;
  const hs = m.housing;
  const st = m.stays;
  const wd = m.withdrawals;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-900">Program dashboard</h1>
          <p className="text-sm text-slate-600">
            Referrals received {m.range.from} to {m.range.to}. Totals only; capacity is as of today.
          </p>
          {toFix ? (
            <p className="mt-1 text-sm">
              <Link href="/data-to-fix" className="font-medium text-amber-700 hover:underline">
                {toFix} record{toFix === 1 ? "" : "s"} need fixing before reporting →
              </Link>
            </p>
          ) : null}
        </div>
        <nav className="flex gap-1 rounded-md border border-slate-200 bg-white p-1 text-sm" aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard?range=${r.id}`}
              scroll={false}
              className={`rounded px-2.5 py-1 ${range === r.id ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              aria-current={range === r.id ? "page" : undefined}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Tile label="Referrals received" value={t.received} note={`${t.scans} by fax, ${t.received - t.scans} online`} />
        <Tile label="Approval rate" value={pct(t.approvalRate)} note={`${t.approved} approved, ${t.denied} denied`} />
        <Tile
          label="Decided within 2 hours"
          value={pct(t.within2h)}
          note={t.untimed ? `${t.untimed} decided before times were kept` : "Two-hour promise"}
          tone={t.within2h === null ? undefined : t.within2h >= 0.9 ? "good" : t.within2h >= 0.75 ? "warn" : "bad"}
        />
        <Tile label="Median time to decision" value={t.medianMinutes === null ? "—" : `${t.medianMinutes} min`} note={`${t.pending} awaiting a decision`} />
        <Tile label="In recuperative care" value={m.capacity.inCare} note={`${m.capacity.arrivingNext7} arriving in 7 days`} />
        <Tile label="Stays ending in 7 days" value={m.capacity.endingNext7} note={m.capacity.avgDaysAuthorized ? `${m.capacity.avgDaysAuthorized} days authorized on average` : ""} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Referrals per week" note="By outcome">
          <WeeklyStack weeks={m.weekly} />
        </Card>
        <Card title="Time to decision" note="Median minutes, by week received">
          <DecisionTrend weeks={m.weekly} />
        </Card>
      </div>

      <Card title="Withdrawn referrals" note="Patients IHH didn't get to serve: left the hospital AMA, went elsewhere, or the hospital took the referral back">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Mini label="Withdrawn" value={pct(wd.rate)} note={`${wd.count} of ${t.received} referrals`} />
            <Mini label="Before a decision" value={String(wd.beforeDecision)} note="gone before IHH answered" />
            <Mini label="Left AMA" value={String(wd.leftAma)} note="against medical advice" />
            <Mini label="After approval" value={String(wd.afterApproval)} note="approved, never arrived" />
            <Mini label="Median time to withdrawal" value={wd.medianHours === null ? "—" : `${wd.medianHours} h`} note="from referral received" />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Why</p>
            <BarList items={wd.reasons} total={wd.count} empty="No withdrawals in this range." />
          </div>
        </div>
      </Card>

      <Card title="Referral sources" note="Where packets come in incomplete or contradicting the form">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1.5 pr-3 font-medium">Hospital</th>
                <th className="py-1.5 pr-3 text-right font-medium">Referrals</th>
                <th className="py-1.5 pr-3 text-right font-medium">Approved</th>
                <th className="py-1.5 pr-3 text-right font-medium">Missing documents</th>
                <th className="py-1.5 pr-3 text-right font-medium">Records conflict</th>
                <th className="py-1.5 text-right font-medium">Median decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {m.hospitals.map((h) => (
                <tr key={h.hospital}>
                  <td className="py-1.5 pr-3">{h.hospital}</td>
                  <td className="py-1.5 pr-3 text-right">{h.referrals}</td>
                  <td className="py-1.5 pr-3 text-right">{pct(h.approvalRate)}</td>
                  <td className={`py-1.5 pr-3 text-right ${h.missingDocs >= 0.4 ? "font-medium text-red-700" : ""}`}>{pct(h.missingDocs)}</td>
                  <td className={`py-1.5 pr-3 text-right ${h.conflicts >= 0.25 ? "font-medium text-red-700" : ""}`}>{pct(h.conflicts)}</td>
                  <td className="py-1.5 text-right">{h.medianMinutes === null ? "—" : `${h.medianMinutes} min`}</td>
                </tr>
              ))}
              {!m.hospitals.length && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-500">No referrals in this range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Why referrals are denied" note={`${t.denied} denied, by category`}>
          <BarList items={m.denials} total={t.denied} empty="No denials in this range." />
        </Card>
        <Card title="Admission criteria not met" note="Found in the records, all referrals">
          <BarList items={m.criteria} total={t.received} empty="No criteria flags in this range." />
        </Card>
      </div>

      <Card title="Stays" note="Approved patients in this range; length of stay from admission to exit">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Mini label="Exited" value={String(st.exited)} note="with an exit date" />
            <Mini label="Median length of stay" value={st.medianLos === null ? "—" : `${st.medianLos} days`} note={st.avgLos === null ? "" : `${st.avgLos} days on average`} />
            <Mini label="Left early" value={share(st.leftEarly, st.exited)} note={`${st.leftEarly} before the authorized end`} />
            <Mini label="Extension requested" value={share(st.extended, st.extensionAsked)} note={`${st.extended} of ${st.extensionAsked} answered`} />
            <Mini label="No exit recorded" value={String(st.noExit)} note="past the authorized end, no extension" />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Length of stay</p>
            <BarList items={st.exited ? st.los : []} total={st.exited} empty="No exits in this range." />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Acuity of approved patients" note="For staffing and supplies">
          <BarList items={m.acuity.filter((a) => a.of).map((a) => ({ label: a.label === "Controlled medication" ? `Controlled medication (of ${a.of} with a med list)` : a.label, count: a.count }))} total={t.approved} />
          <p className="mt-2 text-xs text-slate-500">Percentages are of approved patients; controlled medication only counts patients whose medication list was read.</p>
        </Card>
        <Card title="Housing progress" note="Approved patients admitted at least a week ago">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="Assessment started" value={share(hs.assessed, hs.admitted)} note={`${hs.assessed} of ${hs.admitted}`} />
            <Mini label="Completed in first week" value={share(hs.completeWithin7, hs.complete)} note={`of ${hs.complete} complete`} />
            <Mini label="Chronically homeless" value={share(hs.chronic, hs.complete)} note="of completed" />
            <Mini label="Ready for HMIS" value={share(hs.hmisReady, hs.complete)} note="of completed" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Top barriers</p>
              <BarList items={hs.barriers.slice(0, 5)} total={hs.complete} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Top services needed</p>
              <BarList items={hs.services.slice(0, 5)} total={hs.complete} />
            </div>
          </div>
        </Card>
      </div>

      <p className="text-xs text-slate-400">
        Not shown yet: arrivals and no-shows, where people went after exit, hospital returns, ECM enrollment. See docs/FUTURE.md.
      </p>
    </div>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string | number; note?: string; tone?: "good" | "warn" | "bad" }) {
  const toneText = { good: "On target", warn: "Below target", bad: "Well below target" };
  const toneClass = { good: "text-emerald-700", warn: "text-amber-700", bad: "text-red-700" };
  return (
    <div className="card p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {tone && <p className={`text-xs font-medium ${toneClass[tone]}`}>{tone === "good" ? "✓" : "!"} {toneText[tone]}</p>}
      {note && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  );
}

function Mini({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{note}</p>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-brand-900">{title}</h2>
        {note && <span className="text-xs text-slate-500">{note}</span>}
      </div>
      {children}
    </section>
  );
}
