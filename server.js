import 'dotenv/config';
import http from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import handler from './api/ask.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3005;
const CORS_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === '/health' || path === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'digital-twin-api' }));
    return;
  }

  if (path === '/api/ask' && req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf8');
    const reqProxy = {
      method: 'POST',
      body,
    };
    const resProxy = {
      _headers: {},
      _status: 200,
      setHeader(name, value) {
        this._headers[name] = value;
      },
      status(code) {
        this._status = code;
        return this;
      },
      json(obj) {
        res.writeHead(this._status, { ...this._headers, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      },
      end() {
        res.writeHead(this._status, this._headers);
        res.end();
      },
    };
    return handler(reqProxy, resProxy);
  }

  if (path === '/' || path === '/index.html') {
    try {
      const file = await readFile(join(__dirname, 'public', 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(file);
    } catch {
      res.writeHead(404);
      res.end('Not found. Deploy frontend to Vercel/Netlify and set API URL there.');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`API server: http://localhost:${PORT}`);
  console.log('  GET  /health   → health check');
  console.log('  POST /api/ask   → ask (body: { "question": "..." })');
  console.log('  GET  /          → test page (local)');
});
