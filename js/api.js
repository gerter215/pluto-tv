/* =============================================
   Pluto TV — API Module
   Talks to CCloud backend with fallback servers
   ============================================= */

const API = (() => {

  const { PRIMARY_SERVER, HELPER_SERVERS, API_KEY, ENDPOINTS, TIMEOUT } = CONFIG.API;

  // In-memory cache
  const cache = new Map();

  function cacheKey(url) {
    return url;
  }

  function getCached(url) {
    const entry = cache.get(cacheKey(url));
    if (!entry) return null;
    if (Date.now() - entry.ts > CONFIG.CACHE_TTL) {
      cache.delete(cacheKey(url));
      return null;
    }
    return entry.data;
  }

  function setCached(url, data) {
    cache.set(cacheKey(url), { ts: Date.now(), data });
  }

  /**
   * Fetch with fallback: try primary, then helper servers.
   * Returns parsed JSON or throws.
   */
  async function fetchWithFallback(fullUrl) {
    // Try cache first
    const cached = getCached(fullUrl);
    if (cached) return cached;

    const servers = [PRIMARY_SERVER, ...HELPER_SERVERS];
    let lastError = null;

    for (const server of servers) {
      // Replace host portion of the URL with current server
      const url = fullUrl.replace(/^https?:\/\/[^\/]+/, server);

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT);

        const resp = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
          redirect: 'follow'
        });

        clearTimeout(timer);

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const text = await resp.text();

        // Sometimes server returns HTML redirect, follow it
        if (text.trim().startsWith('<!DOCTYPE')) {
          const match = text.match(/url=([^"'>]+)/i);
          if (match) {
            // Retry with the redirect target
            const redirected = match[1].replace(/&/g, '&');
            const c2 = new AbortController();
            const t2 = setTimeout(() => c2.abort(), TIMEOUT);
            const r2 = await fetch(redirected, { signal: c2.signal, redirect: 'follow' });
            clearTimeout(t2);
            if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
            const text2 = await r2.text();
            const json2 = JSON.parse(text2);
            setCached(fullUrl, json2);
            return json2;
          }
          throw new Error('Server returned HTML instead of JSON');
        }

        const json = JSON.parse(text);
        setCached(fullUrl, json);
        return json;

      } catch (err) {
        console.warn(`[API] ${server} failed:`, err.message);
        lastError = err;
        continue;
      }
    }

    throw new Error(`All servers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Get movies with optional filters
   * @param {number} page - page number (0-based)
   * @param {number} genreId - 0 for all genres
   * @param {string} filterType - 'created' | 'year' | 'imdb'
   */
  async function getMovies(page = 0, genreId = 0, filterType = FILTER_TYPES.DEFAULT) {
    const url = `${PRIMARY_SERVER}${ENDPOINTS.MOVIES}/${genreId}/${filterType}/${page}/${API_KEY}/`;
    return await fetchWithFallback(url);
  }

  /**
   * Get series with optional filters
   */
  async function getSeries(page = 0, genreId = 0, filterType = FILTER_TYPES.DEFAULT) {
    const url = `${PRIMARY_SERVER}${ENDPOINTS.SERIES}/${genreId}/${filterType}/${page}/${API_KEY}/`;
    return await fetchWithFallback(url);
  }

  /**
   * Get seasons for a series
   */
  async function getSeasons(seriesId) {
    const url = `${PRIMARY_SERVER}${ENDPOINTS.SEASONS}/${seriesId}/${API_KEY}/`;
    return await fetchWithFallback(url);
  }

  /**
   * Search movies and series
   */
  async function search(query) {
    const encoded = encodeURIComponent(query).replace(/%20/g, '%20');
    const url = `${PRIMARY_SERVER}${ENDPOINTS.SEARCH}/${encoded}/${API_KEY}/`;
    const data = await fetchWithFallback(url);
    // API returns { posters: [...] } or raw array
    if (data && data.posters) return data.posters;
    if (Array.isArray(data)) return data;
    return [];
  }

  /**
   * Find a single movie by ID (scans pages 0-3)
   */
  async function findMovieById(id, genreId = 0) {
    for (let page = 0; page < 4; page++) {
      try {
        const movies = await getMovies(page, genreId);
        if (!Array.isArray(movies)) continue;
        const found = movies.find(m => m.id === id);
        if (found) return found;
      } catch { continue; }
    }
    return null;
  }

  /**
   * Find a series by ID
   */
  async function findSeriesById(id, genreId = 0) {
    for (let page = 0; page < 4; page++) {
      try {
        const list = await getSeries(page, genreId);
        if (!Array.isArray(list)) continue;
        const found = list.find(s => s.id === id);
        if (found) return found;
      } catch { continue; }
    }
    return null;
  }

  /**
   * Get multiple pages and flatten
   */
  async function getMultiplePages(type, count, genreId = 0, filterType = FILTER_TYPES.DEFAULT) {
    const results = [];
    const fetchFn = type === 'movie' ? getMovies : getSeries;
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(fetchFn(i, genreId, filterType).catch(() => []));
    }
    const pages = await Promise.all(promises);
    for (const page of pages) {
      if (Array.isArray(page)) results.push(...page);
    }
    return results;
  }

  return {
    getMovies,
    getSeries,
    getSeasons,
    search,
    findMovieById,
    findSeriesById,
    getMultiplePages,
    fetchWithFallback,
    clearCache: () => cache.clear()
  };
})();
