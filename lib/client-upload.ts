"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "illintake-files";
let browser: SupabaseClient | undefined;

function storage() {
  if (!browser) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    browser = createClient(url, key, { auth: { persistSession: false } });
  }
  return browser.storage.from(BUCKET);
}

/** Upload to a signed URL the server created; the token is the only authorization needed. */
export async function uploadSigned(target: { path: string; token: string }, file: Blob, contentType?: string) {
  const { error } = await storage().uploadToSignedUrl(target.path, target.token, file, {
    contentType: contentType || file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${target.path}: ${error.message}`);
}

// Fax resolution is ~200 dpi; rendering letter pages ~1700px wide keeps handwriting legible for the model.
const TARGET_WIDTH = 1700;

async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode page image"))), "image/jpeg", 0.85),
  );
}

/** Turn an uploaded PDF or image into one JPEG per page. */
export async function renderPages(file: File, onProgress?: (done: number, total: number) => void): Promise<Blob[]> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    // wasmUrl: fax pages are CCITT/JBIG2 images, which pdf.js decodes with WebAssembly.
    const task = pdfjs.getDocument({ data: await file.arrayBuffer(), wasmUrl: "/pdfjs-wasm/" });
    const doc = await task.promise;
    const pages: Blob[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: TARGET_WIDTH / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport }).promise;
      pages.push(await canvasToJpeg(canvas));
      onProgress?.(n, doc.numPages);
    }
    await task.destroy();
    return pages;
  }

  if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, TARGET_WIDTH / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    onProgress?.(1, 1);
    return [await canvasToJpeg(canvas)];
  }

  throw new Error("Upload a PDF, JPEG or PNG");
}
