import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { Rows, Section } from "@/components/SummaryParts";
import type { Assessment } from "@/lib/assessment";
import type { SupportingDoc } from "@/lib/documents";
import { buildHousingSummary } from "@/lib/housing";
import type { Referral } from "@/lib/referrals";

const CHRONIC_STYLE = {
  yes: "bg-purple-50 text-purple-900",
  no: "bg-slate-50 text-slate-700",
  unknown: "bg-amber-50 text-amber-900",
};

/** The Care Coordinator's Housing & Services Summary, built from the assessment and the referral. */
export function HousingSummaryView({ referral, supporting, assessment }: { referral: Referral; supporting: SupportingDoc[]; assessment: Assessment }) {
  const id = referral.id;
  const s = buildHousingSummary(referral.data, assessment.data, supporting, referral.doc_flags ?? []);
  const c = s.client;

  return (
    <div className="mx-auto max-w-4xl space-y-4 text-sm print:max-w-none print:space-y-3 print:text-[11px]">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/referrals/${id}/handoff`} className="text-slate-500 hover:text-brand-700">
          ← Admission summary
        </Link>
        <Link href={`/referrals/${id}/assessment`} className="text-slate-500 hover:text-brand-700">
          Edit assessment
        </Link>
        <span className="ml-auto">
          <PrintButton />
        </span>
      </div>

      {assessment.status !== "complete" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">The assessment is still a draft. This summary is a preview.</p>
      )}

      <section className="card p-4 print:border-slate-400 print:shadow-none">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-xl font-semibold text-brand-900">
            {c.name ?? "Client"}
            {c.preferredName && <span className="ml-2 text-base font-normal text-slate-500">“{c.preferredName}”</span>}
          </h1>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Housing &amp; services summary</span>
        </div>
        <p className="mt-1 text-slate-700">
          {[c.dob && `DOB ${c.dob}${c.age !== null ? ` (${c.age})` : ""}`, c.language && `Language: ${c.language}`, c.veteran && `Veteran: ${c.veteran}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 print:grid-cols-2">
          <Rows
            rows={[
              ["Contact", [c.phone, c.contactMethod && `prefers ${c.contactMethod.toLowerCase()}`].filter(Boolean).join(" · ")],
              ["Household", c.household],
              ["Assessed", [s.assessmentDate, s.assessedBy].filter(Boolean).join(" by ")],
              ["Next review", s.nextReview],
            ]}
          />
          <Rows
            rows={[
              ["Recuperative stay", s.stay.admissionDate ? `Admitted ${s.stay.admissionDate}` : null],
              [
                "Authorized through",
                s.stay.authorizedThrough
                  ? `${s.stay.authorizedThrough}${s.stay.daysLeft !== null ? ` (${s.stay.daysLeft >= 0 ? `${s.stay.daysLeft} days left` : `ended ${-s.stay.daysLeft} days ago`})` : ""}`
                  : null,
              ],
              ["Referred from", s.stay.hospital],
            ]}
          />
        </div>
      </section>

      <section className={`card p-4 print:border-slate-400 print:shadow-none`}>
        <h2 className="text-base font-semibold text-brand-900">Status</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 print:grid-cols-2">
          <p className={`rounded-md px-3 py-2 ${CHRONIC_STYLE[s.homelessness.chronic.status]}`}>
            <span className="font-semibold">
              Chronically homeless: {s.homelessness.chronic.status === "yes" ? "Yes" : s.homelessness.chronic.status === "no" ? "No" : "Can’t tell yet"}
            </span>
            <br />
            {s.homelessness.chronic.reason}
          </p>
          <div className={`rounded-md px-3 py-2 ${s.hmis.ready ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
            <span className="font-semibold">{s.hmis.ready ? "Ready for HMIS entry" : "Not ready for HMIS"}</span>
            {s.hmis.issues.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {s.hmis.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
        <Section title="Homeless history">
          <Rows
            rows={[
              ["Before the hospital", s.homelessness.priorSituation],
              ["How long there", s.homelessness.lengthThere],
              ["This episode began", s.homelessness.episodeStart],
              ["Times in 3 years", s.homelessness.times3yrs],
              ["Months in 3 years", s.homelessness.months3yrs?.toString()],
            ]}
          />
        </Section>
        <Section title="Health">
          <Rows
            rows={[
              ["Disabling condition", [s.health.disabling, s.health.conditions.join(", ")].filter(Boolean).join(": ")],
              ["Notes", s.health.notes],
              ["Insurance", s.health.insurance],
              ["Primary care", s.health.pcp ?? "None: connect to a PCP"],
              ["Diagnoses", s.stay.diagnoses.join("; ")],
              ["Medications", s.stay.medicationCount ? `${s.stay.medicationCount} on the discharge list` : null],
              ["Nursing alerts", s.stay.nursingNeeds.join(", ")],
            ]}
          />
        </Section>
        <Section title="Income and benefits">
          <Rows
            rows={[
              [
                "Income",
                s.income.has === "Yes"
                  ? [s.income.sources.join(", "), s.income.monthly !== null ? `$${s.income.monthly.toLocaleString()}/month` : null].filter(Boolean).join(" · ")
                  : s.income.has === "No"
                    ? "None"
                    : null,
              ],
              ["Non-cash benefits", s.income.noncash.join(", ") || null],
              ["Pending", s.income.pending],
              ["Documents on hand", s.documents.have.join(", ") || "None"],
              ["Documents needed", s.documents.missing.join(", ") || null],
            ]}
          />
        </Section>
        <Section title="Housing">
          <Rows
            rows={[
              ["Goal", s.housing.goal],
              ["Coordinated Entry", s.housing.ces],
              ["Barriers", s.housing.barriers.join(", ") || "None noted"],
              ["Accessibility", s.housing.accessibility],
              ["Preferred area", s.housing.area],
            ]}
          />
        </Section>
      </div>

      <Section title="Service plan" note="Measurable goals; review at each check-in">
        {s.plan.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">Need</th>
                  <th className="py-1 pr-3 font-medium">Goal</th>
                  <th className="py-1 pr-3 font-medium">First step</th>
                  <th className="py-1 pr-3 font-medium">Target</th>
                  <th className="w-20 py-1 font-medium">Done</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {s.plan.map((p) => (
                  <tr key={p.need} className="align-top">
                    <td className="py-1.5 pr-3 font-medium">{p.need}</td>
                    <td className="py-1.5 pr-3">{p.goal}</td>
                    <td className="py-1.5 pr-3">{p.firstStep}</td>
                    <td className="whitespace-nowrap py-1.5 pr-3">{p.due ?? "—"}</td>
                    <td className="py-1.5">
                      <span className="inline-block h-4 w-14 border-b border-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500">No services selected.</p>
        )}
        {(s.goals || s.strengths) && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            {s.goals && (
              <p>
                <span className="font-medium text-slate-600">Client’s goals:</span> {s.goals}
              </p>
            )}
            {s.strengths && (
              <p>
                <span className="font-medium text-slate-600">Strengths and supports:</span> {s.strengths}
              </p>
            )}
          </div>
        )}
      </Section>

      <p className="text-xs text-slate-400">
        Summary generated {new Date().toLocaleString()} from the Housing &amp; Services Assessment for referral {id.slice(0, 8)}.
        Enter in HMIS and KIPU; this page doesn’t send anything to either.
      </p>
    </div>
  );
}
