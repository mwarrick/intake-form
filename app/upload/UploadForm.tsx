"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startScan } from "@/app/actions";
import { renderPages, uploadSigned } from "@/lib/client-upload";

type Phase = { step: "idle" } | { step: "working"; message: string } | { step: "error"; message: string };

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const busy = phase.step === "working";

  async function submit() {
    if (!file) return;
    try {
      setPhase({ step: "working", message: "Preparing pages…" });
      const pages = await renderPages(file, (done, total) =>
        setPhase({ step: "working", message: `Preparing page ${done} of ${total}…` }),
      );

      setPhase({ step: "working", message: "Uploading…" });
      const target = await startScan({ fileName: file.name, mimeType: file.type || "application/pdf" }, pages.length);
      if ("error" in target) throw new Error(target.error);
      await Promise.all([
        uploadSigned(target.original, file),
        ...pages.map((p, i) => uploadSigned(target.pages[i], p, "image/jpeg")),
      ]);

      setPhase({ step: "working", message: "Starting the reader…" });
      const res = await fetch(`/api/referrals/${target.id}/process`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Processing failed (${res.status})`);
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
        {phase.step === "working" && <span className="text-sm text-slate-600">{phase.message}</span>}
        {phase.step === "error" && <span className="text-sm text-red-700">{phase.message}</span>}
      </div>
    </div>
  );
}
