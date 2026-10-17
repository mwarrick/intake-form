"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startScan } from "@/app/actions";
import { type ClientStep, ReadingProgressModal } from "@/components/ReadingProgress";
import { renderPages, uploadSigned } from "@/lib/client-upload";
import type { ReadProgress, ReadStatus } from "@/lib/progress";

type Phase =
  | { step: "idle" }
  | { step: "working"; since: number; pageCount: number; client?: ClientStep; progress: ReadProgress | null }
  | { step: "error"; message: string };

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const busy = phase.step === "working";

  async function submit() {
    if (!file) return;
    const since = Date.now();
    const working = (pageCount: number, client?: ClientStep, progress: ReadProgress | null = null) =>
      setPhase({ step: "working", since, pageCount, client, progress });
    try {
      working(0, { step: "prepare", done: 0, total: 1 });
      const pages = await renderPages(file, (done, total) => working(total, { step: "prepare", done, total }));

      working(pages.length, { step: "upload", total: pages.length });
      const target = await startScan({ fileName: file.name, mimeType: file.type || "application/pdf" }, pages.length);
      if ("error" in target) throw new Error(target.error);
      await Promise.all(pages.map((p, i) => uploadSigned(target.pages[i], p, "image/jpeg")));

      // The reader only needs the page images, so it starts now while the original (often 10+ MB) finishes uploading.
      working(pages.length);
      const original = uploadSigned(target.original, file).then(
        () => null,
        (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
      );
      const res = await fetch(`/api/referrals/${target.id}/process`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Processing failed (${res.status})`);

      // Follow the reader step by step; open the review screen once the form is read (or reading failed).
      // The reader's time limit is 5 minutes; stop waiting a little after that.
      while (Date.now() - since < 6 * 60 * 1000) {
        await new Promise((r) => setTimeout(r, 1500));
        const s: ReadStatus | null = await fetch(`/api/referrals/${target.id}/status`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (s && s.status !== "processing") break;
        if (s?.progress) working(pages.length, undefined, s.progress);
      }
      // Leaving the page would cancel the original's upload.
      const originalError = await original;
      if (originalError) throw new Error(`The form was read, but the original file didn't upload: ${originalError.message}`);
      router.push(`/referrals/${target.id}`);
    } catch (e) {
      setPhase({ step: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="card p-5">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) setFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition ${
          dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-brand-500"
        }`}
      >
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="sr-only"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <span className="text-sm font-medium text-slate-800">
          {file ? file.name : "Drop a referral PDF or photo here, or click to choose"}
        </span>
        <span className="mt-1 text-xs text-slate-500">
          {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "PDF (any number of pages), JPEG or PNG"}
        </span>
      </label>

      <div className="mt-4 flex items-center gap-3">
        <button className="btn-primary shrink-0" disabled={!file || busy} onClick={submit}>
          {busy ? "Working…" : "Read form"}
        </button>
        {phase.step === "error" && <span className="text-sm text-red-700">{phase.message}</span>}
      </div>

      {phase.step === "working" && file && (
        <ReadingProgressModal
          fileName={file.name}
          client={phase.client}
          progress={phase.progress}
          pageCount={phase.pageCount}
          since={phase.since}
        />
      )}
    </div>
  );
}
