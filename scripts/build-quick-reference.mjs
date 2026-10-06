// Refresh the static backup copy of the 50-State Quick Reference from the live cards.
// Run from the repo root:  npm install && node scripts/build-quick-reference.mjs
import { writeFile } from "node:fs/promises";
import { buildWorkbook } from "../netlify/functions/quick-reference-builder.mjs";

const out = process.argv[2] || "downloads/HRCC-50-State-Quick-Reference-backup.xlsx";
const { buffer } = await buildWorkbook();
await writeFile(out, buffer);
console.log(`Wrote ${out} (${buffer.length} bytes)`);
