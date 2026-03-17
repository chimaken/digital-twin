const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

function getApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');
  return key;
}

export async function embed(input, model = 'openai/text-embedding-3-small') {
  const apiKey = getApiKey();
  const body = { model, input };
  const res = await fetch(`${OPENROUTER_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter embeddings failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const list = data.data;
  if (!Array.isArray(list)) throw new Error('OpenRouter embeddings: invalid response');
  const sorted = [...list].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return sorted.map((item) => item.embedding);
}

export async function chat({ messages, model = 'openai/gpt-4o-mini' }) {
  const apiKey = getApiKey();
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter chat failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  if (!choice) throw new Error('OpenRouter chat: no choices in response');
  return choice.message?.content ?? '';
}
