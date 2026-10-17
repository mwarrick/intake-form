import { describe, expect, it } from "vitest";
import { fieldLocation, fieldsJsonSchema } from "@/lib/extract";
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

describe("field locations from the reader", () => {
  const at = (page: number | null, box: (number | null)[]) => {
    const [left, top, right, bottom] = box;
    return { value: null, raw: null, confidence: 1, page, left, top, right, bottom };
  };
  it("keeps a box on a form page", () => {
    expect(fieldLocation(at(2, [0.1, 0.3, 0.4, 0.33]), [2])).toEqual({ page: 2, box: [0.1, 0.3, 0.4, 0.33] });
  });
  it("reads boxes given in thousandths or percent as fractions", () => {
    expect(fieldLocation(at(2, [100, 300, 400, 330]), [2])?.box).toEqual([0.1, 0.3, 0.4, 0.33]);
    expect(fieldLocation(at(2, [10, 30, 40, 33]), [2])?.box).toEqual([0.1, 0.3, 0.4, 0.33]);
  });
  it("drops a missing, off-form, empty or page-sized box", () => {
    expect(fieldLocation(at(null, [null, null, null, null]), [2])).toBeUndefined();
    expect(fieldLocation(at(5, [0.1, 0.3, 0.4, 0.33]), [2])).toBeUndefined();
    expect(fieldLocation(at(2, [0.4, 0.3, 0.1, 0.33]), [2])).toBeUndefined();
    expect(fieldLocation(at(2, [0, 0, 1, 1]), [2])).toBeUndefined();
    expect(fieldLocation(undefined, [2])).toBeUndefined();
  });
});
