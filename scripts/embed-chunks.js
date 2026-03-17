/**
 * Stage 2 (build step): Embed CV chunks via OpenRouter and write data/cv-embeddings.json.
 * Run: npm run embed-chunks
 * Requires: OPENROUTER_API_KEY in .env (or env), data/cv-chunks.json (from npm run ingest-cv)
 */

import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { embed } from '../lib/openrouter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHUNKS_PATH = join(ROOT, 'data', 'cv-chunks.json');
const OUT_PATH = join(ROOT, 'data', 'cv-embeddings.json');

const EMBED_MODEL = process.env.OPENROUTER_EMBED_MODEL || 'openai/text-embedding-3-small';
const BATCH_SIZE = 10;

async function main() {
  console.log('Stage 2 (embed): Reading chunks from', CHUNKS_PATH);

  const chunksJson = await readFile(CHUNKS_PATH, 'utf8');
  const { chunks } = JSON.parse(chunksJson);
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new Error('No chunks found in cv-chunks.json. Run npm run ingest-cv first.');
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set. Set it and run again.');
    process.exit(1);
  }

  console.log('Embedding', chunks.length, 'chunks with', EMBED_MODEL, '...');

  const embedded = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);
    const vectors = await embed(texts, EMBED_MODEL);
    for (let j = 0; j < batch.length; j++) {
      embedded.push({
        text: batch[j].text,
        source: batch[j].source,
        embedding: vectors[j],
      });
    }
    console.log('  embedded', Math.min(i + BATCH_SIZE, chunks.length), '/', chunks.length);
  }

  const outDir = dirname(OUT_PATH);
  await mkdir(outDir, { recursive: true });
  await writeFile(
    OUT_PATH,
    JSON.stringify({ model: EMBED_MODEL, chunks: embedded }, null, 2),
    'utf8'
  );
  console.log('Wrote', embedded.length, 'embeddings to', OUT_PATH);
  console.log('Stage 2 (embed) done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
