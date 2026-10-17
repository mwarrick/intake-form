"use client";

import type { Worker } from "tesseract.js";
import type { ScanWord } from "@/lib/align";
import type { Region } from "@/lib/form";

/**
 * The printed and written words on a scanned page, read in the browser with text recognition (tesseract.js), for
 * lining the field map up with it (lib/align.ts). Reading a page takes a few seconds, so each page's words are kept
 * in the browser and read once.
 */

let worker: Promise<Worker> | undefined;

// Loaded on first use: the recognizer and its English data (about 10 MB, cached by the browser) come from a CDN.
function recognizer(): Promise<Worker> {
  worker ??= import("tesseract.js").then(({ createWorker }) => createWorker("eng"));
  return worker;
}

const KEY = "scan-words:v1:";

function remembered(id: string): ScanWord[] | null {
  try {
    const s = localStorage.getItem(KEY + id);
    return s ? (JSON.parse(s) as ScanWord[]) : null;
  } catch {
    return null;
  }
}

function remember(id: string, words: ScanWord[]) {
  try {
    localStorage.setItem(KEY + id, JSON.stringify(words));
  } catch {
    // Storage full or blocked: the page is read again next time.
  }
}

/** The words on a page image, with boxes as fractions of the page. `id` names the page for remembering it. */
export async function readPageWords(id: string, url: string): Promise<ScanWord[]> {
  const known = remembered(id);
  if (known) return known;
  const blob = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Could not load page image (${r.status})`);
    return r.blob();
  });
  const bitmap = await createImageBitmap(blob);
  const [w, h] = [bitmap.width, bitmap.height];
  bitmap.close();
  const { data } = await (await recognizer()).recognize(blob, {}, { blocks: true });
  const round = (n: number) => Math.round(n * 10000) / 10000;
  const words: ScanWord[] = (data.blocks ?? []).flatMap((b) =>
    b.paragraphs.flatMap((p) =>
      p.lines.flatMap((l) =>
        l.words.map((x) => ({
          text: x.text,
          box: [round(x.bbox.x0 / w), round(x.bbox.y0 / h), round(x.bbox.x1 / w), round(x.bbox.y1 / h)] as Region,
        })),
      ),
    ),
  );
  remember(id, words);
  return words;
}
