/* =============================================
   Pluto TV — Shared UI helpers
   ============================================= */

const UI = (() => {

  function showLoading() {
    const el = document.getElementById('loading');
    if (el) el.classList.remove('hidden');
  }

  function hideLoading() {
    const el = document.getElementById('loading');
    if (el) el.classList.add('hidden');
  }

  function createPosterCard(item, onClick) {
    const card = document.createElement('div');
    card.className = 'poster-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('data-focus', '');
    card.dataset.id = item.id;

    const imdb = item.imdb ? parseFloat(item.imdb).toFixed(1) : null;
    const year = item.year || '';
    const img = item.image || item.cover || '';

    let badgeHtml = '';
    if (item.type === 'serie') {
      badgeHtml = '<div class="poster-badge">سریال</div>';
    }

    let imdbHtml = '';
    if (imdb && parseFloat(imdb) > 0) {
      imdbHtml = `<div class="poster-imdb">★ ${imdb}</div>`;
    }

    card.innerHTML = `
      <div style="position:relative;">
        <img class="poster-img" src="${img}" alt="${escapeHtml(item.title)}"
             loading="lazy" onerror="this.style.opacity='0.1'">
        ${imdbHtml}
        ${badgeHtml}
      </div>
      <div class="poster-info">
        <div class="poster-title">${escapeHtml(item.title)}</div>
        <div class="poster-meta">
          <span>${year}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => onClick(item));
    card.addEventListener('focus', () => {
      // Auto-scroll into view for horizontal rows
      const row = card.closest('.row-scroll');
      if (row) {
        const rect = card.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        if (rect.right > rowRect.right - 20) {
          row.scrollLeft += rect.width + 12;
        } else if (rect.left < rowRect.left + 20) {
          row.scrollLeft -= rowRect.width * 0.8;
        }
      }
    });

    return card;
  }

  function createContentRow(title, items, onItemClick) {
    const row = document.createElement('div');
    row.className = 'content-row';

    const header = document.createElement('div');
    header.className = 'row-title';
    header.textContent = title;
    row.appendChild(header);

    const scroll = document.createElement('div');
    scroll.className = 'row-scroll';

    for (const item of items) {
      scroll.appendChild(createPosterCard(item, onItemClick));
    }

    row.appendChild(scroll);
    return row;
  }

  function createContentGrid(items, onItemClick) {
    const grid = document.createElement('div');
    grid.className = 'content-grid';
    for (const item of items) {
      grid.appendChild(createPosterCard(item, onItemClick));
    }
    return grid;
  }

  function createEmptyState(msg) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `<p>${escapeHtml(msg)}</p>`;
    return div;
  }

  function createHero(item, onPlay, onInfo) {
    const hero = document.createElement('div');
    hero.className = 'hero';

    const bg = document.createElement('div');
    bg.className = 'hero-bg';
    bg.style.backgroundImage = `url('${item.cover || item.image || ''}')`;
    hero.appendChild(bg);

    const gradient = document.createElement('div');
    gradient.className = 'hero-gradient';
    hero.appendChild(gradient);

    const content = document.createElement('div');
    content.className = 'hero-content';

    const imdb = item.imdb ? parseFloat(item.imdb).toFixed(1) : '';
    const year = item.year || '';
    const duration = item.duration || '';
    const genres = (item.genres || []).map(g => g.title).join('، ');

    content.innerHTML = `
      <h2 class="hero-title">${escapeHtml(item.title)}</h2>
      <div class="hero-meta">
        ${imdb ? `<span>★ ${imdb}</span>` : ''}
        ${year ? `<span>${year}</span>` : ''}
        ${duration ? `<span>${duration}</span>` : ''}
        ${genres ? `<span>${genres}</span>` : ''}
      </div>
      <div class="hero-description">${escapeHtml(item.description || '')}</div>
      <div class="hero-actions">
        <button class="hero-btn-play" data-focus>
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          پخش
        </button>
        <button class="hero-btn-info">
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/></svg>
          اطلاعات بیشتر
        </button>
      </div>
    `;

    content.querySelector('.hero-btn-play').addEventListener('click', (e) => {
      e.stopPropagation();
      onPlay(item);
    });
    content.querySelector('.hero-btn-info').addEventListener('click', (e) => {
      e.stopPropagation();
      onInfo(item);
    });

    hero.appendChild(content);
    return hero;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function debounce(fn, ms = 400) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  return {
    showLoading,
    hideLoading,
    createPosterCard,
    createContentRow,
    createContentGrid,
    createEmptyState,
    createHero,
    escapeHtml,
    debounce
  };
})();
