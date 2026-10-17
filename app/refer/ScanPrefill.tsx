"use client";

import { useState } from "react";
import { getPrefill, startScan } from "@/app/actions";
import { renderPages, uploadSigned } from "@/lib/client-upload";
import type { FormData } from "@/lib/form";
import type { Extraction } from "@/lib/validate";

export interface Prefill {
  draftId: string;
  fileName: string;
  data: FormData;
  extraction: Extraction;
  /** Set when the scan was saved but couldn't be read. */
  error?: string | null;
}

type Phase =
  | { step: "idle" }
  | { step: "working"; message: string }
  | { step: "done"; fileName: string; ok: boolean }
  | { step: "error"; message: string };

const POLL_MS = 2500;
const GIVE_UP_MS = 5 * 60 * 1000;

/** Lets a referrer who already filled in the paper form upload it to pre-fill the online form. */
export function ScanPrefill({ onPrefill, disabled }: { onPrefill: (p: Prefill) => void; disabled?: boolean }) {
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const busy = phase.step === "working";

  async function read(file: File) {
    try {
      setPhase({ step: "working", message: "Preparing pages…" });
      const pages = await renderPages(file, (done, total) =>
        setPhase({ step: "working", message: `Preparing page ${done} of ${total}…` }),
      );

      setPhase({ step: "working", message: "Uploading…" });
      const target = await startScan({ fileName: file.name, mimeType: file.type || "application/pdf" }, pages.length, "prefill");
      if ("error" in target) throw new Error(target.error);
      await Promise.all([
        uploadSigned(target.original, file),
        ...pages.map((p, i) => uploadSigned(target.pages[i], p, "image/jpeg")),
      ]);

      setPhase({ step: "working", message: "Reading your form… this usually takes under a minute." });
      const res = await fetch(`/api/referrals/${target.id}/process`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Reading failed (${res.status})`);

      const started = Date.now();
      for (;;) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const p = await getPrefill(target.id);
        if (!("status" in p)) throw new Error(p.error);
        if (p.status === "draft") {
          onPrefill({
            draftId: target.id,
            fileName: file.name,
            data: p.data ?? {},
            extraction: p.extraction ?? {},
            error: p.error,
          });
          setPhase({ step: "done", fileName: file.name, ok: !p.error });
          return;
        }
        if (Date.now() - started > GIVE_UP_MS) throw new Error("Reading the form is taking too long. Please fill it in below.");
      }
    } catch (e) {
      setPhase({ step: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  if (phase.step === "done") {
    return (
      <div className="card flex flex-wrap items-center gap-3 border-brand-100 bg-brand-50 p-4">
        <span className="text-sm text-brand-900">
          {phase.ok ? (
            <>
              Filled in from <span className="font-medium">{phase.fileName}</span>. Check the highlighted answers against
              your paper form before you submit.
            </>
          ) : (
            <>
              We couldn’t read <span className="font-medium">{phase.fileName}</span>, so please fill in the form below. The
              scan will still be attached to your referral.
            </>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">Already filled out the paper form?</p>
        <p className="text-xs text-slate-500">Upload a scan or photo of it and we’ll fill in this form for you to check.</p>
      </div>
      <label className={`btn-secondary shrink-0 ${busy || disabled ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
        {busy ? "Reading…" : "Upload paper form"}
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="sr-only"
          disabled={busy || disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) read(f);
          }}
        />
      </label>
      {phase.step === "working" && <p className="w-full text-sm text-slate-600">{phase.message}</p>}
      {phase.step === "error" && <p className="w-full text-sm text-red-700">{phase.message}</p>}
    </div>
  );
}
