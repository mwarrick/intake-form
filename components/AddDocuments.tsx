"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDocuments } from "@/app/actions";
import { uploadSigned } from "@/lib/client-upload";
import { schema } from "@/lib/form";
import type { ReadStatus } from "@/lib/progress";

const DETECT = "";

/** Add supporting documents to an existing referral, one file or several, each read as soon as it's uploaded. */
export function AddDocuments({ referralId }: { referralId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<{ file: File; label: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      setBusy("Uploading…");
      const before: ReadStatus | null = await status(referralId);
      const res = await addDocuments(
        referralId,
        files.map(({ file, label }) => ({ fileName: file.name, mimeType: file.type || "application/pdf", label })),
      );
      if ("error" in res) throw new Error(res.error);
      await Promise.all(files.map(({ file }, i) => uploadSigned(res.uploads[i], file)));

      setBusy("Reading…");
      const read = await fetch(`/api/referrals/${referralId}/documents`, { method: "POST" });
      if (!read.ok) throw new Error((await read.json().catch(() => null))?.error ?? `Reading failed (${read.status})`);
      setFiles([]);
      setOpen(false);

      // Refresh as each document finishes, until all the new ones are read.
      const expected = (before?.docsTotal ?? 0) + files.length;
      const started = Date.now();
      let last = "";
      while (Date.now() - started < 6 * 60 * 1000) {
        await new Promise((r) => setTimeout(r, 2000));
        const s = await status(referralId);
        if (!s) continue;
        const key = `${s.docsTotal}/${s.docsPending}`;
        if (key !== last) router.refresh();
        last = key;
        if (s.docsTotal >= expected && s.docsPending === 0) break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button className="btn-secondary px-2.5 py-1 text-sm" onClick={() => setOpen(true)} disabled={!!busy}>
          + Add documents
        </button>
        {busy && <span className="text-sm text-slate-600">{busy}</span>}
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Files that arrived separately</span>
        <input
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png"
          className="mt-1 block w-full text-sm"
          disabled={!!busy}
          onChange={(e) => {
            setFiles([...files, ...[...(e.target.files ?? [])].map((file) => ({ file, label: DETECT }))]);
            // The list below shows what's queued; clearing lets the next pick add more files.
            e.target.value = "";
          }}
        />
      </label>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map(({ file, label }, i) => (
            <li key={`${file.name}-${i}`} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-slate-800" title={file.name}>
                {file.name}
              </span>
              <select
                className="input w-auto py-1 text-sm"
                value={label}
                disabled={!!busy}
                onChange={(e) => setFiles(files.map((f, j) => (j === i ? { ...f, label: e.target.value } : f)))}
                aria-label={`Document type for ${file.name}`}
              >
                <option value={DETECT}>Detect automatically</option>
                {schema.attachments.items.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                className="text-slate-400 hover:text-red-700"
                disabled={!!busy}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <button className="btn-primary px-3 py-1 text-sm" disabled={!files.length || !!busy} onClick={submit}>
          {busy ?? `Upload and read${files.length ? ` ${files.length}` : ""}`}
        </button>
        <button
          className="btn-secondary px-3 py-1 text-sm"
          disabled={!!busy}
          onClick={() => {
            setFiles([]);
            setOpen(false);
          }}
        >
          Cancel
        </button>
        {error && <span className="text-sm text-red-700">{error}</span>}
      </div>
    </div>
  );
}

async function status(referralId: string): Promise<ReadStatus | null> {
  return fetch(`/api/referrals/${referralId}/status`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}
