import Link from "next/link";
import { type DataQuality, ISSUE_TYPES, type IssueType } from "@/lib/dataquality";
import { localDate } from "@/lib/metrics";

const ORDER = Object.keys(ISSUE_TYPES) as IssueType[];

/** The data-to-fix list: counts by issue type (each a filter) and the records, linked to where each gets fixed. */
export function DataToFixView({ q: { issues, records, untimed }, type }: { q: DataQuality; type?: string }) {
  const selected = ORDER.includes(type as IssueType) ? (type as IssueType) : null;
  const counts = ORDER.map((t) => ({ type: t, count: issues.filter((i) => i.type === t).length })).filter((c) => c.count);
  const shown = issues
    .filter((i) => !selected || i.type === selected)
    .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type) || b.received.localeCompare(a.received));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Data to fix</h1>
        <p className="text-sm text-slate-600">
          Records that would fail a contract or grant report. {issues.length} issue{issues.length === 1 ? "" : "s"} on {records} record
          {records === 1 ? "" : "s"}. Each links to the page where it gets fixed.
        </p>
      </div>

      {counts.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((c) => {
            const t = ISSUE_TYPES[c.type];
            const active = selected === c.type;
            return (
              <Link
                key={c.type}
                href={active ? "/data-to-fix" : `/data-to-fix?type=${c.type}`}
                className={`card block p-3 hover:border-brand-500 ${active ? "border-brand-600 ring-2 ring-brand-100" : ""}`}
                aria-current={active ? "true" : undefined}
              >
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{t.label}</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900">{c.count}</span>
                </p>
                <p className="text-xs text-slate-500">{t.why}</p>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="card p-6 text-center text-sm text-slate-600">Nothing to fix. Every record has what the reports need.</p>
      )}

      {shown.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-2">
            <h2 className="text-sm font-semibold text-brand-900">{selected ? ISSUE_TYPES[selected].label : "All issues"}</h2>
            {selected && (
              <Link href="/data-to-fix" className="text-xs text-brand-700 hover:underline">
                Show all
              </Link>
            )}
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Hospital</th>
                <th className="px-4 py-2 font-medium">Received</th>
                {!selected && <th className="px-4 py-2 font-medium">Issue</th>}
                <th className="px-4 py-2 font-medium">Detail</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((i, n) => (
                <tr key={`${i.referralId}-${i.type}-${n}`} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{i.patient ?? "Unnamed"}</td>
                  <td className="px-4 py-2 text-slate-700">{i.hospital ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600">{localDate(i.received)}</td>
                  {!selected && <td className="px-4 py-2 text-slate-700">{ISSUE_TYPES[i.type].label}</td>}
                  <td className="px-4 py-2 text-slate-600">{i.detail ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <Link href={i.fix === "review" ? `/referrals/${i.referralId}` : `/referrals/${i.referralId}/assessment`} className="text-brand-700 hover:underline">
                      {i.fix === "review" ? "Open referral" : "Open assessment"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {untimed > 0 && (
        <p className="text-xs text-slate-500">
          {untimed} decision{untimed === 1 ? " was" : "s were"} made before decision times were kept. They count as untimed in reports;
          there’s nothing to fix.
        </p>
      )}
    </div>
  );
}
