/* =============================================
   Pluto TV — Home Page
   Hero banner + content rows
   ============================================= */

const PageHome = (() => {

  async function render(container, state) {
    UI.showLoading();

    try {
      // Fetch 3 pages of movies + 2 pages of series in parallel
      const [moviesP1, moviesP2, moviesP3, seriesP1, seriesP2] = await Promise.all([
        API.getMovies(0).catch(() => []),
        API.getMovies(1).catch(() => []),
        API.getMovies(0, 0, FILTER_TYPES.BY_IMDB).catch(() => []),
        API.getSeries(0).catch(() => []),
        API.getSeries(1).catch(() => [])
      ]);

      const allMovies = [...(moviesP1||[]), ...(moviesP2||[])];
      const topMovies = (moviesP3 || []).filter(m => m.sources && m.sources.length > 0);
      const allSeries = [...(seriesP1||[]), ...(seriesP2||[])];

      // Pick hero item: highest IMDB movie with cover
      const heroCandidate = [...allMovies, ...allSeries]
        .filter(m => (m.cover || m.image) && m.imdb && parseFloat(m.imdb) > 5)
        .sort((a, b) => parseFloat(b.imdb) - parseFloat(a.imdb))[0]
        || allMovies[0]
        || allSeries[0];

      // Header
      const header = document.createElement('div');
      header.className = 'page-header';
      header.innerHTML = `
        <h1 class="page-title">خانه</h1>
        <p class="page-subtitle">به Pluto TV خوش آمدید</p>
      `;
      container.appendChild(header);

      if (heroCandidate) {
        const hero = UI.createHero(heroCandidate,
          // onPlay
          (item) => {
            if (item.type === 'serie') {
              Detail.openSeries(item);
            } else {
              Detail.openMovie(item);
            }
          },
          // onInfo
          (item) => {
            if (item.type === 'serie') {
              Detail.openSeries(item);
            } else {
              Detail.openMovie(item);
            }
          }
        );
        container.appendChild(hero);
      }

      // Content rows
      if (topMovies.length > 0) {
        container.appendChild(UI.createContentRow(
          '⭐ برترین‌ها (IMDb)',
          topMovies.slice(0, 20),
          (item) => Detail.openMovie(item)
        ));
      }

      const newMovies = allMovies.filter(m => m.sources && m.sources.length > 0).slice(0, 20);
      if (newMovies.length > 0) {
        container.appendChild(UI.createContentRow(
          '🎬 فیلم‌های جدید',
          newMovies,
          (item) => Detail.openMovie(item)
        ));
      }

      const newSeries = allSeries.slice(0, 20);
      if (newSeries.length > 0) {
        container.appendChild(UI.createContentRow(
          '📺 سریال‌های جدید',
          newSeries,
          (item) => Detail.openSeries(item)
        ));
      }

      // Random row from all movies
      if (allMovies.length > 20) {
        const shuffled = [...allMovies].sort(() => Math.random() - 0.5).slice(0, 20);
        container.appendChild(UI.createContentRow(
          '🎲 پیشنهاد برای شما',
          shuffled,
          (item) => Detail.openMovie(item)
        ));
      }

    } catch (err) {
      console.error('[Home]', err);
      container.appendChild(UI.createEmptyState('خطا در بارگذاری داده‌ها. بعداً تلاش کنید.'));
    } finally {
      UI.hideLoading();
    }
  }

  return { render };
})();
