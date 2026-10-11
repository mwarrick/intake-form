import { describe, expect, it } from "vitest";
import { fieldsJsonSchema } from "@/lib/extract";
import { paperFields } from "@/lib/form";

// OpenAI strict structured outputs: every object must list all its properties as required
// and set additionalProperties: false.
function checkStrict(node: unknown, path = "$"): string[] {
  if (!node || typeof node !== "object") return [];
  const n = node as Record<string, unknown>;
  const problems: string[] = [];
  if (n.type === "object") {
    const props = Object.keys((n.properties as object) ?? {});
    if (n.additionalProperties !== false) problems.push(`${path}: additionalProperties must be false`);
    const req = (n.required as string[]) ?? [];
    if (props.length !== req.length || !props.every((p) => req.includes(p))) problems.push(`${path}: required must list every property`);
  }
  for (const [k, v] of Object.entries(n)) {
    if (k === "properties") for (const [pk, pv] of Object.entries(v as object)) problems.push(...checkStrict(pv, `${path}.${pk}`));
    else if (k === "items") problems.push(...checkStrict(v, `${path}[]`));
  }
  return problems;
}

describe("extraction schema", () => {
  const s = fieldsJsonSchema(paperFields);
  it("is valid for strict mode", () => {
    expect(checkStrict(s)).toEqual([]);
  });
  it("covers every referrer field and no staff fields", () => {
    const keys = Object.keys((s.properties as any).fields.properties);
    expect(keys).toEqual(paperFields.map((f) => f.id));
    expect(keys).not.toContain("approved");
  });
  it("allows null for yes/no answers", () => {
    const v = (s.properties as any).fields.properties.o2.properties.value;
    expect(v.enum).toEqual(["Yes", "No", null]);
  });
});
