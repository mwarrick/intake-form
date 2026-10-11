// pdf.js renders uploaded PDFs in the browser and loads its worker from /pdf.worker.min.mjs.
// The worker is copied from node_modules on install rather than committed.
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public", { recursive: true });
copyFileSync("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", "public/pdf.worker.min.mjs");
