"use client";

import { FieldInput } from "@/components/FieldInput";
import { type FieldValue, type FormData, type Section, isRequired, isVisible } from "@/lib/form";
import { type Extraction, type Flag, flagsByField } from "@/lib/validate";

interface Props {
  sections: Section[];
  data: FormData;
  onChange: (id: string, v: FieldValue) => void;
  /** portal: follow-up questions appear only when triggered. review: show every field, as on paper. */
  mode: "portal" | "review";
  flags?: Flag[];
  extraction?: Extraction;
  threshold?: number;
  disabled?: boolean;
}

export function FormSections({ sections, data, onChange, mode, flags = [], extraction, threshold, disabled }: Props) {
  const byField = flagsByField(flags);
  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const fields = mode === "portal" ? section.fields.filter((f) => isVisible(f, data)) : section.fields;
        return (
          <section key={section.id} className="card p-4">
            <h2 className="text-base font-semibold text-brand-900">{section.label}</h2>
            {section.instructions && mode === "portal" && (
              <p className="mt-0.5 text-xs text-slate-500">
                Answer each question; an explanation is required where noted.
              </p>
            )}
            <div className="mt-3 grid gap-x-3 gap-y-1 sm:grid-cols-2">
              {fields.map((f) => (
                <FieldInput
                  key={f.id}
                  field={f}
                  value={data[f.id] ?? (f.type === "multi_choice" ? [] : null)}
                  onChange={(v) => onChange(f.id, v)}
                  required={isRequired(f, data)}
                  flags={byField.get(f.id)}
                  extraction={extraction?.[f.id]}
                  threshold={threshold}
                  disabled={disabled}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
