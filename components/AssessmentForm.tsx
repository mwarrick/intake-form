"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAssessment } from "@/app/actions";
import { FormSections } from "@/components/FormSections";
import { assessmentGaps, assessmentSections } from "@/lib/assessment";
import type { FieldValue, FormData } from "@/lib/form";

interface Props {
  referralId: string;
  initial: FormData;
  status: "new" | "draft" | "complete";
}

export function AssessmentForm({ referralId, initial, status }: Props) {
  const router = useRouter();
  const [data, setData] = useState<FormData>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const gaps = assessmentGaps(data);

  function onChange(id: string, v: FieldValue) {
    setData((d) => ({ ...d, [id]: v }));
    setSaved(null);
  }

  function save(complete: boolean) {
    start(async () => {
      const res = await saveAssessment(referralId, data, complete);
      if ("error" in res) return setErrors([res.error]);
      if ("errors" in res && res.errors) return setErrors(res.errors);
      setErrors([]);
      if (complete) router.push(`/referrals/${referralId}/housing-summary`);
      else {
        setSaved("Draft saved");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <FormSections sections={assessmentSections} data={data} onChange={onChange} mode="portal" disabled={pending} />
      <div className="card sticky bottom-0 flex flex-wrap items-center gap-3 p-3">
        <button className="btn-secondary" disabled={pending} onClick={() => save(false)}>
          Save draft
        </button>
        <button className="btn-primary" disabled={pending} onClick={() => save(true)}>
          {status === "complete" ? "Save and view summary" : "Complete assessment"}
        </button>
        {status === "complete" && (
          <Link href={`/referrals/${referralId}/housing-summary`} className="text-sm text-brand-700 hover:underline">
            View summary
          </Link>
        )}
        <span className="text-sm text-slate-500">
          {saved ?? (gaps.length ? `${gaps.length} required answer${gaps.length > 1 ? "s" : ""} left` : "All required answers given")}
        </span>
        {errors.length > 0 && (
          <ul className="w-full text-sm text-red-700">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
