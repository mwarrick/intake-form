"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveDecision, saveReview } from "@/app/actions";
import { FormSections } from "@/components/FormSections";
import { type FieldValue, type FormData, referrerFields, referrerSections, staffFields, staffSection } from "@/lib/form";
import type { DocumentRow, Referral } from "@/lib/referrals";
import { type Flag, fieldLabel, validate } from "@/lib/validate";

interface Props {
  referral: Referral;
  documents: DocumentRow[];
  threshold: number;
}

export function ReviewClient({ referral, documents, threshold }: Props) {
  const router = useRouter();
  const processing = referral.status === "processing";

  // Poll the status while the reader is working; refresh the page once it is done.
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/referrals/${referral.id}/status`, { cache: "no-store" }).catch(() => null);
      const body = res?.ok ? await res.json() : null;
      if (body && body.status !== "processing") router.refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [processing, referral.id, router]);

  const pages = documents.filter((d) => d.kind === "page");
  const original = documents.find((d) => d.kind === "original");
  const attachments = documents.filter((d) => d.kind === "attachment");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start">
        {referral.source === "scan" ? (
          <ScanViewer pages={pages} formPages={referral.pipeline?.formPages ?? []} originalUrl={original?.url} />
        ) : (
          <AttachmentList attachments={attachments} />
        )}
      </div>

      <div className="space-y-4">
        {processing && <ProcessingNotice />}
        {referral.status === "failed" && <FailedNotice id={referral.id} error={referral.error} />}
        {!processing && referral.status !== "failed" && (
          <>
            <PipelineSummary referral={referral} />
            <FieldsEditor referral={referral} threshold={threshold} />
            <DecisionPanel referral={referral} />
          </>
        )}
      </div>
    </div>
  );
}

function ScanViewer({ pages, formPages, originalUrl }: { pages: DocumentRow[]; formPages: number[]; originalUrl?: string }) {
  const first = pages.find((p) => formPages.includes(p.page_number ?? -1)) ?? pages[0];
  const [current, setCurrent] = useState(first?.page_number ?? 1);
  const [zoom, setZoom] = useState(false);
  const page = pages.find((p) => p.page_number === current);

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 p-2">
        {pages.map((p) => (
          <button
            key={p.id}
            onClick={() => setCurrent(p.page_number!)}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              p.page_number === current ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            title={formPages.includes(p.page_number!) ? "Referral form page" : undefined}
          >
            {p.page_number}
            {formPages.includes(p.page_number!) && " ★"}
          </button>
        ))}
        <span className="ml-auto flex gap-2">
          <button className="btn-secondary px-2 py-0.5 text-xs" onClick={() => setZoom((z) => !z)}>
            {zoom ? "Fit width" : "Zoom"}
          </button>
          {originalUrl && (
            <a className="btn-secondary px-2 py-0.5 text-xs" href={originalUrl} target="_blank" rel="noreferrer">
              Original
            </a>
          )}
        </span>
      </div>
      <div className="min-h-[60vh] flex-1 overflow-auto bg-slate-100">
        {page?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.url}
            alt={`Scanned page ${page.page_number}`}
            className={zoom ? "max-w-none" : "w-full"}
            style={zoom ? { width: "200%" } : undefined}
          />
        ) : (
          <p className="p-6 text-sm text-slate-500">Page image not available.</p>
        )}
      </div>
    </div>
  );
}

function AttachmentList({ attachments }: { attachments: DocumentRow[] }) {
  return (
    <div className="card p-4">
      <h2 className="text-base font-semibold text-brand-900">Supporting documents</h2>
      {attachments.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">None attached.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="block text-slate-800">{a.label}</span>
                <span className="text-xs text-slate-500">{a.file_name}</span>
              </span>
              {a.url && (
                <a href={a.url} target="_blank" rel="noreferrer" className="btn-secondary px-2 py-0.5 text-xs">
                  Open
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProcessingNotice() {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="size-3 animate-pulse rounded-full bg-sky-500" />
      <div>
        <p className="font-medium text-slate-800">Reading the form…</p>
        <p className="text-sm text-slate-600">Finding the form page, reading fields, re-checking unclear ones. Usually under a minute.</p>
      </div>
    </div>
  );
}

function FailedNotice({ id, error }: { id: string; error: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="card border-red-200 p-4">
      <p className="font-medium text-red-800">The reader couldn’t process this scan.</p>
      {error && <p className="mt-1 break-words font-mono text-xs text-red-700">{error}</p>}
      <button
        className="btn-secondary mt-3"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await fetch(`/api/referrals/${id}/process`, { method: "POST" });
          router.refresh();
        }}
      >
        Try again
      </button>
    </div>
  );
}

function PipelineSummary({ referral }: { referral: Referral }) {
  const p = referral.pipeline;
  const eligibility = (referral.flags ?? []).filter((f) => f.kind === "eligibility");
  const toCheck = (referral.flags ?? []).filter((f) => f.kind !== "eligibility");
  const tokens = p?.usage?.reduce((s, u) => s + u.input_tokens + u.output_tokens, 0) ?? 0;
  const seconds = (p?.usage?.reduce((s, u) => s + u.ms, 0) ?? 0) / 1000;

  return (
    <div className="card space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Stat label="Admission criteria" value={eligibility.length ? `${eligibility.length} concern${eligibility.length > 1 ? "s" : ""}` : "None flagged"} tone={eligibility.length ? "purple" : "green"} />
        <Stat label="Fields to check" value={String(toCheck.length)} tone={toCheck.length ? "amber" : "green"} />
        {referral.source === "scan" && <Stat label="Reader" value={`${seconds.toFixed(0)} s · ${tokens.toLocaleString()} tokens`} />}
      </div>
      {eligibility.length > 0 && (
        <ul className="space-y-1 rounded-md bg-purple-50 p-3 text-sm text-purple-800">
          {eligibility.map((f, i) => (
            <li key={i}>• {f.message}</li>
          ))}
        </ul>
      )}
      {referral.source === "scan" && p && (
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer select-none font-medium text-slate-700">How this was read</summary>
          <ul className="mt-2 space-y-1">
            {p.classifyNotes && <li>Pages: form found on page {p.formPages?.join(", ")}. {p.classifyNotes}</li>}
            {p.usage?.map((u, i) => (
              <li key={i}>
                <span className="font-medium">{u.step}</span> · {u.model} · {(u.ms / 1000).toFixed(1)} s ·{" "}
                {u.input_tokens.toLocaleString()} in / {u.output_tokens.toLocaleString()} out
              </li>
            ))}
            {!!p.rereadFields?.length && <li>Re-read: {p.rereadFields.map(fieldLabel).join(", ")}</li>}
            {p.extractNotes && <li>Reader notes: {p.extractNotes}</li>}
          </ul>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" | "purple" }) {
  const color = { green: "text-emerald-700", amber: "text-amber-700", purple: "text-purple-700" }[tone ?? "green"];
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-medium ${tone ? color : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function FieldsEditor({ referral, threshold }: { referral: Referral; threshold: number }) {
  const router = useRouter();
  const [data, setData] = useState<FormData>(referral.data);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const confirmed = !!referral.reviewed_at;

  const extraction = confirmed ? undefined : referral.extraction;
  // Recompute live so fixing a field clears its "missing"/"invalid" flag as you type.
  const flags: Flag[] = useMemo(() => validate(data, { extraction, confidenceThreshold: threshold }), [data, extraction, threshold]);
  const flagged = new Set(flags.map((f) => f.field));

  const sections = onlyFlagged
    ? referrerSections
        .map((s) => ({ ...s, fields: s.fields.filter((f) => flagged.has(f.id)) }))
        .filter((s) => s.fields.length)
    : referrerSections;

  function set(id: string, v: FieldValue) {
    setData((d) => ({ ...d, [id]: v }));
    setDirty(true);
  }

  function save(confirm: boolean) {
    start(async () => {
      const res = await saveReview(referral.id, pick(data, referrerFields.map((f) => f.id)), confirm);
      if ("error" in res) {
        setSaveError(res.error);
        return;
      }
      setSaveError(null);
      setDirty(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-brand-900">Referral form</h2>
        {referral.source === "scan" && (
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" className="accent-brand-600" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
            Only fields to check ({flagged.size})
          </label>
        )}
      </div>

      <FormSections
        sections={sections}
        data={data}
        onChange={set}
        mode="review"
        flags={flags}
        extraction={extraction}
        threshold={threshold}
        disabled={pending}
      />

      <div className="card sticky bottom-3 flex flex-wrap items-center justify-end gap-2 p-3">
        {saveError && <span className="text-sm text-red-700">{saveError}</span>}
        <span className="mr-auto text-sm text-slate-600">
          {confirmed ? `Fields confirmed ${new Date(referral.reviewed_at!).toLocaleString()}` : dirty ? "Unsaved changes" : "Check highlighted fields against the scan"}
        </span>
        <button className="btn-secondary" disabled={pending || !dirty} onClick={() => save(false)}>
          Save
        </button>
        <button className="btn-primary" disabled={pending} onClick={() => save(true)}>
          {confirmed ? "Save changes" : "Confirm fields"}
        </button>
      </div>
    </div>
  );
}

function DecisionPanel({ referral }: { referral: Referral }) {
  const router = useRouter();
  const [data, setData] = useState<FormData>(() => pick(referral.data, staffFields.map((f) => f.id)));
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      <FormSections
        sections={[staffSection]}
        data={data}
        onChange={(id, v) => setData((d) => ({ ...d, [id]: v }))}
        mode="portal"
        disabled={pending}
      />
      {errors.length > 0 && (
        <ul className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <button
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveDecision(referral.id, data);
              const errs = "error" in res ? [res.error] : "errors" in res ? (res.errors ?? []) : [];
              setErrors(errs);
              if (!errs.length) router.refresh();
            })
          }
        >
          Save staff section
        </button>
      </div>
    </div>
  );
}

function pick(data: FormData, ids: string[]): FormData {
  return Object.fromEntries(ids.map((id) => [id, data[id] ?? null]));
}
