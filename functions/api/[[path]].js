// ============================================================
// Pluto TV — Cloudflare Pages Function (پروکسی API)
// مسیر: /api/* → سرور اصلی با CORS + فال‌بک
//
// مشکل: سرور اصلی API هدر CORS ندارد، پس مرورگر تلویزیون
// نمی‌تواند مستقیم وصل شود. این تابع وسط قرار می‌گیرد.
// ============================================================

const API_KEY = '4F5A9C3D9A86FA54EACEDDD635185';

const SERVERS = [
  'https://server-hi-speed-iran.info',
  'https://hostinnegar.com',
  'https://windowsdiba.info'
];

// هدرهای CORS — اجازه دسترسی از هر جا (کافی برای مرورگر تلویزیون)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

// کش ساده در حافظه (Cloudflare edge)
// کاهش درخواست به سرور اصلی — برای «زمان‌بندی درست» و جلوگیری از محدودیت
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // ۵ دقیقه

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 20000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen)' }
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // پاسخ به درخواست‌های پیش‌پرواز CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // مسیر درخواست: /api/... → /api/... روی سرور اصلی
  const apiPath = url.pathname; // مثلاً /api/movie/by/filtres/0/created/0/KEY/
  if (!apiPath.startsWith('/api/')) {
    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  }

  const cacheKey = apiPath + (url.search || '');
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return new Response(cached.body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'HIT'
      }
    });
  }

  // تلاش روی همه سرورها به ترتیب
  for (const server of SERVERS) {
    try {
      const target = server + apiPath + (url.search || '');
      const res = await fetchWithTimeout(target);

      if (res.ok) {
        const text = await res.text();

        // ذخیره در کش
        cache.set(cacheKey, { body: text, ts: Date.now() });

        return new Response(text, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'X-Cache': 'MISS',
            'X-Upstream': server
          }
        });
      }
    } catch (e) {
      // سرور بعدی
      continue;
    }
  }

  return new Response(JSON.stringify({ error: 'همه سرورها در دسترس نیستند' }), {
    status: 502,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }
  });
}
