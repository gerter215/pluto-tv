/* =============================================
   Pluto TV — Search Page
   ============================================= */

const PageSearch = (() => {

  async function render(container, state) {
    UI.showLoading();

    const header = document.createElement('div');
    header.className = 'search-container';
    header.innerHTML = `
      <h1 class="page-title">جستجو</h1>
      <div class="search-input-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-5-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/>
        </svg>
        <input type="text" class="search-input" id="search-input"
               placeholder="نام فیلم یا سریال را وارد کنید..."
               autocomplete="off" data-focus>
      </div>
    `;
    container.appendChild(header);

    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'content-grid';
    resultsDiv.style.paddingTop = '0';
    container.appendChild(resultsDiv);

    const input = header.querySelector('#search-input');
    setTimeout(() => input.focus(), 300);

    // Debounced search
    const doSearch = UI.debounce(async (query) => {
      resultsDiv.innerHTML = '';

      if (!query || query.trim().length < 2) {
        resultsDiv.appendChild(UI.createEmptyState('حداقل ۲ کاراکتر وارد کنید'));
        return;
      }

      UI.showLoading();
      try {
        const results = await API.search(query.trim());
        if (!results || results.length === 0) {
          resultsDiv.appendChild(UI.createEmptyState('نتیجه‌ای یافت نشد'));
          return;
        }

        for (const item of results) {
          if (item.image || item.cover) {
            const isSeries = item.type === 'serie';
            resultsDiv.appendChild(UI.createPosterCard(item, (i) => {
              if (isSeries) {
                Detail.openSeries(i);
              } else {
                Detail.openMovie(i);
              }
            }));
          }
        }
      } catch (err) {
        console.error('[Search]', err);
        resultsDiv.appendChild(UI.createEmptyState('خطا در جستجو'));
      } finally {
        UI.hideLoading();
      }
    }, 500);

    input.addEventListener('input', (e) => doSearch(e.target.value));

    // Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        doSearch(input.value);
        // Move focus to first result
        setTimeout(() => {
          const first = resultsDiv.querySelector('.poster-card');
          if (first) first.focus();
        }, 800);
      }
    });

    UI.hideLoading();
    resultsDiv.appendChild(UI.createEmptyState('برای شروع جستجو، تایپ کنید'));
  }

  return { render };
})();
