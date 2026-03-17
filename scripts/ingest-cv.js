import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CV_PATH = join(ROOT, 'data', 'cv', 'cv.pdf');
const OUT_TEXT = join(ROOT, 'data', 'cv-text.json');
const OUT_CHUNKS = join(ROOT, 'data', 'cv-chunks.json');

const CHUNK_MAX_CHARS = 600;
const CHUNK_OVERLAP = 100;

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + CHUNK_MAX_CHARS, normalized.length);
    let slice = normalized.slice(start, end);

    if (end < normalized.length) {
      const lastNewline = slice.lastIndexOf('\n');
      const lastPeriod = slice.lastIndexOf('. ');
      const breakAt = Math.max(lastNewline, lastPeriod);
      if (breakAt > CHUNK_MAX_CHARS / 2) {
        end = start + breakAt + 1;
        slice = normalized.slice(start, end);
      }
    }

    slice = slice.trim();
    if (slice) {
      chunks.push({
        text: slice,
        source: 'cv.pdf',
      });
    }

    start = end - (end < normalized.length ? CHUNK_OVERLAP : 0);
    if (start >= normalized.length) break;
  }

  return chunks;
}

async function main() {
  console.log('Stage 1: CV ingestion');
  console.log('Reading PDF from:', CV_PATH);

  let buffer;
  try {
    buffer = await readFile(CV_PATH);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('CV not found. Please add your CV PDF at: data/cv/cv.pdf');
      process.exit(1);
    }
    throw err;
  }

  const result = await pdfParse(buffer);
  const rawText = result?.text ?? '';
  const fullText = normalizeText(rawText);

  await ensureDir(dirname(OUT_TEXT));
  await ensureDir(dirname(OUT_CHUNKS));

  await writeFile(
    OUT_TEXT,
    JSON.stringify({ fullText, length: fullText.length }, null, 2),
    'utf8'
  );
  console.log('Wrote full text to:', OUT_TEXT);

  const chunks = chunkText(rawText);
  await writeFile(
    OUT_CHUNKS,
    JSON.stringify({ chunks, count: chunks.length }, null, 2),
    'utf8'
  );
  console.log('Wrote', chunks.length, 'chunks to:', OUT_CHUNKS);
  console.log('Stage 1 done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
