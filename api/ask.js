import 'dotenv/config';
import { retrieve, chunksToContext } from '../lib/rag.js';
import { chat } from '../lib/openrouter.js';
import { decide } from '../lib/router.js';
import { research } from '../lib/research.js';

const RAG_MODEL = process.env.OPENROUTER_RAG_MODEL || 'openai/gpt-4o-mini';
const TOP_K = 5;

async function answerFromRag(question, chunks) {
  const context = chunksToContext(chunks);
  const systemContent = `You are a helpful digital twin of the person described in the following CV excerpts. Answer the user's question using ONLY the context below. Be concise and natural. If the context does not contain enough information to answer, say so clearly. Do not make up information.`;
  const messages = [
    { role: 'system', content: systemContent + '\n\n---\nContext from CV:\n\n' + context },
    { role: 'user', content: question },
  ];
  return chat({ messages, model: RAG_MODEL });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST with { "question": "..." }' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const question = (body.question || '').trim();
  if (!question) {
    res.status(400).json({ error: 'Missing or empty "question" in body' });
    return;
  }

  try {
    const chunks = await retrieve(question, TOP_K);
    const topScore = chunks.length > 0 ? chunks[0].score : 0;

    const route = await decide(question, chunks, topScore);

    let answer;
    let source;

    if (route === 'answer_from_cv') {
      answer = await answerFromRag(question, chunks);
      source = 'cv';
    } else {
      answer = await research(question);
      source = 'research';
    }

    res.status(200).json({
      answer,
      source,
      sourcesUsed: source === 'cv' ? chunks.length : undefined,
    });
  } catch (err) {
    console.error('Ask API error:', err.message);
    res.status(500).json({
      error: 'Failed to get answer',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}
