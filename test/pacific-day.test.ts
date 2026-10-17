import { describe, expect, it } from "vitest";
import { localDate, pacificDayStart } from "@/lib/metrics";

describe("pacificDayStart", () => {
  it("is Pacific midnight in daylight and standard time", () => {
    expect(pacificDayStart("2026-10-14")).toBe("2026-10-14T07:00:00.000Z");
    expect(pacificDayStart("2026-12-01")).toBe("2026-12-01T08:00:00.000Z");
  });

  it("handles the days the clocks change", () => {
    expect(pacificDayStart("2026-03-08")).toBe("2026-03-08T08:00:00.000Z");
    expect(pacificDayStart("2026-03-09")).toBe("2026-03-09T07:00:00.000Z");
    expect(pacificDayStart("2026-11-01")).toBe("2026-11-01T07:00:00.000Z");
    expect(pacificDayStart("2026-11-02")).toBe("2026-11-02T08:00:00.000Z");
  });

  it("agrees with localDate on either side of midnight", () => {
    const start = Date.parse(pacificDayStart("2026-10-14"));
    expect(localDate(new Date(start))).toBe("2026-10-14");
    expect(localDate(new Date(start - 1))).toBe("2026-10-13");
  });
});
