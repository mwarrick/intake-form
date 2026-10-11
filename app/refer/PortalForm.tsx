"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitPortalReferral } from "@/app/actions";
import { FormSections } from "@/components/FormSections";
import { uploadSigned } from "@/lib/client-upload";
import { type FieldValue, type FormData, emptyData, referrerFields, referrerSections, schema } from "@/lib/form";
import { validate } from "@/lib/validate";

interface Attachment {
  label: string;
  file: File;
}

export function PortalForm() {
  const router = useRouter();
  const [data, setData] = useState<FormData>(() => emptyData(referrerFields));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);

  const flags = validate(data);
  const blocking = flags.filter((f) => f.kind === "missing" || f.kind === "invalid");
  const eligibility = flags.filter((f) => f.kind === "eligibility");

  function set(id: string, v: FieldValue) {
    setData((d) => ({ ...d, [id]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    setServerErrors([]);
    if (blocking.length) {
      document.querySelector(`[data-field="${blocking[0].field}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      const res = await submitPortalReferral(
        data,
        attachments.map((a) => ({ label: a.label, fileName: a.file.name, mimeType: a.file.type })),
      );
      if ("error" in res) throw new Error(res.error);
      if ("errors" in res) {
        setServerErrors(res.errors);
        return;
      }
      await Promise.all(res.uploads.map((u, i) => uploadSigned(u, attachments[i].file)));
      router.push(`/refer/thanks?id=${res.id}`);
    } catch (err) {
      setServerErrors([err instanceof Error ? err.message : String(err)]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormSections
        sections={referrerSections}
        data={data}
        onChange={set}
        mode="portal"
        flags={showErrors ? flags : eligibility}
        disabled={busy}
      />

      <section className="card p-4">
        <h2 className="text-base font-semibold text-brand-900">{schema.attachments.label}</h2>
        <p className="mt-0.5 text-xs text-slate-500">Attach supporting documents. PDFs or images.</p>
        <ul className="mt-3 divide-y divide-slate-100">
          {schema.attachments.items.map((item) => {
            const files = attachments.filter((a) => a.label === item);
            return (
              <li key={item} className="flex flex-wrap items-center gap-3 py-2">
                <span className={`size-2 rounded-full ${files.length ? "bg-emerald-500" : "bg-slate-300"}`} />
                <span className="flex-1 text-sm text-slate-700">{item}</span>
                {files.map((a) => (
                  <span key={a.file.name} className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs">
                    {a.file.name}
                    <button
                      type="button"
                      className="text-slate-500 hover:text-red-600"
                      aria-label={`Remove ${a.file.name}`}
                      onClick={() => setAttachments((all) => all.filter((x) => x !== a))}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <label className="btn-secondary cursor-pointer py-1 text-xs">
                  Add file
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    accept="application/pdf,image/*"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []);
                      setAttachments((all) => [...all, ...picked.map((file) => ({ label: item, file }))]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {eligibility.length > 0 && (
        <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
          <p className="font-medium">Some answers don’t meet the admission criteria.</p>
          <p className="mt-0.5">You can still submit; a referral coordinator will review and may contact you.</p>
        </div>
      )}

      {(serverErrors.length > 0 || (showErrors && blocking.length > 0)) && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Please fix the following before submitting:</p>
          <ul className="mt-1 list-disc pl-5">
            {(serverErrors.length ? serverErrors : blocking.map((f) => f.message)).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Submitting…" : "Submit referral"}
        </button>
      </div>
    </form>
  );
}
