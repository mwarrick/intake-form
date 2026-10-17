import "server-only";
import sharp from "sharp";

/** Which way a faxed page's text runs, as the page classifier sees it. */
export const ORIENTATIONS = ["upright", "reads_bottom_to_top", "reads_top_to_bottom", "upside_down"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

export const ORIENTATION_HINT = `orientation: which way the text runs on the page as you see it.
- upright: lines of text run left to right, top of the letters at the top of the page.
- reads_bottom_to_top: the page is sideways and lines run up the page (the top of the letters faces the left edge).
- reads_top_to_bottom: the page is sideways and lines run down the page (the top of the letters faces the right edge).
- upside_down: the text is upside down.`;

/** Degrees to turn a page clockwise so its text is upright. */
export function turnFor(o: Orientation): number {
  return { upright: 0, reads_bottom_to_top: 90, reads_top_to_bottom: 270, upside_down: 180 }[o] ?? 0;
}

/** Turn a data: URL image clockwise by a multiple of 90 degrees, keeping its format. */
export async function turnImage(dataUrl: string, degrees: number): Promise<string> {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match || !(degrees % 360)) return dataUrl;
  const buf = await sharp(Buffer.from(match[2], "base64")).rotate(degrees % 360).toBuffer();
  return `data:${match[1]};base64,${buf.toString("base64")}`;
}
