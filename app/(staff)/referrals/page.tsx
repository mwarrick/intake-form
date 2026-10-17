import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth";
import { docStatuses, listReferrals } from "@/lib/referrals";

export const dynamic = "force-dynamic";

function age(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)} h ${mins % 60} min ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function Queue() {
  await requireUser("/referrals");
  const referrals = await listReferrals();
  // The first item on the form's checklist: the hospital face sheet.
  const demographics = await docStatuses(referrals.map((r) => r.id), "demographics");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-900">Referral queue</h1>
          <p className="text-sm text-slate-600">Paper and online referrals, newest first. Decisions are due within two hours.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/upload" className="btn-secondary">Upload scan</Link>
          <Link href="/refer" className="btn-secondary">New online referral</Link>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Received</th>
              <th className="px-4 py-2 font-medium">Patient</th>
              <th className="px-4 py-2 font-medium">Referring hospital</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium" title="Client's Demographic Page, the first item on the referral checklist">Demographic page</th>
              <th className="px-4 py-2 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {referrals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No referrals yet.
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
                      {age(r.created_at)}
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
                    <DocIndicator status={demographics.get(r.id)} reading={r.status === "processing"} />
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

/** Received, still being read, or missing; shape and word as well as color. */
function DocIndicator({ status, reading }: { status?: "done" | "processing" | "failed"; reading: boolean }) {
  if (status === "done" || status === "failed")
    return (
      <span className="inline-flex items-center gap-1 font-medium text-emerald-700" title={status === "failed" ? "Received, but it couldn't be read" : undefined}>
        <span aria-hidden="true">✓</span> Received
      </span>
    );
  if (status === "processing" || reading) return <span className="text-sky-700">Reading…</span>;
  return (
    <span className="inline-flex items-center gap-1 font-medium text-red-700">
      <span aria-hidden="true">✕</span> Missing
    </span>
  );
}
