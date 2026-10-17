"use client";

import { useEffect, useState } from "react";
import type { ReadProgress } from "@/lib/progress";

/** Steps that happen in the browser before the server starts reading. */
export type ClientStep = { step: "prepare"; done: number; total: number } | { step: "upload"; total: number };

interface Props {
  /** Set while the browser is still preparing or uploading pages. */
  client?: ClientStep;
  /** The server's progress once reading has started. */
  progress: ReadProgress | null;
  pageCount: number;
  /** When the whole job started (ms since epoch), for the elapsed-time counter. */
  since: number;
}

type Row = { label: string; detail?: string; state: "done" | "active" | "todo" };

/** Live list of reading steps, with a check for each finished one and a timer. */
export function ReadingProgress({ client, progress, pageCount, since }: Props) {
  const elapsed = useElapsed(since);
  const multi = pageCount > 1;

  // Order: prepare, upload, (find form page), read fields, double-check.
  const order = ["prepare", "upload", ...(multi ? ["classify"] : []), "extract", "reread"];
  const current = client?.step ?? (progress?.step === "start" || !progress ? (multi ? "classify" : "extract") : progress.step);
  const at = order.indexOf(current);
  const state = (id: string): Row["state"] => {
    const i = order.indexOf(id);
    return i < at ? "done" : i === at ? "active" : "todo";
  };
  const formPages = progress?.formPages?.join(", ");

  const rows: Row[] = [
    {
      label: "Preparing pages",
      detail: client?.step === "prepare" ? `page ${client.done} of ${client.total}` : undefined,
      state: state("prepare"),
    },
    { label: pageCount ? `Uploading ${pageCount} page${pageCount === 1 ? "" : "s"}` : "Uploading pages", state: state("upload") },
    ...(multi ? [{ label: `Finding the referral form among ${pageCount} pages`, state: state("classify") } as Row] : []),
    {
      label: "Reading every field on the form",
      detail: multi && formPages ? `page ${formPages}` : undefined,
      state: state("extract"),
    },
    {
      label: progress?.fields
        ? `Double-checking ${progress.fields} fields with the stronger model`
        : "Double-checking unclear fields and patient details",
      state: state("reread"),
    },
  ];

  return (
    <div aria-live="polite">
      <ol className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-2.5 text-sm">
            <StepIcon state={r.state} />
            <span className={r.state === "todo" ? "text-slate-400" : r.state === "active" ? "font-medium text-slate-900" : "text-slate-600"}>
              {r.label}
              {r.detail && <span className="ml-1.5 text-xs font-normal text-slate-500">{r.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 flex justify-between text-xs text-slate-500">
        <span>Usually under a minute; large packets take longer.</span>
        <span className="tabular-nums">{elapsed}</span>
      </p>
      {multi && (
        <p className="mt-2 text-xs text-slate-500">Supporting documents in the packet keep loading on the review screen after the form is read.</p>
      )}
    </div>
  );
}

/** Full-screen modal around the progress list, for the upload page. */
export function ReadingProgressModal(props: Props & { fileName: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reading-title">
      <div className="card w-full max-w-md p-5 shadow-xl">
        <h2 id="reading-title" className="text-base font-semibold text-brand-900">
          Reading the referral
        </h2>
        <p className="mb-4 mt-0.5 truncate text-sm text-slate-500">{props.fileName}</p>
        <ReadingProgress {...props} />
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: Row["state"] }) {
  if (state === "done")
    return (
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white" aria-label="Done">
        ✓
      </span>
    );
  if (state === "active")
    return <span className="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" aria-label="In progress" />;
  return <span className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-slate-200" aria-hidden />;
}

function useElapsed(since: number): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
