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
    </div>
  );
}
