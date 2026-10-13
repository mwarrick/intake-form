import Link from "next/link";
import type { Assessment } from "@/lib/assessment";
import { requireUser } from "@/lib/auth";
import { buildHandoff } from "@/lib/handoff";
import { addDays, localDate } from "@/lib/metrics";
import { type Referral, assessmentStatuses, listAdmissions } from "@/lib/referrals";

export const dynamic = "force-dynamic";

/**
 * Approved patients in two lists: arriving (the admitting nurse works from the admission summary) and already in
 * recuperative care (the Care Coordinator works on the housing assessment before the authorization runs out).
 */
export default async function Admissions() {
  await requireUser("/admissions");
  const referrals = await listAdmissions();
  const assessments = await assessmentStatuses(referrals.map((r) => r.id));
  const today = localDate(new Date());
  const date = (r: Referral) => (typeof r.data.admission_date === "string" ? r.data.admission_date : null);
  // A stay has ended once its authorized days are up; those patients drop off both lists.
  const ends = (r: Referral) => (date(r) && typeof r.data.los_authorized_days === "number" ? addDays(date(r)!, r.data.los_authorized_days) : null);
  const arriving = referrals.filter((r) => (date(r) ?? "9999") >= today);
  const inCare = referrals.filter((r) => (date(r) ?? "9999") < today && (ends(r) ?? "9999") > today).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">Admissions</h1>
        <p className="text-sm text-slate-600">
          Approved referrals. The admitting nurse works from each patient’s admission summary; the Care Coordinator starts the
          housing assessment during the stay.
        </p>
      </div>
      <AdmissionTable title="Arriving" empty="No one is due to arrive." rows={arriving} today={today} assessments={assessments} />
      <AdmissionTable title="In recuperative care" empty="No current patients." rows={inCare} today={today} assessments={assessments} inCare />
    </div>
  );
}

function AdmissionTable({
  title,
  empty,
  rows,
  today,
  assessments,
  inCare,
}: {
  title: string;
  empty: string;
  rows: Referral[];
  today: string;
  assessments: Map<string, Assessment["status"]>;
  inCare?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-brand-900">
        {title} <span className="font-normal text-slate-500">({rows.length})</span>
      </h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">{inCare ? "Admitted" : "Arriving"}</th>
              <th className="px-4 py-2 font-medium">Patient</th>
              <th className="px-4 py-2 font-medium">From</th>
              <th className="px-4 py-2 font-medium">{inCare ? "Authorized through" : "Stay"}</th>
              <th className="px-4 py-2 font-medium">Alerts</th>
              <th className="px-4 py-2 font-medium">Housing assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">{empty}</td>
              </tr>
            )}
            {rows.map((r) => {
              // The list query skips supporting documents, so alerts here come from the form and the cross-checks.
              const h = buildHandoff(r.data, [], r.doc_flags ?? []);
              const high = h.alerts.filter((a) => a.level === "high");
              const auth = h.stay.daysRequested && h.stay.admissionDate ? addDays(h.stay.admissionDate, h.stay.daysRequested) : null;
              const daysLeft = auth ? Math.round((Date.parse(auth) - Date.parse(today)) / 86_400_000) : null;
              const status = assessments.get(r.id);
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {h.stay.admissionDate ?? <span className="text-slate-400">Not set</span>}
                    {h.stay.admissionDate === today && <span className="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">Today</span>}
                    {!inCare && h.stay.admissionTime && <span className="ml-2 text-slate-500">{h.stay.admissionTime}</span>}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/referrals/${r.id}/handoff`} className="text-brand-700 hover:underline">
                      {r.patient_name ?? "Unnamed"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{r.referring_hospital ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                    {inCare
                      ? auth
                        ? <>{auth} <span className={daysLeft !== null && daysLeft <= 7 ? "font-medium text-red-700" : "text-slate-500"}>({daysLeft} days)</span></>
                        : "—"
                      : h.stay.daysRequested ? `${h.stay.daysRequested} days` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {high.map((a) => (
                      <span key={a.label} className="mr-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-red-800">{a.label}</span>
                    ))}
                    {!high.length && <span className="text-slate-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                    {status === "complete" ? (
                      <>
                        <Link href={`/referrals/${r.id}/housing-summary`} className="text-emerald-700 hover:underline">Complete · summary</Link>
                        {" · "}
                        <Link href={`/referrals/${r.id}/housing-packet`} className="text-brand-700 hover:underline">packet</Link>
                      </>
                    ) : (
                      <Link href={`/referrals/${r.id}/assessment`} className="text-brand-700 hover:underline">
                        {status === "draft" ? "Draft · continue" : "Start"}
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
