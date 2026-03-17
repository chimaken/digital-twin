import { webSearch } from './search.js';
import { chat } from './openrouter.js';

const RESEARCH_MODEL = process.env.OPENROUTER_RESEARCH_MODEL || 'openai/gpt-4o-mini';

export async function research(question) {
  const searchResults = await webSearch(question, 6);
  const context = searchResults.length
    ? searchResults
        .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}${r.url ? `\nURL: ${r.url}` : ''}`)
        .join('\n\n')
    : 'No web results found.';

  const systemContent = `You are a helpful research assistant. The user is asking about a person (their digital twin). Use the following web search results to answer the question. Be concise and cite sources when relevant. If the results don't contain enough information, say so. Do not make up facts.`;

  const messages = [
    { role: 'system', content: systemContent + '\n\n---\nWeb search results:\n\n' + context },
    { role: 'user', content: question },
  ];

  return chat({ messages, model: RESEARCH_MODEL });
}
