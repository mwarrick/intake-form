import Link from "next/link";

export const metadata = { title: "How it works · Recuperative Care Intake" };

const STEPS = [
  { step: "Referral", when: "Hospital discharge planning", who: "Hospital referrer" },
  { step: "Review and decision", when: "Within 2 hours", who: "Referral coordinator" },
  { step: "Admission", when: "Day of arrival", who: "Medical Coordinator (LVN)" },
  { step: "Housing assessment", when: "First week of the stay", who: "Care Coordinator" },
  { step: "Service plan", when: "Before the authorization ends", who: "Care Coordinator" },
  { step: "Housing search and move-in", when: "Until the client is housed", who: "Housing Case Manager" },
];

interface Role {
  name: string;
  who: string;
  account: string;
  pages: { label: string; href?: string; what: string }[];
  uses: string;
  produces: string;
  outside: string;
}

const ROLES: Role[] = [
  {
    name: "Hospital referrer",
    who: "Hospital social worker, case manager or nurse planning a discharge",
    account: "No account. The online form is public.",
    pages: [
      { label: "Online referral", href: "/refer", what: "The RC0725-SH form on the web, with the supporting-document checklist. A paper form can be scanned in to pre-fill it." },
      { label: "Fax", what: "Or fax the paper form and records as before; the coordinator uploads the fax." },
    ],
    uses: "The patient’s chart.",
    produces: "The referral form, H&P, medication list, vitals, therapy notes, authorization and cultures.",
    outside: "Gets a reference number; the coordinator calls back with the decision.",
  },
  {
    name: "Referral coordinator",
    who: "Illumination intake staff who decide on referrals",
    account: "User",
    pages: [
      { label: "Upload scan", href: "/upload", what: "Upload a faxed packet. The form is read field by field and each record is read and labelled." },
      { label: "Referral queue", href: "/referrals", what: "Every referral, newest first, with conflict and criteria counts and an over-2-hours warning." },
      { label: "Review screen", what: "Check what was read against the scan, see where the records contradict the form, and record the decision." },
    ],
    uses: "Everything the referrer sent, read and cross-checked against the admission criteria.",
    produces: "Approved or denied, authorization number, admission date and time.",
    outside: "Calls the referrer with the decision and arranges the arrival.",
  },
  {
    name: "Medical Coordinator (LVN)",
    who: "The nurse who admits the patient and handles their care during the stay",
    account: "Clinical",
    pages: [
      { label: "Admissions → Arriving", href: "/admissions", what: "Approved patients due to arrive, with high alerts." },
      { label: "Admission summary", what: "One printable page: alerts (isolation, allergy checks, wound care, insulin, fall risk), medications with handling notes and a received column, the hospital’s baseline, an arrival checklist and the care-plan recommendations." },
    ],
    uses: "Diagnoses, medications and allergies, vitals, mobility, wounds, infection status, authorization dates.",
    produces: "Arrival assessment, medication reconciliation, care plan.",
    outside: "Enters the admission in KIPU (the EHR). Follow-up appointments still come from the hospital’s discharge orders.",
  },
  {
    name: "Care Coordinator",
    who: "Case manager who plans the move from recuperative care to housing",
    account: "User",
    pages: [
      { label: "Admissions → In recuperative care", href: "/admissions", what: "Current patients, days left on the authorization, and where each housing assessment stands." },
      { label: "Housing & Services Assessment", what: "Homeless history, disabling conditions, income, ID documents, housing goal and barriers, services and consent. Answers the referral already gave are filled in." },
      { label: "Housing & Services Summary", what: "Chronic homelessness determination, whether the record is ready for HMIS, and a service plan with measurable goals and target dates." },
    ],
    uses: "Contacts, insurance, housing situation, behavioral health and substance use from the referral; the nurse’s alerts and the stay’s end date.",
    produces: "The HMIS intake, the service plan, the housing application.",
    outside: "Enters the client in HMIS and KIPU and works the Coordinated Entry match.",
  },
  {
    name: "Housing Case Manager",
    who: "Case manager who finds a unit, moves the client in and helps them keep it (caseload of 30–35)",
    account: "User",
    pages: [
      { label: "Admissions → In recuperative care", href: "/admissions", what: "Clients with a completed housing assessment have a packet link." },
      {
        label: "Housing search packet",
        what: "Printable starting point: housing goal and CES status, a rent budget from income, unit needs (size, ground floor, pets, fridge for insulin, area), each barrier with a way to approach it, documents applications need, what the move must account for, suggested independent living goals, and blank pages for applications, viewings, the move-in checklist and the monthly contact standard.",
      },
    ],
    uses: "The Care Coordinator’s assessment and summary, plus mobility, medications and home health from the nurse’s records.",
    produces: "Applications, inspections, the move-in, and an independent living plan with at least three goals.",
    outside: "Works with landlords and property managers, enrolls clients in HMIS through CES, and logs every contact in the EHR within 24–48 hours.",
  },
  {
    name: "Sr. Director of Services and Care Transitions",
    who: "Senior RN leader over all Recuperative Care clinical staff and ECM; owns clinical standards, KPIs and quality improvement",
    account: "Admin",
    pages: [
      {
        label: "Dashboard",
        href: "/dashboard",
        what: "Totals across all referrals, no patient names: referrals per week, approval rate, the two-hour decision promise and its weekly trend, missing documents and conflicts by hospital, denial categories, admission criteria not met, acuity of approved patients, beds in use and stays ending, and housing assessment progress.",
      },
    ],
    uses: "Every referral’s decision time and category, the cross-check flags, the nurse’s alerts and the housing assessments.",
    produces: "Quality improvement priorities, staffing and capacity plans, reports to payers and partners.",
    outside: "Supervises the RNs, LVNs and medical assistants; works with CalOptima and hospital partners on the measures.",
  },
  {
    name: "Manager of Care Coordination & Case Management",
    who: "Supervises the case managers at the LA County recuperative care sites; decides intakes, extensions and exits with Site Managers",
    account: "User",
    pages: [
      {
        label: "Data to fix",
        href: "/data-to-fix",
        what: "Records that would fail a contract or grant report (no denial category, approved without authorization or admission details, documents missing or conflicts at approval, housing assessment late or without HMIS consent), each linked to where it gets fixed.",
      },
      { label: "Admissions → In recuperative care", href: "/admissions", what: "Days left and housing assessment status for current clients, for extension and exit decisions." },
    ],
    uses: "Decisions, authorizations, cross-check flags and assessments for every client.",
    produces: "Clean data for contract and grant reports; decisions on extensions and exits.",
    outside: "Supervision, case consultation, crisis plans and exits are recorded in KIPU and HMIS.",
  },
  {
    name: "Admin",
    who: "Program lead or IT",
    account: "Admin",
    pages: [
      { label: "Users", href: "/admin/users", what: "Add or import staff, set roles (User, Clinical, Admin), reset passwords, deactivate accounts." },
      { label: "Dashboard", href: "/dashboard", what: "Only admins can open it for now." },
    ],
    uses: "Staff list.",
    produces: "Accounts and roles. Only admins can delete a referral that has a decision.",
    outside: "",
  },
];

