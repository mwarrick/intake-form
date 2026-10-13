/** Building blocks shared by the printable summaries. */

export function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card break-inside-avoid p-4 print:border-slate-400 print:p-3 print:shadow-none">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-brand-900">{title}</h2>
        {note && <span className="text-xs text-slate-500">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function Rows({ rows }: { rows: [string, string | null | undefined][] }) {
  const shown = rows.filter(([, v]) => v);
  return (
    <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-3 gap-y-1">
      {shown.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-slate-500">{k}</dt>
          <dd className="text-slate-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
