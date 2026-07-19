// Convert PNGs under public/lotr to WebP. Re-run when new art is added.
//
// Rationale: the S3+CloudFront static export ships images as-is (Next.js image
// optimization is off post-Phase-2). 171MB of PNGs becomes single-digit MB of
// WebP with no visible quality loss on board game art.
//
// Two modes, chosen per directory:
//   - LOSSY (quality 88): big art — cards, landmarks, board, track backgrounds.
//     Lossy WebP at q=88 crushes photographic/illustrated art cleanly.
//   - LOSSLESS: small icons (QuestTrack, Icons, Chains) and token files. These
//     are tiny and fine-detail (text/symbols); lossy would wreck them.
//
// WebP is chosen over AVIF deliberately: board game art is text-heavy (card
// rules, region names) and AVIF's block-based encoding can soften text edges.
// WebP's text fidelity is more reliable here; the ~15% extra size vs AVIF is
// worth it.
//
// Idempotent: converts every .png it finds, writes a .webp next to it. The
// caller (see PR) deletes the originals afterward so the repo only ships WebP.
//
// Usage: npm run optimize:images

import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "public", "lotr");

// quality 88 for art; 90 for text-heavy player-aid pages.
const QUALITY = 88;
const QUALITY_TEXT = 90;

// Directories treated as lossy (art) vs lossless (icons). Paths relative to ROOT.
const LOSSY_DIRS = ["Cards", "Landmarks"]; // full-art tiles
const LOSSY_FILES = ["board.png", "Fellowship_Track_BG.png"]; // big standalone art
const LOSSY_TEXT_DIRS = ["player-aid"]; // text-heavy scans
// Everything else (Icons, Chains, QuestTrack, token files) -> lossless.

let totalIn = 0;
let totalOut = 0;
let count = 0;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (e.isFile() && e.name.toLowerCase().endsWith(".png")) files.push(full);
  }
  return files;
}

function modeFor(file) {
  const rel = file.slice(ROOT.length + 1).replace(/\\/g, "/");
  const name = rel.split("/").pop();
  if (LOSSY_FILES.includes(name)) return { kind: "lossy", quality: QUALITY };
  for (const d of LOSSY_TEXT_DIRS) if (rel.startsWith(d + "/")) return { kind: "lossy", quality: QUALITY_TEXT };
  for (const d of LOSSY_DIRS) if (rel.startsWith(d + "/")) return { kind: "lossy", quality: QUALITY };
  return { kind: "lossless" };
}

async function convert(file) {
  const { kind, quality } = modeFor(file);
  const out = file.replace(/\.png$/i, ".webp");
  const inSize = (await stat(file)).size;
  const pipeline = sharp(file);
  const opts = kind === "lossy" ? { quality, effort: 4 } : { lossless: true, effort: 4 };
  await pipeline.webp(opts).toFile(out);
  const outSize = (await stat(out)).size;
  totalIn += inSize;
  totalOut += outSize;
  count++;
  const pct = ((1 - outSize / inSize) * 100).toFixed(1);
  console.log(
    `${kind.padEnd(9)} ${(inSize / 1024).toFixed(0).padStart(6)}K -> ${(outSize / 1024).toFixed(0).padStart(5)}K  (-${pct}%)  ${file.slice(ROOT.length + 1)}`
  );
}

const files = await walk(ROOT);
if (files.length === 0) {
  console.log("No PNGs found under", ROOT);
  process.exit(0);
}
console.log(`Converting ${files.length} PNGs under ${ROOT} ...\n`);
for (const f of files) await convert(f);

const mbIn = (totalIn / 1024 / 1024).toFixed(1);
const mbOut = (totalOut / 1024 / 1024).toFixed(1);
const totalPct = ((1 - totalOut / totalIn) * 100).toFixed(1);
console.log(`\nDone: ${count} files, ${mbIn} MB -> ${mbOut} MB  (-${totalPct}%)`);
