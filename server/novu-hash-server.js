/*
  Minimal HMAC server for Novu SDK session hashing.

  Usage:
    set NOVU_SECRET_KEY to your Novu server secret.
    node server/novu-hash-server.js  (default port 5050)

  POST /hash {"subscriberId":"<id>"} -> {"subscriberHash":"<hex>"}
  GET  /health -> { ok: true }
*/
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT ? Number(process.env.PORT) : 5050;
const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY || '';

function json(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function notFound(res) {
  json(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }

  if (url.pathname === '/health' && req.method === 'GET') {
    return json(res, 200, { ok: true });
  }

  if (url.pathname === '/hash' && req.method === 'POST') {
    if (!NOVU_SECRET_KEY) {
      return json(res, 500, { error: 'NOVU_SECRET_KEY not set' });
    }

    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        const subscriberId = String(parsed.subscriberId || '').trim();
        if (!subscriberId) return json(res, 400, { error: 'subscriberId required' });

        const hmac = crypto.createHmac('sha256', NOVU_SECRET_KEY).update(subscriberId).digest('hex');
        return json(res, 200, { subscriberHash: hmac });
      } catch (e) {
        return json(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  return notFound(res);
});

server.listen(PORT, () => {
  console.log(`[novu-hash-server] listening on http://localhost:${PORT}`);
});

