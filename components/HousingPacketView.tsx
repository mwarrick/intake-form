import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { Rows, Section } from "@/components/SummaryParts";
import type { Assessment } from "@/lib/assessment";
import type { SupportingDoc } from "@/lib/documents";
import { buildHousingPacket } from "@/lib/packet";
import type { Referral } from "@/lib/referrals";

const MOVE_IN = [
  "Unit passed the housing quality inspection",
  "Deposit and first month’s rent confirmed (amount and who pays)",
  "W-9 from the landlord",
  "Rental agreement signed; client has a copy",
  "Utilities set up in the client’s name",
  "Furniture and household starter kit",
  "New address given to Medi-Cal, SSA, CalFresh and the pharmacy",
  "Home health and primary care told about the move",
  "Keys handed over; first home visit within a week",
];

const DOC_STYLE = { have: "text-emerald-700", need: "text-red-700", check: "text-amber-700" };
const DOC_LABEL = { have: "Have", need: "Need", check: "Check" };

/** The Housing Case Manager's starting point: the client's housing profile plus pages to track the search. */
export function HousingPacketView({ referral, supporting, assessment }: { referral: Referral; supporting: SupportingDoc[]; assessment: Assessment }) {
  const id = referral.id;
  const p = buildHousingPacket(referral.data, assessment.data, supporting, referral.doc_flags ?? []);
  const s = p.summary;
  const c = s.client;

  return (
    <div className="mx-auto max-w-4xl space-y-4 text-sm print:max-w-none print:space-y-3 print:text-[11px]">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/referrals/${id}/housing-summary`} className="text-slate-500 hover:text-brand-700">
          ← Housing summary
        </Link>
        <span className="ml-auto">
          <PrintButton />
        </span>
      </div>

      {assessment.status !== "complete" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-800">The housing assessment is still a draft. This packet is a preview.</p>
      )}

      <section className="card p-4 print:border-slate-400 print:shadow-none">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-xl font-semibold text-brand-900">
            {c.name ?? "Client"}
            {c.preferredName && <span className="ml-2 text-base font-normal text-slate-500">“{c.preferredName}”</span>}
          </h1>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Housing search packet</span>
        </div>
        <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 print:grid-cols-2">
          <Rows
            rows={[
              ["Contact", [c.phone, c.contactMethod && `prefers ${c.contactMethod.toLowerCase()}`].filter(Boolean).join(" · ")],
              ["Language", c.language],
              ["Household", c.household],
              ["Care Coordinator", s.assessedBy],
            ]}
          />
          <Rows
            rows={[
              ["Housing goal", s.housing.goal],
              ["Coordinated Entry", s.housing.ces],
              ["Chronically homeless", s.homelessness.chronic.status === "yes" ? "Yes" : s.homelessness.chronic.status === "no" ? "No" : "Not determined"],
              [
                "Needs a unit by",
                s.stay.authorizedThrough
                  ? `${s.stay.authorizedThrough}${s.stay.daysLeft !== null ? ` (${s.stay.daysLeft >= 0 ? `${s.stay.daysLeft} days` : "stay ended"})` : ""}`
                  : null,
              ],
            ]}
          />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
        <Section title="Budget">
          <p className="text-lg font-semibold text-brand-900">
            {p.budget.maxRent === null ? "—" : p.budget.maxRent === 0 ? "$0 tenant share" : `Up to $${p.budget.maxRent.toLocaleString()}/month`}
          </p>
          <p className="text-slate-600">{p.budget.note}</p>
          <Rows
            rows={[
              ["Income", p.budget.monthlyIncome ? `$${p.budget.monthlyIncome.toLocaleString()}/month (${s.income.sources.join(", ")})` : p.budget.monthlyIncome === 0 ? "None" : null],
              ["Benefits", s.income.noncash.join(", ") || null],
              ["Pending", s.income.pending],
            ]}
          />
        </Section>
        <Section title="Unit needs">
          {p.unitNeeds.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {p.unitNeeds.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">Nothing specific recorded.</p>
          )}
        </Section>
      </div>

      <Section title="Barriers and how to approach them">
        {p.barriers.length ? (
          <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-3 gap-y-2">
            {p.barriers.map((b) => (
              <div key={b.barrier} className="contents">
                <dt className="font-medium text-slate-700">{b.barrier}</dt>
                <dd>{b.approach}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-slate-500">No barriers noted in the assessment.</p>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
        <Section title="Documents for applications">
          <ul className="space-y-1">
            {p.documents.map((d) => (
              <li key={d.name} className="flex gap-2">
                <span className={`w-12 shrink-0 font-medium ${DOC_STYLE[d.status]}`}>{DOC_LABEL[d.status]}</span>
                <span>
                  {d.name}
                  {d.note && <span className="text-slate-500"> · {d.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="For the move">
          <ul className="list-disc space-y-1 pl-5">
            {p.moveConsiderations.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Applications and viewings" note="Fill in as you go">
        <BlankTable columns={["Property / address", "Contact", "Rent", "Applied", "Viewed", "Inspection", "Status"]} rows={6} />
      </Section>

      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
        <Section title="Independent living goals" note="At least three, with milestones">
          <ol className="list-decimal space-y-2 pl-5">
            {p.livingGoals.map((g) => (
              <li key={g}>
                {g}
                <span className="mt-1 block text-slate-500">Milestone ______________________ by ________</span>
              </li>
            ))}
          </ol>
        </Section>
        <Section title="Move-in checklist">
          <ul className="space-y-1.5">
            {MOVE_IN.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 inline-block size-3.5 shrink-0 rounded-sm border border-slate-400" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-slate-500">Move-in date ____ / ____ / ______ &nbsp; Address ______________________</p>
        </Section>
      </div>

      <Section title="Contact standard">
        <p>
          Contact weekly, four days of service a month, using at least three methods (phone, text or email, written). Meet in
          person at least once a month. Enter notes in the EHR within 24–48 hours.
        </p>
        <BlankTable columns={["Week of", "Phone", "Text / email", "Written", "In person", "Note entered"]} rows={5} />
      </Section>

      <p className="text-xs text-slate-400">
        Packet generated {new Date().toLocaleString()} from the Housing &amp; Services Assessment ({s.assessmentDate ?? "undated"}) for
        referral {id.slice(0, 8)}. Track applications and contacts in the EHR and HMIS.
      </p>
    </div>
  );
}

function BlankTable({ columns, rows }: { columns: string[]; rows: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c} className="border-b border-slate-300 py-1 pr-3 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c} className="h-7 border-b border-slate-200 pr-3" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
