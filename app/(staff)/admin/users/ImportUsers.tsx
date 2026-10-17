"use client";

import { useMemo, useState, useTransition } from "react";
import { type ImportResult, importUsers } from "@/app/admin-actions";
import { parseStaffList } from "@/lib/user-import";

/** Paste a staff list, preview who will be added, then import and hand out the temporary passwords. */
export function ImportUsers({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const preview = useMemo(() => parseStaffList(text), [text]);

  if (result && !result.error) return <ImportDone result={result} onDone={onDone} />;

  return (
    <div className="card space-y-3 p-4">
      <div>
        <h2 className="text-base font-semibold text-brand-900">Import users</h2>
        <p className="text-sm text-slate-600">
          Paste one person per line: <code>First Last, email</code>, <code>First Last &lt;email&gt;</code>, or rows copied from a
          spreadsheet with First, Last, Email and (optional) Role columns. Write <code>admin</code> in a column to make someone an
          admin; everyone else is a user.
        </p>
      </div>
      <textarea
        className="input min-h-40 font-mono text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Dana Whitfield, dwhitfield@illuminationhealthhome.org\nKim Nguyen <knguyen@illuminationhealthhome.org>"}
        disabled={pending}
      />

      {text.trim() && (
        <div className="space-y-2 text-sm">
          {preview.rows.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">First</th>
                    <th className="px-3 py-1.5 font-medium">Last</th>
                    <th className="px-3 py-1.5 font-medium">Email</th>
                    <th className="px-3 py-1.5 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((r) => (
                    <tr key={r.email}>
                      <td className="px-3 py-1.5">{r.first_name}</td>
                      <td className="px-3 py-1.5">{r.last_name}</td>
                      <td className="px-3 py-1.5">{r.email}</td>
                      <td className="px-3 py-1.5">{r.role === "admin" ? "Admin" : "User"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.problems.length > 0 && (
            <ul className="space-y-0.5 rounded-md bg-amber-50 p-3 text-amber-800">
              {preview.problems.map((p) => (
                <li key={p.line}>
                  Line {p.line} skipped ({p.reason}): <span className="font-mono text-xs">{p.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result?.error && <p className="text-sm text-red-700">{result.error}</p>}
      <div className="flex gap-2">
        <button
          className="btn-primary"
          disabled={pending || !preview.rows.length}
          onClick={() => start(async () => setResult(await importUsers(text)))}
        >
          {pending ? "Importing…" : `Import ${preview.rows.length || ""} ${preview.rows.length === 1 ? "user" : "users"}`}
        </button>
        <button className="btn-secondary" disabled={pending} onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ImportDone({ result, onDone }: { result: ImportResult; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const csv = [
    "first_name,last_name,email,role,temporary_password",
    ...result.created.map((u) => [u.first_name, u.last_name, u.email, u.role, u.password].map(csvCell).join(",")),
  ].join("\n");
  const plain = result.created.map((u) => `${u.first_name} ${u.last_name}\t${u.email}\t${u.password}`).join("\n");

  return (
    <div className="card space-y-3 p-4">
      <h2 className="text-base font-semibold text-brand-900">
        Added {result.created.length} {result.created.length === 1 ? "user" : "users"}
      </h2>
      {result.created.length > 0 && (
        <>
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            These temporary passwords are shown only once. Copy or download them now and give each person theirs privately; they
            can change it on their Account page after signing in.
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Name</th>
                  <th className="px-3 py-1.5 font-medium">Email</th>
                  <th className="px-3 py-1.5 font-medium">Role</th>
                  <th className="px-3 py-1.5 font-medium">Temporary password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.created.map((u) => (
                  <tr key={u.email}>
                    <td className="px-3 py-1.5">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="px-3 py-1.5">{u.email}</td>
                    <td className="px-3 py-1.5">{u.role === "admin" ? "Admin" : "User"}</td>
                    <td className="px-3 py-1.5 font-mono">{u.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(plain);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy list"}
            </button>
            <a className="btn-secondary" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="new-users.csv">
              Download CSV
            </a>
          </div>
        </>
      )}
      {result.skipped.length > 0 && (
        <ul className="space-y-0.5 text-sm text-slate-600">
          {result.skipped.map((s) => (
            <li key={s.email}>
              Skipped {s.email}: {s.reason.toLowerCase()}
            </li>
          ))}
        </ul>
      )}
      <button className="btn-primary" onClick={onDone}>
        Done
      </button>
    </div>
  );
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
