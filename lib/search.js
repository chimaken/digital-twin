const BRAVE_API = 'https://api.search.brave.com/res/v1/web/search';
const DUCKDUCKGO_API = 'https://api.duckduckgo.com/';

export async function webSearch(query, num = 5) {
  const key = process.env.BRAVE_API_KEY;
  if (key) {
    return braveSearch(query, num, key);
  }
  return duckDuckGoSearch(query, num);
}

async function braveSearch(query, num, apiKey) {
  const res = await fetch(
    `${BRAVE_API}?q=${encodeURIComponent(query)}&count=${num}`,
    {
      headers: { 'X-Subscription-Token': apiKey },
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brave Search failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const web = data.web?.results || [];
  return web.slice(0, num).map((r) => ({
    title: r.title || '',
    snippet: r.description || '',
    url: r.url || '',
  }));
}

async function duckDuckGoSearch(query, num) {
  const res = await fetch(
    `${DUCKDUCKGO_API}?q=${encodeURIComponent(query)}&format=json&no_html=1`
  );
  if (!res.ok) throw new Error(`DuckDuckGo failed: ${res.status}`);
  const data = await res.json();
  const results = [];
  if (data.Abstract) {
    results.push({
      title: data.Heading || data.AbstractSource || 'DuckDuckGo',
      snippet: data.Abstract,
      url: data.AbstractURL || '',
    });
  }
  for (const r of data.RelatedTopics || []) {
    if (r.Text && results.length < num) {
      results.push({ title: r.Text.slice(0, 80), snippet: r.Text, url: '' });
    }
  }
  return results.slice(0, num);
}
