/* =============================================
   Pluto TV — Storage Module (localStorage)
   Favorites + Settings
   ============================================= */

const Storage = (() => {

  const FAVS_KEY = 'pluto-tv-favorites';
  const SETTINGS_KEY = 'pluto-tv-settings';

  // ---- Favorites ----
  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(FAVS_KEY)) || [];
    } catch { return []; }
  }

  function saveFavorites(list) {
    localStorage.setItem(FAVS_KEY, JSON.stringify(list));
  }

  function isFavorite(id) {
    return getFavorites().some(f => f.id === id);
  }

  function addFavorite(item) {
    const favs = getFavorites();
    if (!favs.some(f => f.id === item.id)) {
      favs.push({
        id: item.id,
        title: item.title,
        image: item.image,
        cover: item.cover,
        year: item.year,
        imdb: item.imdb,
        type: item.type || 'movie',
        genres: item.genres || [],
        sources: item.sources || [],
        addedAt: Date.now()
      });
      saveFavorites(favs);
    }
  }

  function removeFavorite(id) {
    const favs = getFavorites().filter(f => f.id !== id);
    saveFavorites(favs);
  }

  function toggleFavorite(item) {
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
      return false;
    } else {
      addFavorite(item);
      return true;
    }
  }

  function clearFavorites() {
    saveFavorites([]);
  }

  // ---- Settings ----
  const DEFAULT_SETTINGS = {
    autoplay: true,
    subtitles: true,
    volume: 1.0,
    theme: 'dark',
    language: 'fa'
  };

  function getSettings() {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function updateSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    saveSettings(s);
  }

  return {
    // Favorites
    getFavorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearFavorites,
    // Settings
    getSettings,
    saveSettings,
    updateSetting
  };
})();