const CARRIES = [
  ["Patient name, DOB, MRN, language", "Referral", "Everyone"],
  ["Insurance, member ID, authorization and its end date", "Referral + authorization", "Coordinator, LVN, Care Coordinator"],
  ["Diagnoses, medications, allergies, vitals, mobility, wounds", "Supporting documents", "LVN; summary for the Care Coordinator"],
  ["Conflicts between records and the form", "Cross-checks", "Coordinator at decision, LVN at arrival"],
  ["Housing situation, episodes of homelessness", "Referral", "Pre-fills the housing assessment"],
  ["Behavioral health, substance use, mobility", "Referral + H&P", "Pre-fills disabling conditions"],
  ["Homeless history, income, documents, goals, consent", "Housing assessment", "Housing summary, HMIS"],
  ["Housing goal, budget, barriers, unit needs, documents", "Assessment + nurse’s records", "Housing search packet"],
  ["Decision times, denial categories, flags, alerts, assessments (totals)", "Every step above", "Program dashboard"],
  ["Gaps that would fail a report", "Every step above", "Data to fix"],
];

const DEMO = [
  ["Luis Ortega", "a1000000-0000-4000-8000-000000000001", "arriving today", "handoff"],
  ["Denise Harper", "a1000000-0000-4000-8000-000000000002", "arriving tomorrow; controlled medication", "handoff"],
  ["James Whitaker", "a1000000-0000-4000-8000-000000000003", "arriving in two days; housing assessment in draft", "assessment"],
  ["Maria Santos", "a1000000-0000-4000-8000-000000000004", "in her stay; ready for HMIS", "housing-summary"],
  ["Kevin Brooks", "a1000000-0000-4000-8000-000000000005", "in his stay; HMIS consent missing", "housing-summary"],
  ["Maria Santos (packet)", "a1000000-0000-4000-8000-000000000004", "no income, missing ID, a dog", "housing-packet"],
  ["Kevin Brooks (packet)", "a1000000-0000-4000-8000-000000000005", "SSDI budget, eviction history, ground floor", "housing-packet"],
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 text-sm">
      <div>
        <h1 className="text-xl font-semibold text-brand-900">How each role uses the system</h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          One referral follows the patient from the hospital to housing. Each role picks it up where the last one left off, so
          nobody re-types what was already written down.
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((s, i) => (
          <li key={s.step} className="card relative p-3">
            <span className="text-xs font-medium text-slate-400">{i + 1}</span>
            <p className="font-semibold text-brand-900">{s.step}</p>
            <p className="text-xs text-slate-600">{s.who}</p>
            <p className="mt-1 text-xs text-slate-500">{s.when}</p>
          </li>
        ))}
      </ol>

      <div className="space-y-4">
        {ROLES.map((r) => (
          <section key={r.name} className="card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-brand-900">{r.name}</h2>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Account: {r.account}</span>
            </div>
            <p className="text-slate-600">{r.who}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-[3fr_2fr]">
              <ul className="space-y-2">
                {r.pages.map((p) => (
                  <li key={p.label}>
                    {p.href ? (
                      <Link href={p.href} className="font-medium text-brand-700 hover:underline">{p.label}</Link>
                    ) : (
                      <span className="font-medium text-slate-800">{p.label}</span>
                    )}
                    <span className="text-slate-600">: {p.what}</span>
                  </li>
                ))}
              </ul>
              <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-1.5">
                <dt className="text-slate-500">Uses</dt>
                <dd>{r.uses}</dd>
                <dt className="text-slate-500">Produces</dt>
                <dd>{r.produces}</dd>
                {r.outside && (
                  <>
                    <dt className="text-slate-500">Outside the app</dt>
                    <dd>{r.outside}</dd>
                  </>
                )}
              </dl>
            </div>
          </section>
        ))}
      </div>

      <section className="card overflow-x-auto p-4">
        <h2 className="mb-2 text-base font-semibold text-brand-900">What carries forward</h2>
        <table className="w-full text-left">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-1 pr-3 font-medium">Information</th>
              <th className="py-1 pr-3 font-medium">Captured in</th>
              <th className="py-1 font-medium">Used by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {CARRIES.map(([what, from, to]) => (
              <tr key={what}>
                <td className="py-1.5 pr-3">{what}</td>
                <td className="py-1.5 pr-3 text-slate-600">{from}</td>
                <td className="py-1.5 text-slate-600">{to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-2 text-base font-semibold text-brand-900">Try it with mock patients</h2>
          <p className="mb-2 text-slate-600">Fictional, approved referrals at each stage (staff sign-in required).</p>
          <ul className="space-y-1">
            {DEMO.map(([name, id, note, page]) => (
              <li key={name}>
                <Link href={`/referrals/${id}/${page}`} className="font-medium text-brand-700 hover:underline">{name}</Link>
                <span className="text-slate-600">: {note}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 text-base font-semibold text-brand-900">Not built yet</h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-700">
            <li>Discharge summary reading, for follow-up appointments and the PCP</li>
            <li>Recording the arrival and an Admitted status in the app</li>
            <li>Export to KIPU and HMIS; both are entered by hand today</li>
            <li>Pages limited by role; only the dashboard is restricted so far</li>
            <li>Outcome measures: arrivals, exits and where people went, hospital returns, ECM enrollment</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
