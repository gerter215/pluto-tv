// ============================================================
// Pluto TV — سرور توسعه محلی (بدون وابستگی)
// اجرا:  node dev-server.js [port]
// - سرو فایل‌های استاتیک از همین پوشه
// - پروکسی /api/* به سرور اصلی (شبیه‌سازی Cloudflare Pages Function)
// ============================================================
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2] || '8080', 10);
const ROOT = __dirname;

const API_KEY = '4F5A9C3D9A86FA54EACEDDD635185';
const SERVERS = [
  'https://server-hi-speed-iran.info',
  'https://hostinnegar.com',
  'https://windowsdiba.info'
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

function fetchUrl(url, timeoutMs, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen)' } }, (res) => {
      // دنبال کردن ریدایرکت (سرور اصلی بدون اسلش پایانی ریدایرکت می‌دهد)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) {
          const u = new URL(url);
          loc = u.origin + loc;
        }
        res.resume();
        fetchUrl(loc, timeoutMs, redirects + 1).then(resolve, reject);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs || 20000, () => { req.destroy(new Error('timeout')); });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // ---------- پروکسی API ----------
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    for (const server of SERVERS) {
      try {
        const target = server + url.pathname + url.search;
        const result = await fetchUrl(target);
        if (result.status >= 200 && result.status < 300) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(result.body);
          return;
        }
      } catch (e) { /* next server */ }
    }

    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'همه سرورها در دسترس نیستند' }));
    return;
  }

  // ---------- فایل استاتیک ----------
  let filePath = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
  // جلوگیری از خروج از پوشه
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end();
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT' || err.code === 'EISDIR') {
        // fallback به index.html (SPA)
        fs.readFile(path.join(ROOT, 'index.html'), (err2, html) => {
          if (err2) { res.writeHead(404); res.end('Not found'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        });
        return;
      }
      res.writeHead(500); res.end('Server error');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Pluto TV dev server: http://localhost:' + PORT);
});
