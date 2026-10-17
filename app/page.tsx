import Link from "next/link";

const CARDS = [
  {
    href: "/upload",
    title: "Upload a faxed or scanned form",
    staff: true,
    body: "Drop in a referral packet. The app finds the referral form page, reads the handwriting, and flags anything it is unsure of.",
    cta: "Upload scan",
  },
  {
    href: "/refer",
    title: "Submit a referral online",
    body: "For hospital SW/CM/RN staff: the same referral form as a web form, with supporting documents attached.",
    cta: "Start referral",
  },
  {
    href: "/referrals",
    title: "Coordinator queue",
    staff: true,
    body: "Every referral, paper or online, in one list. Review extracted fields against the scan and record the decision.",
    cta: "Open queue",
  },
];

/** How the app serves Illumination's mission, pillar by pillar; each point is something the app does today. */
const MISSION = [
  {
    pillar: "Healthcare",
    lead: "A safe bed, decided fast, when someone leaves the hospital with nowhere to recover.",
    points: [
      "Faxed referrals are read automatically, so a coordinator checks answers instead of retyping them and can keep the two-hour decision promise.",
      "Every referral is cross-checked against its hospital records and the admission criteria, catching problems like an uncleared MRSA culture before the patient arrives.",
      "The admitting nurse starts from an admission summary: alerts, possible allergy conflicts, medications to reconcile and the hospital’s baseline.",
    ],
  },
  {
    pillar: "Housing",
    lead: "Planning the move to housing starts during the recuperative stay, not after it.",
    points: [
      "The Care Coordinator’s housing assessment is pre-filled from the referral and asks what HMIS and Coordinated Entry need.",
      "It shows whether the client is chronically homeless, what blocks their HMIS entry, and a service plan due before the stay ends.",
      "The Housing Case Manager gets a search packet: rent budget, unit needs, barriers with ways around them, and the documents to gather.",
    ],
  },
  {
    pillar: "Together",
    lead: "One record follows the person from hospital to recovery to a home.",
    points: [
      "Each role picks up where the last left off, so clients aren’t asked the same questions again.",
      "Leadership sees the two-hour promise, referral quality by hospital, patient acuity and housing progress.",
      "A data-to-fix list keeps the records behind contract and grant reports complete.",
    ],
  },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-900">Recuperative care referrals</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Referrals get a decision within two hours. Paper forms are read automatically, so coordinators check
          answers instead of retyping them.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.href} href={c.href} className="card group flex flex-col p-5 transition hover:border-brand-500">
            <h2 className="font-semibold text-slate-900">
              {c.title}
              {"staff" in c && <span className="ml-2 align-middle text-xs font-normal text-slate-500">Staff sign-in</span>}
            </h2>
            <p className="mt-2 flex-1 text-sm text-slate-600">{c.body}</p>
            <span className="mt-4 text-sm font-medium text-brand-700 group-hover:underline">{c.cta} →</span>
          </Link>
        ))}
      </div>

      <section className="space-y-4 pt-2">
        <div>
          <h2 className="text-xl font-semibold text-brand-900">How this app serves the mission</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Illumination Health + Home’s mission is to <span className="font-medium text-slate-800">disrupt the cycle of homelessness by providing
            healthcare, housing, and hope, together</span>. Recuperative care is where those meet: someone well enough to leave the hospital but too sick to recover on the street.
            This app carries each referral through that window.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {MISSION.map((m) => (
            <div key={m.pillar} className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{m.pillar}</p>
              <p className="mt-1 font-medium text-slate-900">{m.lead}</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
                {m.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="max-w-3xl text-sm text-slate-600">
          Today it covers recuperative care referrals from Orange County hospitals, with fictional patients for the demo.{" "}
          <Link href="/how-it-works" className="font-medium text-brand-700 hover:underline">
            See how each role uses it →
          </Link>
        </p>
      </section>
    </div>
  );
}
