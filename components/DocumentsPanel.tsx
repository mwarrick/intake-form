"use client";

import { type DocData, type DocField, type DocTable, type SupportingDoc, docTypesById } from "@/lib/documents";
import type { Flag } from "@/lib/validate";

interface Props {
  docs: SupportingDoc[];
  flags: Flag[];
  /** Open links for uploaded attachments, by document id. */
  fileUrls: Map<string, string>;
}

const FLAG_STYLE: Partial<Record<Flag["kind"], string>> = {
  conflict: "bg-red-50 text-red-800",
  eligibility: "bg-purple-50 text-purple-800",
  document: "bg-slate-50 text-slate-700",
};

export function DocumentsPanel({ docs, flags, fileUrls }: Props) {
  const conflicts = flags.filter((f) => f.kind === "conflict");
  const checklist = flags.filter((f) => f.kind === "document");

  return (
    <section className="card space-y-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-brand-900">Supporting documents</h2>
        <span className="text-xs text-slate-500">
          {docs.length ? `${docs.filter((d) => d.status === "done").length} of ${docs.length} read` : "None received"}
        </span>
      </div>

      {(conflicts.length > 0 || checklist.length > 0) && (
        <ul className="space-y-1">
          {[...conflicts, ...checklist].map((f, i) => (
            <li key={i} className={`rounded-md px-3 py-1.5 text-sm ${FLAG_STYLE[f.kind]}`}>
              {f.kind === "conflict" ? "Conflict: " : ""}
              {f.message}
            </li>
          ))}
        </ul>
      )}

      {docs.length > 0 && (
        <div className="divide-y divide-slate-100">
          {docs.map((d) => (
            <DocCard key={d.id} doc={d} url={d.document_id ? fileUrls.get(d.document_id) : undefined} />
          ))}
        </div>
      )}
    </section>
  );
}

function DocCard({ doc, url }: { doc: SupportingDoc; url?: string }) {
  const type = docTypesById.get(doc.doc_type);
  const where = doc.pages?.length
    ? `Fax page${doc.pages.length > 1 ? "s" : ""} ${doc.pages.join(", ")}`
    : "Uploaded attachment";

  return (
    <details className="group py-2" open={doc.status !== "done"}>
      <summary className="flex cursor-pointer select-none flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-800">{type?.label ?? doc.label ?? doc.doc_type}</span>
        <span className="text-xs text-slate-500">{where}</span>
        {doc.status === "processing" && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">Reading…</span>}
        {doc.status === "failed" && <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800">Couldn’t read</span>}
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="ml-auto text-xs text-brand-700 hover:underline" onClick={(e) => e.stopPropagation()}>
            Open
          </a>
        )}
      </summary>
      {doc.status === "failed" && doc.error && <p className="mt-1 font-mono text-xs text-red-700">{doc.error}</p>}
      {doc.status === "done" && doc.data && type && <DocDetails data={doc.data} fields={type.fields} tables={type.tables ?? []} />}
    </details>
  );
}

function DocDetails({ data, fields, tables }: { data: DocData; fields: DocField[]; tables: DocTable[] }) {
  const shown = fields.filter((f) => !isBlank(data[f.id]));
  return (
    <div className="mt-2 space-y-2 text-sm">
      {shown.length > 0 && (
        <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-3 gap-y-1">
          {shown.map((f) => (
            <div key={f.id} className="contents">
              <dt className="text-slate-500">{f.label}</dt>
              <dd className="text-slate-800">{display(data[f.id])}</dd>
            </div>
          ))}
        </dl>
      )}
      {tables.map((t) => {
        const rows = Array.isArray(data[t.id]) ? (data[t.id] as Record<string, string | null>[]) : [];
        if (!rows.length) return null;
        return (
          <div key={t.id} className="overflow-x-auto">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{t.label}</p>
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>{t.columns.map((c) => <th key={c.id} className="pr-3 font-medium">{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {t.columns.map((c) => <td key={c.id} className="py-0.5 pr-3 text-slate-800">{r[c.id] ?? "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      {typeof data.notes === "string" && data.notes && <p className="text-xs text-slate-600">Notes: {data.notes}</p>}
    </div>
  );
}

function isBlank(v: unknown) {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
}

function display(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.join("; ");
  return String(v);
}
