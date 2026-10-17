// pdf.js renders uploaded PDFs in the browser and loads its worker from /pdf.worker.min.mjs.
// Its WebAssembly image decoders load from /pdfjs-wasm/; without them fax pages (CCITT/JBIG2) render blank.
// Both are copied from node_modules on install rather than committed.
import { copyFileSync, cpSync, mkdirSync } from "node:fs";

mkdirSync("public", { recursive: true });
copyFileSync("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", "public/pdf.worker.min.mjs");
cpSync("node_modules/pdfjs-dist/wasm", "public/pdfjs-wasm", { recursive: true });
