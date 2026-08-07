/* ============================================================
   Pluto TV — لایه API (api.js)
   - درخواست به سرور اصلی با فال‌بک به سرورهای کمکی
   - کش ساده در حافظه برای کاهش درخواست
   - تبدیل URL تصاویر به HTTPS (برای صفحه HTTPS)
   ============================================================ */
(function (window) {
  'use strict';

  var CFG = window.PlutoConfig;
  var cache = {};
  var inFlight = {};

  // ------------------------------------------------------------------
  // ساخت URL درخواست با توجه به سرور
  function buildUrl(base, path, query) {
    var url = base + path;
    if (query) { url += '?' + query; }
    return url;
  }

  // ------------------------------------------------------------------
  // درخواست اصلی با فال‌بک
  function fetchJson(path, opts) {
    opts = opts || {};
    var useProxy = (opts.proxy !== false);
    var force = !!opts.force;

    // کش
    var cacheKey = path;
    if (!force && cache[cacheKey]) {
      return Promise.resolve(cache[cacheKey]);
    }

    // جلوگیری از درخواست تکراری همزمان
    if (inFlight[cacheKey]) { return inFlight[cacheKey]; }

    var servers = [CFG.apiBase].concat(CFG.helperServers);

    // حالت پروکسی: همه از مسیر /api هم‌ریشه می‌آیند
    // (در دیپلوی: Cloudflare Pages Functions — در لوکال: dev-server.js)
    if (useProxy && window.location.protocol !== 'file:') {
      servers = [window.location.origin];
    }

    var p = tryServers(servers, path).then(function (data) {
      cache[cacheKey] = data;
      return data;
    })['catch'](function (err) {
      delete inFlight[cacheKey];
      throw err;
    });

    inFlight[cacheKey] = p;
    return p;
  }

  function tryServers(servers, path) {
    var i = 0;
    function attempt() {
      if (i >= servers.length) {
        return Promise.reject(new Error('همه سرورها در دسترس نیستند'));
      }
      var base = servers[i++];
      var url = buildUrl(base, path);
      return httpGet(url).then(function (text) {
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new Error('پاسخ نامعتبر از سرور');
        }
      })['catch'](function (err) {
        return attempt();
      });
    }
    return attempt();
  }

  function httpGet(url) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 25000;
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else {
          reject(new Error('HTTP ' + xhr.status));
        }
      };
      xhr.onerror = function () { reject(new Error('خطای شبکه')); };
      xhr.ontimeout = function () { reject(new Error('وقفه در درخواست')); };
      xhr.send();
    });
  }

  // ------------------------------------------------------------------
  // تبدیل URL تصویر به HTTPS (برای جلوگیری از Mixed Content در صفحه HTTPS)
  function secureUrl(url) {
    if (!url) { return ''; }
    if (url.indexOf('http://') === 0) {
      return 'https://' + url.substring(7);
    }
    return url;
  }

  // تبدیل URL سورس ویدیو: اول HTTPS، اگر نشد HTTP
  // (در صفحه HTTPS مرورگرها http را بلاک می‌کنند، پس سعی می‌کنیم https کنیم)
  function secureSourceUrl(url) {
    if (!url) { return ''; }
    if (url.indexOf('http://') === 0) {
      return 'https://' + url.substring(7);
    }
    return url;
  }

  // ------------------------------------------------------------------
  // توابع عمومی

  // ژانرها
  function getGenres() {
    return fetchJson('/api/genre/all/' + CFG.apiKey);
  }

  // کشورها
  function getCountries() {
    return fetchJson('/api/country/all/' + CFG.apiKey + '/');
  }

  // فیلم‌ها
  function getMovies(page, genreId, filter) {
    page = page || 0;
    genreId = genreId || 0;
    filter = filter || CFG.filters.DEFAULT;
    return fetchJson('/api/movie/by/filtres/' + genreId + '/' + filter + '/' + page + '/' + CFG.apiKey + '/');
  }

  // سریال‌ها
  function getSeries(page, genreId, filter) {
    page = page || 0;
    genreId = genreId || 0;
    filter = filter || CFG.filters.DEFAULT;
    return fetchJson('/api/serie/by/filtres/' + genreId + '/' + filter + '/' + page + '/' + CFG.apiKey + '/');
  }

  // فصل‌ها و قسمت‌های یک سریال
  function getSeasons(seriesId) {
    return fetchJson('/api/season/by/serie/' + seriesId + '/' + CFG.apiKey + '/');
  }

  // جستجو
  function search(query) {
    var encoded = encodeURIComponent(query).replace(/%20/g, '%20');
    return fetchJson('/api/search/' + encoded + '/' + CFG.apiKey + '/');
  }

  // پوسترهای یک کشور
  function getCountryPosters(countryId, page, filter) {
    page = page || 0;
    filter = filter || CFG.filters.DEFAULT;
    return fetchJson('/api/poster/by/filtres/0/' + countryId + '/' + filter + '/' + page + '/' + CFG.apiKey + '/');
  }

  // پاک کردن کش
  function clearCache() {
    cache = {};
  }

  window.PlutoAPI = {
    getGenres: getGenres,
    getCountries: getCountries,
    getMovies: getMovies,
    getSeries: getSeries,
    getSeasons: getSeasons,
    search: search,
    getCountryPosters: getCountryPosters,
    clearCache: clearCache,
    secureUrl: secureUrl,
    secureSourceUrl: secureSourceUrl,
    _fetchJson: fetchJson
  };
})(window);
