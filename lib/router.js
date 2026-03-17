/**
 * Router agent: decide whether to answer from CV (RAG) or do web research.
 * Uses a small/fast OpenRouter model. Can use score threshold or LLM decision.
 */

import { chat } from './openrouter.js';

const ROUTER_MODEL = process.env.OPENROUTER_ROUTER_MODEL || 'openai/gpt-4o-mini';

/**
 * Decide: "answer_from_cv" or "research_online".
 * @param {string} question - User question
 * @param {Array<{ text: string, score: number }>} topChunks - Top RAG chunks (for context)
 * @param {number} topScore - Best similarity score (0..1)
 * @returns {Promise<'answer_from_cv' | 'research_online'>}
 */
export async function decide(question, topChunks, topScore) {
  // Heuristic: if we have a strong RAG match, use CV
  const RAG_THRESHOLD = Number(process.env.RAG_SCORE_THRESHOLD) || 0.5;
  if (topChunks.length > 0 && topScore >= RAG_THRESHOLD) {
    return 'answer_from_cv';
  }

  // Otherwise ask the router LLM for a quick decision
  const snippet = topChunks.slice(0, 2).map((c) => c.text.slice(0, 200)).join('\n---\n');
  const systemContent = `You are a router. Given a user question and optional CV excerpts, decide:
- answer_from_cv: the question is about the person (their experience, skills, contact, education, projects) and the excerpts likely contain the answer.
- research_online: the question needs current/live info (recent news, LinkedIn, company info, things not in a CV), or the excerpts don't seem relevant.

Reply with exactly one of: answer_from_cv or research_online. No other text.`;

  const userContent = snippet
    ? `Question: ${question}\n\nRelevant CV excerpts (if any):\n${snippet}`
    : `Question: ${question}\n\n(No relevant CV excerpts found.)`;

  const reply = await chat({
    messages: [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ],
    model: ROUTER_MODEL,
  });

  const normalized = (reply || '').trim().toLowerCase();
  if (normalized.includes('research_online')) return 'research_online';
  return 'answer_from_cv';
}
