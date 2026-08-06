/* =============================================
   Pluto TV — API Module
   Loads from static JSON files (no CORS issues!)
   Falls back to live server if needed
   ============================================= */

const API = (() => {

  const { PRIMARY_SERVER, API_KEY, ENDPOINTS, TIMEOUT } = CONFIG.API;

  // In-memory cache
  const cache = new Map();

  // Data files (static, no CORS problem)
  const DATA_FILES = {
    movies: 'data/movies.json',
    moviesImdb: 'data/movies_imdb.json',
    series: 'data/series.json',
    seasons: 'data/seasons.json'
  };

  function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CONFIG.CACHE_TTL) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  function setCached(key, data) {
    cache.set(key, { ts: Date.now(), data });
  }

  /**
   * Load static JSON file
   */
  async function loadStatic(file) {
    const cached = getCached(`static:${file}`);
    if (cached) return cached;

    const resp = await fetch(file, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error(`Failed to load ${file}: HTTP ${resp.status}`);
    const data = await resp.json();
    setCached(`static:${file}`, data);
    return data;
  }

  /**
   * Try live server with CORS proxy fallback
   * (only used for searches and fresh data)
   */
  async function fetchLive(url, options = {}) {
    const cached = getCached(url);
    if (cached) return cached;

    const attempts = [
      // Direct (works if server has CORS or same origin)
      { url, headers: {} },
      // CORS proxies
      { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, headers: {} },
      { url: `https://corsproxy.io/?url=${encodeURIComponent(url)}`, headers: {} },
      { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, headers: {} }
    ];

    let lastError = null;
    for (const attempt of attempts) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT);

        const resp = await fetch(attempt.url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json', ...attempt.headers }
        });

        clearTimeout(timer);

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const text = await resp.text();

        // Skip HTML responses (proxies sometimes return HTML)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error('HTML response (not JSON)');
        }

        const json = JSON.parse(text);
        setCached(url, json);
        return json;
      } catch (err) {
        console.warn('[API] attempt failed:', attempt.url.split('?')[0], err.message);
        lastError = err;
      }
    }

    throw new Error(`All requests failed: ${lastError?.message}`);
  }

  /**
   * Get movies — from static data
   * @param {number} page - page number (0-based)
   * @param {number} genreId - 0 for all genres (unused in static)
   * @param {string} filterType - 'created' | 'year' | 'imdb'
   */
  async function getMovies(page = 0, genreId = 0, filterType = FILTER_TYPES.DEFAULT) {
    try {
      const all = await loadStatic(DATA_FILES.movies);
      const start = page * CONFIG.PAGE_SIZE;
      const pageItems = all.slice(start, start + CONFIG.PAGE_SIZE);
      if (filterType === FILTER_TYPES.BY_IMDB) {
        const imdb = await loadStatic(DATA_FILES.moviesImdb);
        const start = page * CONFIG.PAGE_SIZE;
        return imdb.slice(start, start + CONFIG.PAGE_SIZE);
      }
      return pageItems;
    } catch (err) {
      console.warn('[API] static movies failed, trying live:', err.message);
      const url = `${PRIMARY_SERVER}${ENDPOINTS.MOVIES}/${genreId}/${filterType}/${page}/${API_KEY}/`;
      return await fetchLive(url);
    }
  }

  /**
   * Get series — from static data
   */
  async function getSeries(page = 0, genreId = 0, filterType = FILTER_TYPES.DEFAULT) {
    try {
      const all = await loadStatic(DATA_FILES.series);
      const start = page * CONFIG.PAGE_SIZE;
      return all.slice(start, start + CONFIG.PAGE_SIZE);
    } catch (err) {
      console.warn('[API] static series failed, trying live:', err.message);
      const url = `${PRIMARY_SERVER}${ENDPOINTS.SERIES}/${genreId}/${filterType}/${page}/${API_KEY}/`;
      return await fetchLive(url);
    }
  }

  /**
   * Get seasons for a series — from static data
   */
  async function getSeasons(seriesId) {
    try {
      const all = await loadStatic(DATA_FILES.seasons);
      return all[String(seriesId)] || [];
    } catch (err) {
      console.warn('[API] static seasons failed, trying live:', err.message);
      const url = `${PRIMARY_SERVER}${ENDPOINTS.SEASONS}/${seriesId}/${API_KEY}/`;
      return await fetchLive(url);
    }
  }

  /**
   * Search — needs live API (no static data)
   */
  async function search(query) {
    // First search static data
    const results = [];
    try {
      const [movies, series] = await Promise.all([
        loadStatic(DATA_FILES.movies),
        loadStatic(DATA_FILES.series)
      ]);
      const q = query.toLowerCase();

      for (const m of [...movies, ...series]) {
        if (m.title && m.title.toLowerCase().includes(q)) {
          results.push(m);
        }
      }
    } catch (err) {
      console.warn('[API] static search failed:', err.message);
    }

    if (results.length > 0) return results;

    // Fallback to live search
    try {
      const encoded = encodeURIComponent(query);
      const url = `${PRIMARY_SERVER}${ENDPOINTS.SEARCH}/${encoded}/${API_KEY}/`;
      const data = await fetchLive(url);
      if (data && data.posters) return data.posters;
      if (Array.isArray(data)) return data;
    } catch (err) {
      console.warn('[API] live search failed:', err.message);
    }

    return results;
  }

  /**
   * Find a single movie by ID
   */
  async function findMovieById(id) {
    try {
      const all = await loadStatic(DATA_FILES.movies);
      return all.find(m => m.id === id) || null;
    } catch { return null; }
  }

  /**
   * Find a series by ID
   */
  async function findSeriesById(id) {
    try {
      const all = await loadStatic(DATA_FILES.series);
      return all.find(s => s.id === id) || null;
    } catch { return null; }
  }

  /**
   * Get multiple pages flattened
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
    fetchLive,
    clearCache: () => cache.clear()
  };
})();
