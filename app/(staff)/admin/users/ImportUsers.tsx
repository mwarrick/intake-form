"use client";

import { useMemo, useState, useTransition } from "react";
import { type ImportResult, importUsers } from "@/app/admin-actions";
import { ROLE_LABELS } from "@/lib/roles";
import { parseStaffList, staffEmail } from "@/lib/user-import";

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
          Choose a CSV file or paste rows from a spreadsheet with the columns <code>firstname, lastname, email</code> (and
          optionally <code>role</code>). A header row is fine. Leave email blank to use the full name run together, e.g.{" "}
          <code>{staffEmail("Dana", "Whitfield")}</code>. Put <code>admin</code> or <code>clinical</code> (or
          <code>nurse</code>, <code>LVN</code>, <code>RN</code>) in the role column; everyone else is a user.
        </p>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">CSV file</span>
        <input
          type="file"
          accept=".csv,text/csv,.tsv,.txt"
          className="mt-1 block w-full text-sm"
          disabled={pending}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setText(await file.text());
            e.target.value = "";
          }}
        />
      </label>
      <textarea
        className="input min-h-40 font-mono text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"firstname,lastname,email\nDana,Whitfield,\nKim,Nguyen,knguyen@example.org"}
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
                      <td className="px-3 py-1.5">
                        {r.email}
                        {r.generatedEmail && <span className="ml-1.5 text-xs text-slate-500">(from name)</span>}
                      </td>
                      <td className="px-3 py-1.5">{ROLE_LABELS[r.role]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.rows.some((r) => r.generatedEmail) && (
            <p className="text-xs text-slate-500">
              Emails marked “from name” were made from the first and last name. Check them before importing: nicknames and
              shared names can make addresses that don’t exist.
            </p>
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
  const plain = result.created.map((u) => `${u.first_name} ${u.last_name}\t${u.email}`).join("\n");

  return (
    <div className="card space-y-3 p-4">
      <h2 className="text-base font-semibold text-brand-900">
        Added {result.created.length} {result.created.length === 1 ? "user" : "users"}
      </h2>
      {result.created.length > 0 && (
        <>
          <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            Tell each person to sign in with just their email address (no password) and choose a password. Until they do,
            anyone who knows their email could claim the account, so let them know soon.
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-1.5 font-medium">Name</th>
                  <th className="px-3 py-1.5 font-medium">Email (sign-in)</th>
                  <th className="px-3 py-1.5 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.created.map((u) => (
                  <tr key={u.email}>
                    <td className="px-3 py-1.5">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="px-3 py-1.5">{u.email}</td>
                    <td className="px-3 py-1.5">{ROLE_LABELS[u.role]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="btn-secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(plain);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy names and emails"}
          </button>
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
