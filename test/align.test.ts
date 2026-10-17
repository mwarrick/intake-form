import { describe, expect, it } from "vitest";
import { type Affine, type Layout, type ScanWord, alignPage, fitAffine, layouts, placeRegion, sameWord } from "@/lib/align";
import type { Region } from "@/lib/form";

const laOc = layouts.find((l) => l.name.includes("LA/OC"))!;
const rc0725 = layouts.find((l) => l.name.includes("RC0725"))!;

// A fax: shrunk a little, pushed down and right, and tilted about 1°.
const FAX: Affine = [0.95, -0.017, 0.03, 0.017, 0.93, 0.05];

const move = (t: Affine, b: Region): Region => placeRegion(b, t);

/** What text recognition would find on a fax of this layout: its printed words, moved, plus some handwriting. */
function scanOf(layout: Layout, t: Affine): ScanWord[] {
  const printed = [...layout.anchors, ...Object.values(layout.labels ?? {}).flat()];
  return [
    ...printed.map((w) => ({ text: w.t, box: move(t, w.b) })),
    { text: "Banks", box: [0.3, 0.2, 0.36, 0.21] },
    { text: "WB00639127", box: [0.5, 0.2, 0.6, 0.21] },
  ];
}

const near = (a: Region, b: Region, tol = 0.01) => a.every((v, i) => Math.abs(v - b[i]) < tol);

describe("lining the field map up with a scan", () => {
  it("picks the LA/OC form and places its fields where the fax moved them", () => {
    const a = alignPage(scanOf(laOc, FAX))!;
    expect(a.layout).toBe(laOc.name);
    expect(a.inliers).toBe(a.matched);
    for (const [id, r] of Object.entries(laOc.regions)) expect(near(a.regions[id], move(FAX, r)), id).toBe(true);
    expect(a.found.mrn).toBeGreaterThan(0);
  });

  it("picks the RC0725-SH form for a scan of it", () => {
    const a = alignPage(scanOf(rc0725, FAX))!;
    expect(a.layout).toBe(rc0725.name);
    expect(near(a.regions.mrn, move(FAX, rc0725.regions.mrn))).toBe(true);
  });

  it("ignores printed words that were matched in the wrong place", () => {
    const words = scanOf(laOc, FAX).map((w, i) => (i % 9 === 0 ? { ...w, box: [0.9, 0.9, 0.95, 0.91] as Region } : w));
    const a = alignPage(words)!;
    expect(a.layout).toBe(laOc.name);
    expect(near(a.regions.patient_name, move(FAX, laOc.regions.patient_name))).toBe(true);
  });

  it("snaps a field onto its own words when the real form spaces them differently", () => {
    // The real form's MRN label sits 5% further right than the map's; everything else lines up.
    const words = scanOf(laOc, FAX).map((w) =>
      w.text === "mrn" ? { ...w, box: [w.box[0] + 0.05, w.box[1], w.box[2] + 0.05, w.box[3]] as Region } : w,
    );
    const a = alignPage(words)!;
    expect(a.regions.mrn[0]).toBeCloseTo(move(FAX, laOc.regions.mrn)[0] + 0.05, 2);
  });

  it("finds no form on a page without one", () => {
    expect(alignPage([{ text: "Progress", box: [0.1, 0.1, 0.2, 0.12] }, { text: "Note", box: [0.21, 0.1, 0.3, 0.12] }])).toBeNull();
  });
});

describe("fitAffine", () => {
  it("recovers a known shift, scale and tilt", () => {
    const from: [number, number][] = [
      [0.1, 0.1],
      [0.9, 0.1],
      [0.5, 0.8],
      [0.2, 0.6],
    ];
    const to = from.map(([x, y]) => [FAX[0] * x + FAX[1] * y + FAX[2], FAX[3] * x + FAX[4] * y + FAX[5]] as [number, number]);
    fitAffine(from, to)!.forEach((v, i) => expect(v).toBeCloseTo(FAX[i], 6));
  });

  it("gives up on points in a line", () => {
    expect(fitAffine([[0, 0], [0.5, 0.5], [1, 1]], [[0, 0], [0.5, 0.5], [1, 1]])).toBeNull();
  });
});

describe("sameWord", () => {
  it("allows a faint fax's misreadings of longer words", () => {
    expect(sameWord("etnniclly", "ethnicity")).toBe(true);
    expect(sameWord("seif", "self")).toBe(true);
    expect(sameWord("cmrn", "mrn")).toBe(true);
  });
  it("keeps short and unrelated words apart", () => {
    expect(sameWord("no", "yes")).toBe(false);
    expect(sameWord("dole", "date")).toBe(false);
    expect(sameWord("hospital", "insurance")).toBe(false);
  });
});
