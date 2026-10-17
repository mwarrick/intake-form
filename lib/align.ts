import laOc from "@/schema/layouts/la-oc.json";
import rc0725 from "@/schema/layouts/rc0725-sh.json";
import type { Region } from "@/lib/form";

/**
 * Lining up a known form's field map with a scan. Each layout lists where its fields and its printed words sit on
 * the blank form; text recognition finds those words on the scan, and the shift, scale and tilt that carry one
 * onto the other carry the fields too. Faxes are shifted, shrunk and crooked, and real packets use more than one
 * version of the form, so the version whose words line up best wins.
 *
 * Each field is placed from the words near it rather than one fit for the whole page: the LA/OC map is drawn by
 * scripts/make_unredacted_sims.py, whose lettering is a little wider than the real form's, so words drift sideways
 * along a row by up to a tenth of the page; and faxes aren't always stretched evenly.
 */

export interface Layout {
  name: string;
  regions: Record<string, Region>;
  /** The printed words inside each field ("Requires", "O2", "Yes", "No"), when the layout knows them. */
  labels?: Record<string, { t: string; b: Region }[]>;
  anchors: { t: string; b: Region }[];
}

export const layouts: Layout[] = [laOc as unknown as Layout, rc0725 as unknown as Layout];

/** A word text recognition found on a page, with its box as fractions of the page. */
export interface ScanWord {
  text: string;
  box: Region;
}

/** x' = a·x + b·y + c, y' = d·x + e·y + f, in fractions of the page. */
export type Affine = [number, number, number, number, number, number];

export interface Alignment {
  layout: string;
  /** The fit for the whole page; each field uses its own fit from the words near it. */
  transform: Affine;
  /** Printed words found on both, and how many of those agree with the fit. */
  matched: number;
  inliers: number;
  /** Fields placed on the scan. */
  regions: Record<string, Region>;
  /** How many of each field's own printed words were found to snap its box to (0: placed by the fit alone). */
  found: Record<string, number>;
}

/**
 * How far (fraction of the page) a word may sit from where the whole-page fit puts it and still count as agreeing.
 * Loose enough for words drifting along a row, tight enough to drop words matched by mistake.
 */
const TOLERANCE = 0.06;
const MIN_INLIERS = 8;
/** How quickly a word's say in placing a field falls off with distance from it, across and down the page. */
const REACH_X = 0.2;
const REACH_Y = 0.03;
/**
 * How far from where the fit expects it a field's own printed word may be found: wide along the row, where the
 * real form's spacing differs most from the map, and under a row across it (rows are about 0.02 apart).
 */
const SNAP_X = 0.1;
const SNAP_Y = 0.014;
/** How closely a field's words must agree on one shift to count together. */
const AGREE_X = 0.015;
const AGREE_Y = 0.006;
/** How far along and across rows a snapped field's correction carries to a field that couldn't be snapped. */
const ROW_REACH_X = 0.4;
const ROW_REACH_Y = 0.008;

export const normWord = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The same printed word, allowing for a faint fax: up to a third of the letters misread in longer words ("etnniclly"
 * for "ethnicity"), or a short word run together with marks beside it ("cmrn" for "mrn"). Only used where the word
 * is already expected, so a loose match can't land far away.
 */
export function sameWord(scan: string, printed: string): boolean {
  if (scan === printed) return true;
  if (printed.length >= 3 && scan.includes(printed) && scan.length <= printed.length + 3) return true;
  if (printed.length < 4) return false;
  return editDistance(scan, printed) <= Math.floor(printed.length / 3);
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

const center = (b: Region): [number, number] => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];

function apply(t: Affine, [x, y]: [number, number]): [number, number] {
  return [t[0] * x + t[1] * y + t[2], t[3] * x + t[4] * y + t[5]];
}

/** Least-squares fit of `to ≈ T(from)`, optionally weighting each point; null when the points are all in a line. */
export function fitAffine(from: [number, number][], to: [number, number][], weights?: number[]): Affine | null {
  // Normal equations: (AᵀA) p = Aᵀv, with rows [x, y, 1], solved once for x' and once for y'.
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const vx = [0, 0, 0];
  const vy = [0, 0, 0];
  from.forEach(([x, y], i) => {
    const r = [x, y, 1];
    const w = weights?.[i] ?? 1;
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) m[j][k] += w * r[j] * r[k];
      vx[j] += w * r[j] * to[i][0];
      vy[j] += w * r[j] * to[i][1];
    }
  });
  const px = solve3(m, vx);
  const py = solve3(m, vy);
  return px && py ? [px[0], px[1], px[2], py[0], py[1], py[2]] : null;
}

