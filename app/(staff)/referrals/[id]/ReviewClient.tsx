"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveDecision, saveReview } from "@/app/actions";
import { DeleteReferral } from "@/components/DeleteReferral";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { ReadingProgress } from "@/components/ReadingProgress";
import { FormSections } from "@/components/FormSections";
import type { SupportingDoc } from "@/lib/documents";
import { type FieldValue, type FormData, fieldRegions, referrerFields, referrerSections, staffFields, staffSection } from "@/lib/form";
import type { ReadProgress, ReadStatus } from "@/lib/progress";
import type { DocumentRow, Referral } from "@/lib/referrals";
import { type Flag, fieldLabel, validate } from "@/lib/validate";

interface Props {
  referral: Referral;
  documents: DocumentRow[];
  supporting: SupportingDoc[];
  threshold: number;
}

export function ReviewClient({ referral, documents, supporting, threshold }: Props) {
  const router = useRouter();
  const processing = referral.status === "processing";
  const docsPending = supporting.filter((d) => d.status === "processing").length;
  // Attachments on an online referral are read right after it's submitted.
  const justSubmitted = Date.now() - new Date(referral.created_at).getTime() < 3 * 60 * 1000;
  const awaitingDocs =
    referral.source === "portal" && justSubmitted && documents.some((d) => d.kind === "attachment") && !supporting.some((s) => s.document_id);

  // Poll while the reader is working on the form or documents: show its progress, and refresh the page when something changes.
  const [progress, setProgress] = useState<ReadProgress | null>(referral.pipeline?.progress ?? null);
  useEffect(() => {
    if (!processing && !docsPending && !awaitingDocs) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/referrals/${referral.id}/status`, { cache: "no-store" }).catch(() => null);
      const body: ReadStatus | null = res?.ok ? await res.json() : null;
      if (!body) return;
      setProgress(body.progress);
      if (body.status !== referral.status || body.docsPending !== docsPending) router.refresh();
    }, processing ? 1500 : 3000);
    return () => clearInterval(t);
  }, [processing, docsPending, awaitingDocs, referral.id, referral.status, router]);

  const fileUrls = new Map(documents.filter((d) => d.url).map((d) => [d.id, d.url!]));

  const pages = documents.filter((d) => d.kind === "page");
  const original = documents.find((d) => d.kind === "original");
  const attachments = documents.filter((d) => d.kind === "attachment");
  // The field to show on the scan; `n` changes on every click so clicking the same field again re-centers it.
  const [locate, setLocate] = useState<{ field: string; n: number } | null>(null);
  // Any referral with a scan: faxed ones, and online ones the referrer pre-filled from their paper form.
  const canLocate = pages.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start">
        {pages.length > 0 && (
          <ScanViewer
            pages={pages}
            formPages={referral.pipeline?.formPages ?? []}
            originalUrl={original?.url}
            locate={locate}
            onClearLocate={() => setLocate(null)}
          />
        )}
        {referral.source === "portal" && (
          <div className={pages.length ? "mt-4" : ""}>
            <AttachmentList attachments={attachments} />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {processing && <ProcessingNotice progress={progress} pageCount={pages.length} />}
        {referral.status === "failed" && <FailedNotice id={referral.id} error={referral.error} />}
        {!processing && referral.status !== "failed" && (
          <>
            <PipelineSummary referral={referral} />
            <DocumentsPanel docs={supporting} flags={referral.doc_flags ?? []} fileUrls={fileUrls} referralId={referral.id} />
            <FieldsEditor
              referral={referral}
              threshold={threshold}
              activeField={locate?.field ?? null}
              onLocate={canLocate ? (field) => setLocate((l) => ({ field, n: (l?.n ?? 0) + 1 })) : undefined}
            />
            <DecisionPanel referral={referral} />
          </>
        )}
      </div>
    </div>
  );
}

// Zoom levels as a multiple of the viewer's width; 1 fits the page width.
const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3, 4];
// Space kept around a located field so its printed label and neighbours stay in view.
const PAD_X = 0.015;
const PAD_Y = 0.008;

function ScanViewer({
  pages,
  formPages,
  originalUrl,
  locate,
  onClearLocate,
}: {
  pages: DocumentRow[];
  formPages: number[];
  originalUrl?: string;
  locate: { field: string; n: number } | null;
  onClearLocate: () => void;
}) {
  // A packet with no form page has nowhere to show a field, so it opens on its first page.
  const formPage = pages.find((p) => formPages.includes(p.page_number ?? -1));
  const [current, setCurrent] = useState(formPage?.page_number ?? pages[0]?.page_number ?? 1);
  const [zoom, setZoom] = useState(1);
  const page = pages.find((p) => p.page_number === current);
  const scroller = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  // Centre of the area to scroll to once the page has laid out at the new zoom, as fractions of the page.
  const pendingCenter = useRef<[number, number] | null>(null);
  // Bumped to re-run the scroll even when locating a field changes neither the page nor the zoom.
  const [scrollTick, setScrollTick] = useState(0);

  const region = locate ? fieldRegions[locate.field] : undefined;
  const box = region && current === formPage?.page_number
    ? { left: region[0] - PAD_X, top: region[1] - PAD_Y, right: region[2] + PAD_X, bottom: region[3] + PAD_Y }
    : null;

  // Locating a field: go to the form page, zoom so the field fills about half the width (at most 200%), and centre it.
  useEffect(() => {
    if (!locate || !region || !formPage) return;
    const width = region[2] - region[0] + 2 * PAD_X;
    const fit = 0.6 / width;
    const level = [...ZOOMS].reverse().find((z) => z <= fit && z <= 2) ?? 1;
    setCurrent(formPage.page_number!);
    setZoom((z) => Math.max(z, level, 1.5));
    pendingCenter.current = [(region[0] + region[2]) / 2, (region[1] + region[3]) / 2];
    setScrollTick((t) => t + 1);
    // On narrow screens the scan sits above the fields; bring it into view when it's off screen.
    const rect = card.current?.getBoundingClientRect();
    if (rect && (rect.bottom < 80 || rect.top > window.innerHeight - 80)) card.current!.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locate]);

  function scrollToPending() {
    const el = scroller.current;
    const img = el?.querySelector("img");
    if (!el || !img || !pendingCenter.current || !img.complete || !img.naturalWidth) return;
    const [cx, cy] = pendingCenter.current;
    el.scrollTo({
      left: cx * img.clientWidth - el.clientWidth / 2,
      top: cy * img.clientHeight - el.clientHeight / 2,
    });
    pendingCenter.current = null;
  }
  useLayoutEffect(scrollToPending, [zoom, current, scrollTick]);

  // Zoom around the centre of what's on screen rather than jumping to the top left.
  function changeZoom(next: number) {
    const el = scroller.current;
    const img = el?.querySelector("img");
    if (el && img?.clientWidth) {
      pendingCenter.current = [
        (el.scrollLeft + el.clientWidth / 2) / img.clientWidth,
        (el.scrollTop + el.clientHeight / 2) / img.clientHeight,
      ];
    }
    setZoom(next);
  }
  const zoomIndex = ZOOMS.indexOf(zoom);

  return (
    <div ref={card} className="card flex flex-col overflow-hidden lg:h-[calc(100vh-2rem)]">
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
        {box && locate && (
          <span className="flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-xs text-sky-800">
            {fieldLabel(locate.field)}
            <button className="text-sky-600 hover:text-sky-900" onClick={onClearLocate} aria-label="Clear highlight">
              ×
            </button>
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <button
            className="btn-secondary px-2 py-0.5 text-xs"
            disabled={zoomIndex <= 0}
            onClick={() => changeZoom(ZOOMS[zoomIndex - 1])}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
          <button
            className="btn-secondary w-14 px-1 py-0.5 text-xs tabular-nums"
            onClick={() => changeZoom(1)}
            title="Fit page width"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="btn-secondary px-2 py-0.5 text-xs"
            disabled={zoomIndex >= ZOOMS.length - 1}
            onClick={() => changeZoom(ZOOMS[zoomIndex + 1])}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
          {originalUrl && (
            <a className="btn-secondary ml-1 px-2 py-0.5 text-xs" href={originalUrl} target="_blank" rel="noreferrer">
              Original
            </a>
          )}
        </span>
      </div>
      <div ref={scroller} className="h-[70vh] overflow-auto bg-slate-100 lg:h-auto lg:min-h-0 lg:flex-1">
        {page?.url ? (
          <div className="relative mx-auto" style={{ width: `${zoom * 100}%` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.url} alt={`Scanned page ${page.page_number}`} className="block w-full" onLoad={scrollToPending} />
            {box && (
              <div
                className="pointer-events-none absolute rounded-sm bg-sky-400/15 ring-2 ring-sky-500"
                style={{
                  left: `${box.left * 100}%`,
                  top: `${box.top * 100}%`,
                  width: `${(box.right - box.left) * 100}%`,
                  height: `${(box.bottom - box.top) * 100}%`,
                }}
              />
            )}
          </div>
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

function ProcessingNotice({ progress, pageCount }: { progress: ReadProgress | null; pageCount: number }) {
  // Mount time stands in until the reader has saved when it started.
  const [mounted] = useState(() => Date.now());
  return (
    <div className="card p-4">
      <p className="mb-3 font-medium text-slate-800">Reading the form…</p>
      <ReadingProgress progress={progress} pageCount={pageCount} since={progress ? Date.parse(progress.startedAt) : mounted} />
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
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await fetch(`/api/referrals/${id}/process`, { method: "POST" });
            router.refresh();
          }}
        >
          Try again
        </button>
        <DeleteReferral id={id} label="Delete and upload again" then="/upload" className="btn-secondary text-red-700" />
      </div>
    </div>
  );
}

function PipelineSummary({ referral }: { referral: Referral }) {
  const p = referral.pipeline;
  const docFlags = referral.doc_flags ?? [];
  // Form answers and supporting documents can raise the same admission concern; list it once.
  const eligibility = dedupe([...(referral.flags ?? []), ...docFlags].filter((f) => f.kind === "eligibility"));
  const toCheck = (referral.flags ?? []).filter((f) => f.kind !== "eligibility");
  const conflicts = docFlags.filter((f) => f.kind === "conflict");
  const tokens = p?.usage?.reduce((s, u) => s + u.input_tokens + u.output_tokens, 0) ?? 0;
  const seconds = (p?.usage?.reduce((s, u) => s + u.ms, 0) ?? 0) / 1000;
  const wasRead = !!p?.usage?.length;
  const edits = p?.referrerEdits;

  return (
    <div className="card space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Stat label="Admission criteria" value={eligibility.length ? `${eligibility.length} concern${eligibility.length > 1 ? "s" : ""}` : "None flagged"} tone={eligibility.length ? "purple" : "green"} />
        <Stat label="Fields to check" value={String(toCheck.length)} tone={toCheck.length ? "amber" : "green"} />
        <Stat label="Document conflicts" value={String(conflicts.length)} tone={conflicts.length ? "red" : "green"} />
        {wasRead && <Stat label="Reader" value={`${seconds.toFixed(0)} s · ${tokens.toLocaleString()} tokens`} />}
      </div>
      {p?.noForm && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          No referral form was found in this packet, so the form fields are blank. Type them in from the records, or ask
          the referrer for the form. The supporting documents were still read.
        </p>
      )}
      {eligibility.length > 0 && (
        <ul className="space-y-1 rounded-md bg-purple-50 p-3 text-sm text-purple-800">
          {eligibility.map((f, i) => (
            <li key={i}>• {f.message}</li>
          ))}
        </ul>
      )}
      {referral.source === "portal" && wasRead && (
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          Filled in from the referrer’s paper form and checked by the referrer before submitting.
          {edits?.length
            ? ` They corrected ${edits.length} field${edits.length > 1 ? "s" : ""}: ${edits.map(fieldLabel).join(", ")}.`
            : " They made no corrections."}
        </p>
      )}
      {wasRead && p && (
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer select-none font-medium text-slate-700">How this was read</summary>
          <ul className="mt-2 space-y-1">
            {p.classifyNotes && (
              <li>
                Pages: {p.noForm ? "no form page found" : `form found on page ${p.formPages?.join(", ")}`}. {p.classifyNotes}
              </li>
            )}
            {!!p.turned?.length && (
              <li>Turned upright: {p.turned.map((t) => `page ${t.page} (${t.degrees}°)`).join(", ")}</li>
            )}
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "amber" | "purple" | "red" }) {
  const color = { green: "text-emerald-700", amber: "text-amber-700", purple: "text-purple-700", red: "text-red-700" }[tone ?? "green"];
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-medium ${tone ? color : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function FieldsEditor({
  referral,
  threshold,
  onLocate,
  activeField,
}: {
  referral: Referral;
  threshold: number;
  onLocate?: (field: string) => void;
  activeField: string | null;
}) {
  const router = useRouter();
  const [data, setData] = useState<FormData>(referral.data);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const confirmed = !!referral.reviewed_at;

  // Read confidence stops mattering once a person has checked the fields: the coordinator, or the referrer on the portal.
  const extraction = confirmed || referral.source === "portal" ? undefined : referral.extraction;
  // Recompute live so fixing a field clears its "missing"/"invalid" flag as you type.
  // Document conflicts sit under the field they contradict; they're recomputed on save.
  const docFieldFlags = useMemo(() => (referral.doc_flags ?? []).filter((f) => f.kind === "conflict" && f.field), [referral.doc_flags]);
  const flags: Flag[] = useMemo(
    () => [...validate(data, { extraction, confidenceThreshold: threshold }), ...docFieldFlags],
    [data, extraction, threshold, docFieldFlags],
  );
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
        onLocate={onLocate}
        activeField={activeField}
      />

      <div className="card sticky bottom-3 flex flex-wrap items-center justify-end gap-2 p-3">
        {saveError && <span className="text-sm text-red-700">{saveError}</span>}
        <span className="mr-auto text-sm text-slate-600">
          {confirmed
            ? `Fields confirmed ${new Date(referral.reviewed_at!).toLocaleString()}`
            : dirty
              ? "Unsaved changes"
              : onLocate
                ? "Click a field to see it on the scan"
                : "Check highlighted fields against the scan"}
        </span>
        {confirmed ? (
          <button className="btn-primary" disabled={pending || !dirty} onClick={() => save(true)}>
            Save changes
          </button>
        ) : (
          <>
            <button className="btn-secondary" disabled={pending || !dirty} onClick={() => save(false)}>
              Save
            </button>
            <button className="btn-primary" disabled={pending} onClick={() => save(true)}>
              Confirm fields
            </button>
          </>
        )}
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

function dedupe(flags: Flag[]): Flag[] {
  return flags.filter((f, i) => flags.findIndex((g) => g.message === f.message) === i);
}

function pick(data: FormData, ids: string[]): FormData {
  return Object.fromEntries(ids.map((id) => [id, data[id] ?? null]));
}
