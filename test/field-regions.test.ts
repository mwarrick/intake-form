import { describe, expect, it } from "vitest";
import { fieldRegions, paperFields } from "@/lib/form";

describe("field regions", () => {
  it("places every field printed on the paper form", () => {
    expect(paperFields.filter((f) => !fieldRegions[f.id]).map((f) => f.id)).toEqual([]);
  });

  it("are boxes inside the page", () => {
    for (const [id, [left, top, right, bottom]] of Object.entries(fieldRegions)) {
      expect(left, id).toBeGreaterThanOrEqual(0);
      expect(top, id).toBeGreaterThanOrEqual(0);
      expect(right, id).toBeLessThanOrEqual(1);
      expect(bottom, id).toBeLessThanOrEqual(1);
      expect(right, id).toBeGreaterThan(left);
      expect(bottom, id).toBeGreaterThan(top);
    }
  });
});
