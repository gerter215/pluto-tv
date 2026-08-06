/* =============================================
   Pluto TV — Config
   ============================================= */

const CONFIG = {
  APP_NAME: 'Pluto TV',
  VERSION: '1.0.0',

  // API settings (from CCloud source)
  API: {
    PRIMARY_SERVER: 'https://server-hi-speed-iran.info',
    HELPER_SERVERS: [
      'https://hostinnegar.com',
      'https://windowsdiba.info'
    ],
    API_KEY: '4F5A9C3D9A86FA54EACEDDD635185',
    ENDPOINTS: {
      MOVIES:    '/api/movie/by/filtres',
      SERIES:    '/api/serie/by/filtres',
      SEASONS:   '/api/season/by/serie',
      SEARCH:    '/api/search',
      GENRES:    '/api/genre',
      COUNTRIES: '/api/country'
    },
    TIMEOUT: 30000
  },

  // Pagination
  PAGE_SIZE: 20,
  MAX_PAGES: 50,

  // Cache TTL (ms)
  CACHE_TTL: 10 * 60 * 1000, // 10 minutes
};

// Fix server URL (ensure no trailing slash issues)
function fixUrl(url) {
  return url.replace(/\/+/g, '/').replace(':/', '://');
}

// Filter types matching CCloud
const FILTER_TYPES = {
  DEFAULT:  'created',
  BY_YEAR:  'year',
  BY_IMDB:  'imdb'
};