function solve3(m: number[][], v: number[]): number[] | null {
  const a = m.map((row, i) => [...row, v[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-12) return null;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = a[r][c] / a[c][c];
      for (let k = c; k < 4; k++) a[r][k] -= f * a[c][k];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

/** A fit should only shift, scale a little and tilt a little; anything else matched the wrong words. */
function plausible(t: Affine): boolean {
  const [a, b, , d, e] = t;
  return a > 0.5 && a < 1.6 && e > 0.5 && e < 1.6 && Math.abs(b) < 0.15 && Math.abs(d) < 0.15;
}

interface Pair {
  from: [number, number];
  to: [number, number];
}

/** Same words on the blank form and the scan, using only words that appear once on the scan. */
function matchWords(layout: Layout, words: ScanWord[]): Pair[] {
  const byText = new Map<string, ScanWord[]>();
  for (const w of words) {
    const t = normWord(w.text);
    if (t.length >= 4) byText.set(t, [...(byText.get(t) ?? []), w]);
  }
  return layout.anchors.flatMap((a) => {
    const found = byText.get(a.t);
    return found?.length === 1 ? [{ from: center(a.b), to: center(found[0].box) }] : [];
  });
}

/** Fit one layout to the scan's words, ignoring words matched by mistake (RANSAC over three-word samples). */
export function fitLayout(layout: Layout, words: ScanWord[]): (Omit<Alignment, "regions" | "found"> & { agreeing: Pair[] }) | null {
  const pairs = matchWords(layout, words);
  if (pairs.length < MIN_INLIERS) return null;
  const agreeing = (t: Affine) =>
    pairs.filter((p) => {
      const [x, y] = apply(t, p.from);
      return Math.hypot(x - p.to[0], y - p.to[1]) < TOLERANCE;
    });

  // A fixed-seed generator keeps the result the same every time the page is opened.
  let seed = 1;
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  let best: typeof pairs = [];
  for (let i = 0; i < 400; i++) {
    const sample = [rand(pairs.length), rand(pairs.length), rand(pairs.length)];
    if (new Set(sample).size < 3) continue;
    const t = fitAffine(sample.map((s) => pairs[s].from), sample.map((s) => pairs[s].to));
    if (!t || !plausible(t)) continue;
    const inl = agreeing(t);
    if (inl.length > best.length) best = inl;
  }
  if (best.length < MIN_INLIERS) return null;
  // Refit on every agreeing word, then count again with the better fit.
  let t = fitAffine(best.map((p) => p.from), best.map((p) => p.to));
  if (!t || !plausible(t)) return null;
  const final = agreeing(t);
  t = fitAffine(final.map((p) => p.from), final.map((p) => p.to)) ?? t;
  if (final.length < MIN_INLIERS || final.length < pairs.length * 0.4) return null;
  return { layout: layout.name, transform: t, matched: pairs.length, inliers: final.length, agreeing: final };
}

/** A fit for one field, from the agreeing words weighted by how near they are to it; the page fit if that fails. */
function fitNear(region: Region, agreeing: Pair[], page: Affine): Affine {
  const [cx, cy] = center(region);
  // A small floor keeps far words in play, so a field in a sparse corner still gets a sensible fit.
  const weights = agreeing.map((p) => 0.01 + Math.exp(-(((p.from[0] - cx) / REACH_X) ** 2 + ((p.from[1] - cy) / REACH_Y) ** 2)));
  const t = fitAffine(agreeing.map((p) => p.from), agreeing.map((p) => p.to), weights);
  return t && plausible(t) ? t : page;
}

/** The field's box on the scan: the four corners carried over, then the box around them. */
export function placeRegion(region: Region, t: Affine): Region {
  const corners = [
    apply(t, [region[0], region[1]]),
    apply(t, [region[2], region[1]]),
    apply(t, [region[0], region[3]]),
    apply(t, [region[2], region[3]]),
  ];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  return [clamp(Math.min(...xs)), clamp(Math.min(...ys)), clamp(Math.max(...xs)), clamp(Math.max(...ys))];
}

/**
 * Correct a placed box with the field's own printed words found on the scan ("Requires", "O2", "Yes", "No"): shift it
 * onto their row, and shift and stretch it along the row so its label and choices line up, which the fit alone gets
 * only roughly. The whole box moves, so a word that wasn't found still ends up inside it. A field with none of its
 * words found keeps the fit.
 */
function snapToWords(
  placed: Region,
  labels: { t: string; b: Region }[] | undefined,
  t: Affine,
  words: ScanWord[],
): { box: Region; found: number } {
  if (!labels?.length) return { box: placed, found: 0 };
  // Every place each of the field's words might be, near where the fit expects it.
  const options = labels.map((l) => {
    const [px, py] = apply(t, center(l.b));
    return words.flatMap((w) => {
      if (!sameWord(normWord(w.text), l.t)) return [];
      const [x, y] = center(w.box);
      return Math.abs(x - px) < SNAP_X && Math.abs(y - py) < SNAP_Y
        ? [{ pred: [px, py] as [number, number], found: [x, y] as [number, number] }]
        : [];
    });
  });
  // The shift that lines up the most of the field's words wins; a lone "Yes" or "No" isn't enough on its own,
  // unless it is all the field has ("MRN").
  const weight = (i: number) => (labels[i].t.length >= 4 ? 2 : 1);
  let pairs: { pred: [number, number]; found: [number, number] }[] = [];
  let bestScore = labels.length === 1 ? 0 : 1;
  for (const o of options.flat()) {
    const sx = o.found[0] - o.pred[0];
    const sy = o.found[1] - o.pred[1];
    const agree = options.map((opts) =>
      opts.find((q) => Math.abs(q.found[0] - q.pred[0] - sx) < AGREE_X && Math.abs(q.found[1] - q.pred[1] - sy) < AGREE_Y),
    );
    const score = agree.reduce((a, q, i) => a + (q ? weight(i) : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      pairs = agree.filter((q) => q !== undefined);
    }
  }
  if (!pairs.length) return { box: placed, found: 0 };
  const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const dy = median(pairs.map((p) => p.found[1] - p.pred[1]));
  // Along the row: a stretch when the found words are spread out enough to measure one, else just a shift.
  let scale = 1;
  const xs = pairs.map((p) => p.pred[0]);
  if (pairs.length >= 2 && Math.max(...xs) - Math.min(...xs) > 0.05) {
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = pairs.reduce((a, p) => a + p.found[0], 0) / pairs.length;
    const num = pairs.reduce((a, p) => a + (p.pred[0] - mx) * (p.found[0] - my), 0);
    const den = pairs.reduce((a, p) => a + (p.pred[0] - mx) ** 2, 0);
    scale = Math.min(1.15, Math.max(0.85, num / den));
  }
  const ox = median(pairs.map((p) => p.found[0] - scale * p.pred[0]));
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  return {
    box: [clamp(scale * placed[0] + ox), clamp(placed[1] + dy), clamp(scale * placed[2] + ox), clamp(placed[3] + dy)],
    found: pairs.length,
  };
}

/** The best-fitting form version for this page, with every field it has placed on the scan; null if none fits. */
export function alignPage(words: ScanWord[], candidates: Layout[] = layouts): Alignment | null {
  let best: ReturnType<typeof fitLayout> = null;
  let bestLayout: Layout | null = null;
  for (const layout of candidates) {
    const fit = fitLayout(layout, words);
    if (fit && (!best || fit.inliers > best.inliers)) {
      best = fit;
      bestLayout = layout;
    }
  }
  if (!best || !bestLayout) return null;
  const { agreeing, ...fit } = best;
  const regions: Record<string, Region> = {};
  const found: Record<string, number> = {};
  const moved: { at: [number, number]; dx: number; dy: number }[] = [];
  for (const [id, r] of Object.entries(bestLayout.regions)) {
    const t = fitNear(r, agreeing, fit.transform);
    const placed = placeRegion(r, t);
    const snapped = snapToWords(placed, bestLayout.labels?.[id], t, words);
    regions[id] = snapped.box;
    found[id] = snapped.found;
    if (snapped.found) {
      const b = snapped.box;
      moved.push({ at: center(r), dx: (b[0] + b[2] - placed[0] - placed[2]) / 2, dy: b[1] - placed[1] });
    }
  }
  // A field none of whose words were found moves with the snapped fields on its printed row, which a fax shifts together.
  for (const [id, r] of Object.entries(bestLayout.regions)) {
    if (found[id]) continue;
    const [cx, cy] = center(r);
    let w = 0;
    let dx = 0;
    let dy = 0;
    for (const m of moved) {
      const k = Math.exp(-(((m.at[0] - cx) / ROW_REACH_X) ** 2 + ((m.at[1] - cy) / ROW_REACH_Y) ** 2));
      w += k;
      dx += k * m.dx;
      dy += k * m.dy;
    }
    if (w < 0.05) continue;
    const b = regions[id];
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    regions[id] = [clamp(b[0] + dx / w), clamp(b[1] + dy / w), clamp(b[2] + dx / w), clamp(b[3] + dy / w)];
  }
  return { ...fit, regions, found };
}
