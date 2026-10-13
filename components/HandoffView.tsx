import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { Rows, Section } from "@/components/SummaryParts";
import { type SupportingDoc, docTypesById } from "@/lib/documents";
import { type Handoff, buildHandoff } from "@/lib/handoff";
import type { Assessment } from "@/lib/assessment";
import type { DocumentRow, Referral } from "@/lib/referrals";

const CHECKLIST = [
  "Head-to-toe assessment and vitals on arrival",
  "Insurance eligibility verified",
  "Medications received and reconciled against the list below",
  "Allergies confirmed with the patient",
  "Compliance forms given and signed",
  "Follow-up appointments scheduled (PCP, specialists)",
  "Home health / wound care arranged if ordered",
  "Care plan started with weekly goals",
  "Entered in the EHR",
];

/** The admission summary for the nurse who admits the patient; prints on letter paper. */
export function HandoffView({
  referral,
  documents,
  supporting,
  assessment,
}: {
  referral: Referral;
  documents: DocumentRow[];
  supporting: SupportingDoc[];
  /** The Care Coordinator's Housing & Services Assessment, if started. */
  assessment?: Assessment["status"] | null;
}) {
  const id = referral.id;
  const h = buildHandoff(referral.data, supporting, referral.doc_flags ?? []);
  const fileUrls = new Map(documents.filter((d) => d.url).map((d) => [d.id, d.url!]));
  const original = documents.find((d) => d.kind === "original")?.url;

  return (
    <div className="mx-auto max-w-4xl space-y-4 text-sm print:max-w-none print:space-y-3 print:text-[11px]">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/referrals/${id}`} className="text-slate-500 hover:text-brand-700">
          ← Referral
        </Link>
        <Link href="/admissions" className="text-slate-500 hover:text-brand-700">
          Admissions
        </Link>
        <span className="ml-auto">
          <PrintButton />
        </span>
      </div>

      {!h.stay.approved && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">
          This referral hasn’t been approved yet. The summary below is a preview.
        </p>
      )}

      <Header h={h} />
      <Alerts h={h} />

      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
        <Section title="Situation">
          <Rows
            rows={[
              ["Diagnosis / complaint", h.situation.chiefComplaint],
              ["Hospital admit date", h.situation.hospitalAdmitDate],
              ["Diagnoses", h.situation.diagnoses.join("; ")],
              ["Other history", h.situation.history.join("; ")],
              ["Mental health", h.situation.mentalHealth],
              ["Substance use", h.situation.substanceUse],
              ["Wounds", h.situation.wounds],
              ["Independent wound care", h.situation.independentWoundCare],
              ["Home health ordered", h.situation.homeHealthOrdered],
            ]}
          />
        </Section>
        <Section title="Hospital baseline" note="Compare with the arrival assessment">
          <Baseline h={h} />
        </Section>
      </div>

      <Medications h={h} />

      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
        <Section title="Arrival checklist">
          <ul className="space-y-1.5">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 inline-block size-3.5 shrink-0 rounded-sm border border-slate-400" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-slate-500">
            Arrived ____ / ____ / ______ at ______ &nbsp; Nurse ______________________
          </p>
        </Section>
        <Section title="For the care plan">
          {h.recommendations.length ? (
            <ul className="space-y-1.5">
              {h.recommendations.map((r, i) => (
                <li key={i}>
                  <span className="font-medium text-slate-600">{r.source}:</span> {r.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No plan or recommendations found in the records.</p>
          )}
          <p className="mt-3 font-medium text-slate-600">Follow-up appointments and care team</p>
          <p className="text-slate-500">
            Not in the referral packet. Get the discharge orders from the referrer for PCP, specialists and appointment dates.
          </p>
          <p className="mt-1 text-slate-500">PCP ______________________ &nbsp; Next appt ____________</p>
        </Section>
      </div>

      <section className="card flex flex-wrap items-center gap-3 border-brand-100 bg-brand-50 p-4 print:hidden">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-brand-900">Next: Housing &amp; Services Assessment</h2>
          <p className="text-slate-600">
            For the Care Coordinator during the stay: homeless history, income, documents and the housing plan, for HMIS and
            the move to housing.
          </p>
        </div>
        {assessment === "complete" ? (
          <>
            <Link href={`/referrals/${id}/assessment`} className="btn-secondary">Edit assessment</Link>
            <Link href={`/referrals/${id}/housing-summary`} className="btn-primary">Housing summary</Link>
          </>
        ) : (
          <Link href={`/referrals/${id}/assessment`} className="btn-primary">
            {assessment === "draft" ? "Continue assessment" : "Start assessment"}
          </Link>
        )}
      </section>

      <Section title="Sources">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {original && (
            <li>
              <a href={original} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                Referral scan
              </a>
            </li>
          )}
          {supporting.map((d) => {
            const label = docTypesById.get(d.doc_type)?.label ?? d.label ?? d.doc_type;
            const url = d.document_id ? fileUrls.get(d.document_id) : undefined;
            const where = d.pages?.length ? ` (fax p. ${d.pages.join(", ")})` : "";
            return (
              <li key={d.id}>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                    {label}
                  </a>
                ) : (
                  label + where
                )}
              </li>
            );
          })}
          {!original && !supporting.length && <li className="text-slate-500">No documents</li>}
        </ul>
      </Section>

      <p className="text-xs text-slate-400">
        Admission summary generated {new Date().toLocaleString()} from referral {referral.id.slice(0, 8)}. Read from faxed and
        uploaded records; verify against the originals.
      </p>
    </div>
  );
}

function Header({ h }: { h: Handoff }) {
  const p = h.patient;
  const s = h.stay;
  const days = s.daysApproved ?? s.daysRequested;
  return (
    <section className="card p-4 print:border-slate-400 print:shadow-none">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold text-brand-900">{p.name ?? "Unnamed patient"}</h1>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Admission summary</span>
      </div>
      <p className="mt-1 text-slate-700">
        {[p.dob && `DOB ${p.dob}${p.age !== null ? ` (${p.age})` : ""}`, p.gender, p.mrn && `MRN ${p.mrn}`, p.language && `Language: ${p.language}`]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 print:grid-cols-2">
        <Rows
          rows={[
            ["Arriving", s.admissionDate ? `${s.admissionDate}${s.admissionTime ? ` at ${s.admissionTime}` : ""}` : "Date not set"],
            ["From", s.hospital],
            ["Referrer", [s.referrer, s.referrerPhone, s.referrerEmail].filter(Boolean).join(" · ")],
            ["Patient phone", p.phone],
            ["Emergency contact", p.emergencyContact],
          ]}
        />
        <Rows
          rows={[
            ["Insurance", [s.insurance, s.memberId && `ID ${s.memberId}`].filter(Boolean).join(" · ")],
            ["Authorization", [s.authNumber, s.authStatus].filter(Boolean).join(" · ")],
            [
              "Stay",
              days
                ? `${days} days${s.daysApproved && s.daysRequested && s.daysApproved !== s.daysRequested ? ` approved (${s.daysRequested} requested)` : ""}`
                : null,
            ],
            ["Authorized through", s.endDate],
          ]}
        />
      </div>
    </section>
  );
}

function Alerts({ h }: { h: Handoff }) {
  if (!h.alerts.length && !h.conflicts.length) return null;
  return (
    <section className="card space-y-2 p-4 print:border-slate-400 print:shadow-none">
      <h2 className="text-base font-semibold text-brand-900">Alerts</h2>
      <ul className="space-y-1">
        {h.alerts.map((a, i) => (
          <li
            key={i}
            className={`rounded-md px-3 py-1.5 print:border print:px-2 print:py-1 ${a.level === "high" ? "bg-red-50 text-red-900 print:border-red-400" : "bg-amber-50 text-amber-900 print:border-amber-300"}`}
          >
            <span className="font-semibold">{a.label}</span>
            {a.detail && <span>: {a.detail}</span>}
          </li>
        ))}
      </ul>
      {h.conflicts.length > 0 && (
        <div>
          <p className="mt-2 font-medium text-slate-600">Records that disagree with the referral form</p>
          <ul className="list-disc pl-5 text-slate-700">
            {h.conflicts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Baseline({ h }: { h: Handoff }) {
  const { vitals: v, mobility: m } = h.baseline;
  const yn = (b: boolean | null) => (b === null ? null : b ? "Yes" : "No");
  return (
    <Rows
      rows={[
        [
          "Last vitals",
          v
            ? [v.bp && `BP ${v.bp}`, v.hr !== null && `HR ${v.hr}`, v.temp !== null && `T ${v.temp}°F`, v.rr !== null && `RR ${v.rr}`, v.spo2 !== null && `SpO2 ${v.spo2}%`, v.oxygen]
                .filter(Boolean)
                .join(" · ")
            : "No vitals received",
        ],
        ["Vitals taken", v?.takenAt?.replace("T", " ") ?? null],
        ["Walks", m?.distanceFt !== null && m?.distanceFt !== undefined ? `${m.distanceFt} ft${m.device ? ` with ${m.device}` : ""}` : m?.device ?? null],
        ["Transfers independently", yn(m?.transfers ?? null)],
        ["Independent with ADLs", yn(m?.adls ?? null)],
        ["Mobility note", m ? [m.discipline, m.noteDate?.replace("T", " ")].filter(Boolean).join(", ") : null],
        ["Alert & oriented x4", yn(h.baseline.orientedX4)],
        ["Cognitive impairment", yn(h.baseline.cognitiveImpairment)],
        ["TB test", h.baseline.tb],
      ]}
    />
  );
}

function Medications({ h }: { h: Handoff }) {
  const m = h.medications;
  return (
    <Section title="Medications" note="Count what arrives and reconcile">
      <p className="mb-2 text-slate-700">
        <span className="font-medium">Allergies:</span> {h.allergies.length ? h.allergies.join("; ") : "None listed"}
        {" · "}
        <span className="font-medium">30-day supply:</span> {m.thirtyDaySupply ?? "not answered"}
        {" · "}
        <span className="font-medium">Self-administers:</span> {m.selfAdministers ?? "not answered"}
      </p>
      {m.rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1 pr-3 font-medium">Medication</th>
                <th className="py-1 pr-3 font-medium">Dose</th>
                <th className="py-1 pr-3 font-medium">Route</th>
                <th className="py-1 pr-3 font-medium">Frequency</th>
                <th className="py-1 pr-3 font-medium">Handling</th>
                <th className="w-24 py-1 font-medium">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {m.rows.map((r, i) => (
                <tr key={i}>
                  <td className="py-1 pr-3 font-medium">{r.name}</td>
                  <td className="py-1 pr-3">{r.dose ?? "—"}</td>
                  <td className="py-1 pr-3">{r.route ?? "—"}</td>
                  <td className="py-1 pr-3">{r.frequency ?? "—"}</td>
                  <td className="py-1 pr-3 text-xs">
                    {r.notes.map((n) => (
                      <span key={n} className={`mr-1 inline-block rounded px-1.5 py-0.5 ${n.startsWith("Possible allergy") ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>
                        {n}
                      </span>
                    ))}
                  </td>
                  <td className="py-1">
                    <span className="inline-block h-4 w-16 border-b border-slate-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-500">No medication list received.</p>
      )}
      {m.source && <p className="mt-2 text-xs text-slate-500">From the list: {m.source}</p>}
    </Section>
  );
}
