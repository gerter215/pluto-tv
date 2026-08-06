/* =============================================
   Pluto TV — Detail Modal
   Shows movie/series detail + seasons + episodes
   ============================================= */

const Detail = (() => {

  function open() { return document.getElementById('detail-modal'); }
  function content() { return document.getElementById('detail-content'); }

  function close() {
    open().classList.add('hidden');
    open().innerHTML = '<div id="detail-content"></div>';
    // Return focus to main content
    const main = document.getElementById('main');
    const focused = main.querySelector('.poster-card[data-last-focused], .poster-card');
    if (focused) focused.focus();
  }

  function openMovie(item) {
    _renderDetail(item, false);
  }

  function openSeries(item) {
    _renderDetail(item, true);
  }

  async function _renderDetail(item, isSeries) {
    UI.showLoading();
    const modalEl = open();
    const contentEl = content();
    contentEl.innerHTML = '';
    modalEl.classList.remove('hidden');

    const isFav = Storage.isFavorite(item.id);

    const cover = item.cover || item.image || '';
    const genres = (item.genres || []).map(g => g.title);
    const countries = (item.country || []).map(c => c.title);
    const imdb = item.imdb ? parseFloat(item.imdb).toFixed(1) : null;
    const year = item.year || '';
    const duration = item.duration || '';

    contentEl.innerHTML = `
      <img class="detail-cover" src="${cover}" alt="${UI.escapeHtml(item.title)}"
           onerror="this.style.display='none'">
      <div class="detail-body">
        <h2 class="detail-title">${UI.escapeHtml(item.title)}</h2>
        <div class="detail-meta">
          ${imdb ? `<span>★ ${imdb}</span>` : ''}
          ${year ? `<span>${year}</span>` : ''}
          ${duration ? `<span>${duration}</span>` : ''}
          ${countries.length ? `<span>${countries.join('، ')}</span>` : ''}
        </div>
        <div class="detail-genres">
          ${genres.map(g => `<span class="genre-tag">${UI.escapeHtml(g)}</span>`).join('')}
        </div>
        <p class="detail-description">${UI.escapeHtml(item.description || '')}</p>
        <div class="detail-actions" id="detail-actions"></div>
        <div id="detail-sources"></div>
        <div id="detail-seasons"></div>
      </div>
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'detail-btn detail-btn-close';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('data-focus', '');
    closeBtn.addEventListener('click', close);
    contentEl.querySelector('#detail-actions').appendChild(closeBtn);

    // Favorite button
    const favBtn = document.createElement('button');
    favBtn.className = 'detail-btn detail-btn-fav' + (isFav ? ' active' : '');
    favBtn.innerHTML = isFav
      ? '❤️ حذف از علاقه‌مندی'
      : '🤍 افزودن به علاقه‌مندی';
    favBtn.setAttribute('tabindex', '0');
    favBtn.addEventListener('click', () => {
      const added = Storage.toggleFavorite(item);
      favBtn.innerHTML = added
        ? '❤️ حذف از علاقه‌مندی'
        : '�زش افزودن به علاقه‌مندی';
      Toast.show(added ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد');
    });
    contentEl.querySelector('#detail-actions').appendChild(favBtn);

    if (!isSeries && item.sources && item.sources.length > 0) {
      // Show quality selector for movies
      _renderSources(contentEl, item);
    } else if (isSeries) {
      // Load seasons for series
      _renderSeasons(contentEl, item);
    } else {
      const noSource = document.createElement('p');
      noSource.style.color = 'var(--text-muted)';
      noSource.textContent = 'منبع پخش موجود نیست';
      contentEl.querySelector('#detail-sources').appendChild(noSource);
    }

    UI.hideLoading();
    setTimeout(() => closeBtn.focus(), 300);
  }

  function _renderSources(contentEl, item) {
    const container = contentEl.querySelector('#detail-sources');
    container.innerHTML = '';

    const label = document.createElement('div');
    label.style.fontWeight = '700';
    label.style.marginBottom = '10px';
    label.textContent = ' کیفیت پخش را انتخاب کنید:';
    container.appendChild(label);

    // Filter playable sources (exclude trailers)
    const playable = item.sources.filter(s =>
      s.url && !s.quality.includes('تیزر')
    );
    const list = playable.length > 0 ? playable : item.sources;

    const qualityList = document.createElement('div');
    qualityList.className = 'quality-list';

    list.forEach((source, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quality-btn';
      btn.textContent = source.quality || `کیفیت ${idx + 1}`;
      btn.setAttribute('tabindex', '0');
      btn.addEventListener('click', () => {
        Player.play(item, list, idx);
      });
      qualityList.appendChild(btn);
    });

    container.appendChild(qualityList);
  }

  async function _renderSeasons(contentEl, item) {
    const container = contentEl.querySelector('#detail-seasons');
    container.innerHTML = '<p style="color:var(--text-muted)">در حال بارگذاری فصل‌ها...</p>';

    try {
      const seasons = await API.getSeasons(item.id);

      if (!seasons || seasons.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted)">فصلی یافت نشد</p>';
        return;
      }

      container.innerHTML = '';
      const header = document.createElement('div');
      header.style.fontWeight = '700';
      header.style.fontSize = '1.2rem';
      header.style.marginBottom = '1rem';
      header.textContent = `فصل‌ها (${seasons.length})`;
      container.appendChild(header);

      seasons.forEach((season, seasonIdx) => {
        const seasonHeader = document.createElement('div');
        seasonHeader.className = 'season-header';
        seasonHeader.setAttribute('tabindex', '0');
        seasonHeader.textContent = `${season.title || `فصل ${seasonIdx + 1}`} (${(season.episodes || []).length} قسمت)`;
        container.appendChild(seasonHeader);

        const episodesDiv = document.createElement('div');
        episodesDiv.className = 'episodes-list';
        episodesDiv.style.display = 'none';
        episodesDiv.style.marginTop = '10px';

        (season.episodes || []).forEach((ep, epIdx) => {
          const card = document.createElement('div');
          card.className = 'episode-card';
          card.setAttribute('tabindex', '0');

          const epImg = ep.image || '';
          card.innerHTML = `
            ${epImg ? `<img class="episode-thumb" src="${epImg}" loading="lazy" onerror="this.style.display='none'">` : ''}
            <div class="episode-info">
              <div class="episode-title">${epIdx + 1}. ${UI.escapeHtml(ep.title || `قسمت ${epIdx + 1}`)}</div>
              ${ep.description ? `<div class="episode-desc">${UI.escapeHtml(ep.description)}</div>` : ''}
            </div>
          `;

          card.addEventListener('click', () => {
            if (ep.sources && ep.sources.length > 0) {
              const epItem = {
                ...item,
                title: `${item.title} — ${ep.title || `قسمت ${epIdx + 1}`}`,
                sources: ep.sources
              };
              Player.play(epItem, ep.sources, 0);
            } else {
              Toast.show('منبع پخش این قسمت موجود نیست');
            }
          });

          episodesDiv.appendChild(card);
        });

        container.appendChild(episodesDiv);

        // Toggle episodes on click
        seasonHeader.addEventListener('click', () => {
          const isVisible = episodesDiv.style.display !== 'none';
          episodesDiv.style.display = isVisible ? 'none' : 'grid';
          seasonHeader.innerHTML = seasonHeader.innerHTML.replace(isVisible ? '▼' : '▶', isVisible ? '▶' : '▼');
        });

        // Auto-open first season
        if (seasonIdx === 0) {
          episodesDiv.style.display = 'grid';
        }
      });

    } catch (err) {
      console.error('[Detail] seasons:', err);
      container.innerHTML = '<p style="color:var(--text-muted)">خطا در بارگذاری فصل‌ها</p>';
    }
  }

  // Close on backdrop click
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('detail-modal');
    if (modal && !modal.classList.contains('hidden') && e.target === modal) {
      close();
    }
  });

  return { openMovie, openSeries, close };
})();
