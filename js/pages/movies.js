/* =============================================
   Pluto TV — Movies Page
   Grid with genre filter + sort tabs + infinite scroll
   ============================================= */

const PageMovies = (() => {

  let currentPage = 0;
  let currentGenreId = 0;
  let currentFilter = FILTER_TYPES.DEFAULT;
  let allItems = [];
  let loading = false;
  let containerRef = null;

  async function loadMore() {
    if (loading || currentPage >= CONFIG.MAX_PAGES) return;
    loading = true;
    UI.showLoading();

    try {
      const items = await API.getMovies(currentPage, currentGenreId, currentFilter);
      if (Array.isArray(items)) {
        allItems.push(...items);
        renderGrid(items, true);
      }
      currentPage++;
    } catch (err) {
      console.error('[Movies] loadMore:', err);
      Toast.show('خطا در بارگذاری صفحه‌های بیشتر');
    } finally {
      UI.hideLoading();
      loading = false;
    }
  }

  function renderGrid(items, append = false) {
    if (!containerRef) return;
    let grid = containerRef.querySelector('.content-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'content-grid';
      containerRef.appendChild(grid);
    }
    for (const item of items) {
      if (item.image || item.cover) {
        grid.appendChild(UI.createPosterCard(item, (i) => Detail.openMovie(i)));
      }
    }
    attachScrollObserver();
  }

  function attachScrollObserver() {
    const main = document.getElementById('main');
    if (attachScrollObserver._attached) return;
    attachScrollObserver._attached = true;
    main.addEventListener('scroll', UI.debounce(() => {
      if (main.scrollTop + main.clientHeight >= main.scrollHeight - 300) {
        loadMore();
      }
    }, 200));
  }

  async function render(container, state) {
    containerRef = container;
    currentPage = 0;
    allItems = [];
    currentGenreId = state.genreId || 0;
    currentFilter = state.filter || FILTER_TYPES.DEFAULT;

    UI.showLoading();

    // Header
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1 class="page-title">فیلم‌ها</h1>
      <p class="page-subtitle">مجموعه فیلم‌ها</p>
    `;
    container.appendChild(header);

    // Filter tabs
    const filters = document.createElement('div');
    filters.className = 'filter-tabs';
    filters.style.padding = '0 2.5rem';
    const filterData = [
      { key: FILTER_TYPES.DEFAULT, label: 'جدیدترین' },
      { key: FILTER_TYPES.BY_YEAR, label: 'بر اساس سال' },
      { key: FILTER_TYPES.BY_IMDB, label: 'برترین IMDb' }
    ];
    filterData.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'filter-tab' + (f.key === currentFilter ? ' active' : '');
      btn.textContent = f.label;
      btn.setAttribute('tabindex', '0');
      btn.addEventListener('click', () => {
        currentFilter = f.key;
        currentPage = 0;
        allItems = [];
        const grid = container.querySelector('.content-grid');
        if (grid) container.removeChild(grid);
        filters.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadMore();
      });
      filters.appendChild(btn);
    });
    container.appendChild(filters);

    try {
      const items = await API.getMovies(currentPage, currentGenreId, currentFilter);
      if (Array.isArray(items) && items.length > 0) {
        allItems.push(...items);
        renderGrid(items);
        currentPage++;
      } else {
        container.appendChild(UI.createEmptyState('فیلمی یافت نشد'));
      }
    } catch (err) {
      console.error('[Movies]', err);
      container.appendChild(UI.createEmptyState('خطا در بارگذاری فیلم‌ها'));
    } finally {
      UI.hideLoading();
    }
  }

  return { render };
})();
