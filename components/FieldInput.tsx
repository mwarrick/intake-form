"use client";

import type { Field, FieldValue } from "@/lib/form";
import type { FieldExtraction, Flag } from "@/lib/validate";

const FLAG_STYLES: Record<Flag["kind"], string> = {
  missing: "text-red-700",
  invalid: "text-red-700",
  eligibility: "text-purple-700",
  ambiguous: "text-amber-700",
  low_confidence: "text-amber-700",
  disagreement: "text-amber-700",
  conflict: "text-red-700",
  document: "text-slate-600",
};

export function confidenceTone(c: number, threshold: number) {
  if (c >= 0.9) return "bg-emerald-50 text-emerald-700";
  if (c >= threshold) return "bg-slate-100 text-slate-600";
  return "bg-amber-100 text-amber-800";
}

interface Props {
  field: Field;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
  required?: boolean;
  flags?: Flag[];
  extraction?: FieldExtraction;
  threshold?: number;
  disabled?: boolean;
  /** Called when the field is clicked or focused, to show it on the scan. */
  onLocate?: () => void;
  /** The field currently shown on the scan. */
  active?: boolean;
}

export function FieldInput({ field, value, onChange, required, flags, extraction, threshold = 0.75, disabled, onLocate, active }: Props) {
  const id = `f-${field.id}`;
  const attention = flags?.some((f) => f.kind !== "eligibility");
  const wide = field.type === "longtext" || field.type === "multi_choice";

  return (
    <div
      className={`${wide ? "sm:col-span-2" : ""} rounded-md p-2 ${attention ? "bg-amber-50 ring-1 ring-amber-200" : ""} ${
        active ? "ring-2 ring-sky-400" : ""
      } ${onLocate ? "cursor-pointer" : ""}`}
      data-field={field.id}
      onClick={onLocate}
      onFocusCapture={onLocate}
      title={onLocate ? "Click to show this field on the scan" : undefined}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {field.label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
        {extraction?.redacted && value == null ? (
          <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-white" title="Blacked out on the scan (removed for privacy)">
            Redacted
          </span>
        ) : extraction && (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${confidenceTone(extraction.confidence, threshold)}`}
            title={`Read by ${extraction.model}${extraction.raw ? ` · written as "${extraction.raw}"` : ""}`}
          >
            {Math.round(extraction.confidence * 100)}%
          </span>
        )}
      </div>

      <Control id={id} field={field} value={value} onChange={onChange} disabled={disabled} />

      {extraction?.raw && field.type !== "yes_no" && String(value ?? "") !== extraction.raw && (
        <p className="mt-1 text-xs text-slate-500">Written as: “{extraction.raw}”</p>
      )}
      {extraction?.firstPass && (
        <p className="mt-1 text-xs text-slate-500">
          First reading ({extraction.firstPass.model}): {display(extraction.firstPass.value)}
        </p>
      )}
      {flags?.map((f, i) => (
        <p key={i} className={`mt-1 text-xs ${FLAG_STYLES[f.kind]}`}>
          {f.message}
        </p>
      ))}
    </div>
  );
}

function display(v: unknown) {
  if (v === null || v === undefined || v === "") return "blank";
  return Array.isArray(v) ? v.join(", ") || "none" : String(v);
}

function Control({
  id,
  field,
  value,
  onChange,
  disabled,
}: {
  id: string;
  field: Field;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
  disabled?: boolean;
}) {
  const str = value === null || value === undefined ? "" : String(value);

  switch (field.type) {
    case "yes_no":
    case "single_choice": {
      const options = field.type === "yes_no" ? ["Yes", "No"] : field.options ?? [];
      return (
        <div id={id} role="radiogroup" className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const on = value === opt;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                onClick={() => onChange(on ? null : opt)}
                className={`rounded-md border px-3 py-1 text-sm transition ${
                  on
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-brand-500"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    case "multi_choice": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div id={id} className="grid gap-1.5 sm:grid-cols-2">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="size-4 accent-brand-600"
                checked={selected.includes(opt)}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked ? [...selected, opt] : selected.filter((s) => s !== opt))}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    case "longtext":
      return (
        <textarea id={id} className="input min-h-20" value={str} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      );
    case "integer":
      return (
        <input
          id={id}
          type="number"
          inputMode="numeric"
          className="input"
          value={str}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );
    default: {
      const type = { date: "date", time: "time", email: "email", phone: "tel" }[field.type as string] ?? "text";
      return (
        <input
          id={id}
          type={type}
          className="input"
          value={str}
          disabled={disabled}
          maxLength={field.id === "ssn_last4" ? 4 : undefined}
          inputMode={field.id === "ssn_last4" ? "numeric" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
  }
}
