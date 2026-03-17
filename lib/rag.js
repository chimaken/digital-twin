/**
 * RAG: load CV embeddings, embed query, retrieve top-k by cosine similarity.
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { embed } from './openrouter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Prefer project root (for Vercel/serverless); fallback to relative to this file
const ROOT = process.cwd?.() || join(__dirname, '..');
const EMBEDDINGS_PATH = join(ROOT, 'data', 'cv-embeddings.json');

let cached = null;

function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Load embeddings from data/cv-embeddings.json (once, then cached).
 */
export async function loadEmbeddings() {
  if (cached) return cached;
  const raw = await readFile(EMBEDDINGS_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!data.chunks || !Array.isArray(data.chunks)) {
    throw new Error('Invalid cv-embeddings.json: missing chunks array');
  }
  cached = data;
  return data;
}

/**
 * Retrieve top-k chunks most similar to the query.
 * @param {string} query - User question
 * @param {number} [topK=5]
 * @param {string} [embedModel] - Same model used to build cv-embeddings.json
 * @returns {Promise<Array<{ text: string, source?: string, score: number }>>}
 */
export async function retrieve(query, topK = 5, embedModel = null) {
  const data = await loadEmbeddings();
  const model = embedModel || data.model || 'openai/text-embedding-3-small';

  const [queryEmbedding] = await embed(query, model);
  const chunks = data.chunks;

  const withScores = chunks.map((c) => ({
    text: c.text,
    source: c.source,
    score: cosineSimilarity(c.embedding, queryEmbedding),
  }));
  withScores.sort((a, b) => b.score - a.score);
  return withScores.slice(0, topK);
}

/**
 * Build context string from retrieved chunks for the RAG prompt.
 */
export function chunksToContext(chunks) {
  return chunks.map((c, i) => `[${i + 1}]\n${c.text}`).join('\n\n');
}
