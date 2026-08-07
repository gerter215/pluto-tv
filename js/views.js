/* ============================================================
   Pluto TV — نمایشگرها (views.js)
   ساخت و رندر همه صفحات
   ============================================================ */
(function (window) {
  'use strict';

  var API = window.PlutoAPI;
  var FOCUS = window.PlutoFocus;
  var CFG = window.PlutoConfig;

  var el = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html !== undefined) { e.innerHTML = html; }
    return e;
  };

  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // ---------- کارت فیلم/سریال ----------
  function makeCard(item, type) {
    var card = el('div', 'card focusable');
    card.setAttribute('data-id', item.id);
    card.setAttribute('data-type', type);
    card.tabIndex = -1;

    var poster = el('div', 'poster');
    if (item.image) {
      var img = document.createElement('img');
      img.loading = 'lazy';
      img.src = API.secureUrl(item.image);
      img.alt = item.title;
      img.addEventListener('error', function () { this.style.display = 'none'; });
      poster.appendChild(img);
    } else {
      poster.textContent = '🎬';
    }

    var t = el('div', 'card-title', esc(item.title));
    var meta = el('div', 'card-meta');
    if (item.imdb && item.imdb > 0) {
      meta.appendChild(el('span', 'imdb', '⭐ ' + item.imdb));
    }
    if (item.year) { meta.appendChild(el('span', '', '• ' + esc(item.year))); }

    card.appendChild(poster);
    card.appendChild(t);
    card.appendChild(meta);

    card.addEventListener('click', function () {
      openDetail(item, type);
    });
    return card;
  }

  // ---------- صفحه اصلی ----------
  function renderHome(main) {
    main.innerHTML = '';
    var title = el('div', 'screen-title', '🏠 خانه');
    main.appendChild(title);

    var loading = el('div', 'empty', 'در حال بارگذاری…');
    main.appendChild(loading);

    var genres = [];
    Promise.all([API.getGenres(), API.getMovies(0, 0, CFG.filters.DEFAULT), API.getSeries(0, 0, CFG.filters.DEFAULT)])
      .then(function (results) {
        genres = results[0] || [];
        var movies = results[1] || [];
        var series = results[2] || [];
        // حذف فقط پیام بارگذاری — عنوان خانه حفظ شود
        loading.remove();

        // ردیف: جدیدترین فیلم‌ها
        addRow(main, '🎬 جدیدترین فیلم‌ها', movies, 'movie', function () {
          window.PlutoApp.navigate('movies', { filter: 'created' });
        });

        // ردیف: جدیدترین سریال‌ها
        addRow(main, '📺 جدیدترین سریال‌ها', series, 'serie', function () {
          window.PlutoApp.navigate('series', { filter: 'created' });
        });

        // ردیف‌های ژانر (۵ ژانر اول)
        var genreCount = 0;
        genres.forEach(function (g) {
          if (genreCount >= 5) { return; }
          genreCount++;
          var gid = g.id;
          var rowWrap = el('div', 'row');
          rowWrap.appendChild(el('div', 'row-title', esc(g.title)));
          main.appendChild(rowWrap);
          var hscroll = el('div', 'hscroll');
          main.appendChild(hscroll);
          loadRow(hscroll, gid);
        });

        // اگر ژانر نبود
        if (genres.length === 0) {
          addRow(main, '🎬 فیلم‌های برتر', movies.slice(0, 15), 'movie', null);
        }
      })
      .catch(function (err) {
        loading.textContent = 'خطا در بارگذاری: ' + err.message;
        loading.style.color = '#f87171';
      });
  }

  function addRow(main, label, items, type, onAll) {
    var row = el('div', 'row');
    var header = el('div', 'row-header');
    var t = el('div', 'row-title', label);
    header.appendChild(t);
    if (onAll) {
      var all = el('div', 'row-all focusable', 'مشاهده همه ›');
      all.tabIndex = -1;
      all.addEventListener('click', onAll);
      header.appendChild(all);
    }
    row.appendChild(header);
    var hscroll = el('div', 'hscroll');
    (items || []).forEach(function (item) {
      hscroll.appendChild(makeCard(item, type));
    });
    row.appendChild(hscroll);
    main.appendChild(row);
  }

  function loadRow(hscroll, genreId) {
    API.getMovies(0, genreId, CFG.filters.DEFAULT)
      .then(function (movies) {
        hscroll.innerHTML = '';
        (movies || []).forEach(function (m) {
          hscroll.appendChild(makeCard(m, 'movie'));
        });
        // اسکرول خودکار به اولین کارت
        var first = hscroll.querySelector('.card');
        if (first) { FOCUS.setFocus(first, { scroll: false }); }
      })
      .catch(function () {
        hscroll.innerHTML = '<div class="empty" style="padding:20px;font-size:15px">خطا در بارگذاری</div>';
      });
  }

  // ---------- فهرست فیلم‌ها / سریال‌ها ----------
  function renderList(main, type, opts) {
    opts = opts || {};
    var genreId = opts.genreId || 0;
    var filter = opts.filter || CFG.filters.DEFAULT;
    var page = opts.page || 0;
    var allItems = [];
    var loadingMore = false;
    var hasMore = true;

    main.innerHTML = '';
    var isMovie = (type === 'movie');
    var title = el('div', 'screen-title', isMovie ? '🎬 فیلم‌ها' : '📺 سریال‌ها');
    main.appendChild(title);

    // چیپ‌های فیلتر
    var chipsWrap = el('div', 'chips');
    var chipDefs = [
      { label: 'جدیدترین', value: 'created' },
      { label: 'سال ساخت', value: 'year' },
      { label: 'امتیاز IMDb', value: 'imdb' }
    ];
    chipDefs.forEach(function (c) {
      var chip = el('div', 'chip focusable' + (filter === c.value ? ' active' : ''), c.label);
      chip.tabIndex = -1;
      chip.addEventListener('click', function () {
        window.PlutoApp.navigate(type === 'movie' ? 'movies' : 'series', { filter: c.value, genreId: genreId });
      });
      chipsWrap.appendChild(chip);
    });
    main.appendChild(chipsWrap);

    var gridWrap = el('div', 'grid');
    var loading = el('div', 'empty', 'در حال بارگذاری…');
    main.appendChild(gridWrap);

    function loadPage(p) {
      if (loadingMore) { return; }
      loadingMore = true;
      var req = isMovie ? API.getMovies(p, genreId, filter) : API.getSeries(p, genreId, filter);
      req.then(function (items) {
        loadingMore = false;
        if (!items || items.length === 0) { hasMore = false; }
        else {
          items.forEach(function (item) {
            var card = makeCard(item, type);
            gridWrap.appendChild(card);
            allItems.push(item);
          });
          // بارگذاری صفحه بعدی به صورت خودکار هنگام اسکرول به انتها
          checkLoadMore();
        }
      }).catch(function (err) {
        loadingMore = false;
        if (gridWrap.children.length === 0) {
          var e = el('div', 'empty', 'خطا: ' + err.message);
          main.appendChild(e);
        }
      });
    }

    function checkLoadMore() {
      var mainEl = document.getElementById('main');
      if (!hasMore || loadingMore) { return; }
      var scrolled = mainEl.scrollTop + mainEl.clientHeight;
      if (scrolled > mainEl.scrollHeight - 400) {
        loadPage(++page);
      }
    }

    // شنونده اسکرول
    var mainEl = document.getElementById('main');
    var onScroll = function () { checkLoadMore(); };
    mainEl.addEventListener('scroll', onScroll);
    window.__plutoScrollCleanup = window.__plutoScrollCleanup || [];
    window.__plutoScrollCleanup.push(function () {
      mainEl.removeEventListener('scroll', onScroll);
    });

    loadPage(0);
  }

  // ---------- جزئیات فیلم/سریال ----------
  function openDetail(item, type) {
    if (type === 'movie') {
      window.PlutoApp.navigate('movie', { id: item.id, item: item });
    } else {
      window.PlutoApp.navigate('seriesDetail', { id: item.id, item: item });
    }
  }

  function renderMovieDetail(main, item) {
    main.innerHTML = '';
    var detail = el('div', 'detail');

    if (item.cover) {
      var back = el('div', 'detail-backdrop');
      back.style.backgroundImage = 'url(' + API.secureUrl(item.cover) + ')';
      detail.appendChild(back);
    }

    var cover = el('div', 'detail-cover');
    if (item.image) {
      var img = document.createElement('img');
      img.src = API.secureUrl(item.image);
      img.alt = item.title;
      cover.appendChild(img);
    } else { cover.textContent = '🎬'; }
    detail.appendChild(cover);

    var info = el('div', 'detail-info');
    info.appendChild(el('h2', '', esc(item.title)));

    var meta = el('div', 'detail-meta');
    if (item.imdb && item.imdb > 0) { meta.appendChild(el('span', 'imdb', '⭐ ' + item.imdb)); }
    if (item.year) { meta.appendChild(el('span', 'badge', esc(item.year))); }
    if (item.duration && item.duration !== 'N/A') { meta.appendChild(el('span', 'badge', esc(item.duration))); }
    (item.genres || []).forEach(function (g) { meta.appendChild(el('span', 'badge', esc(g.title))); });
    info.appendChild(meta);

    var desc = el('div', 'detail-desc', esc(item.description || ''));
    info.appendChild(desc);

    // اکشن‌ها
    var actions = el('div', 'actions');
    var sources = item.sources || [];

    var playable = sources.filter(function (s) {
      return (s.type === 'mp4' || s.type === 'webm' || (s.url && s.url.indexOf('.m3u8') !== -1));
    });
    var playSrc = playable.length > 0 ? playable : sources;

    if (playSrc.length > 0) {
      var btnPlay = el('button', 'btn focusable', '▶ پخش');
      btnPlay.tabIndex = -1;
      btnPlay.addEventListener('click', function () {
        window.PlutoPlayer.open(item, playSrc, item.title);
      });
      actions.appendChild(btnPlay);
    }

    if (sources.length > 0) {
      var btnQual = el('button', 'btn secondary focusable', '🎚 کیفیت‌ها (' + sources.length + ')');
      btnQual.tabIndex = -1;
      btnQual.addEventListener('click', function () {
        window.PlutoPlayer.open(item, sources, item.title);
      });
      actions.appendChild(btnQual);
    }

    var btnFav = el('button', 'btn secondary focusable', isFavorite(item) ? '❤️ حذف از علاقه‌مندی‌ها' : '🤍 افزودن به علاقه‌مندی‌ها');
    btnFav.tabIndex = -1;
    btnFav.addEventListener('click', function () {
      toggleFavorite(item, 'movie');
      btnFav.textContent = isFavorite(item) ? '❤️ حذف از علاقه‌مندی‌ها' : '🤍 افزودن به علاقه‌مندی‌ها';
    });
    actions.appendChild(btnFav);

    info.appendChild(actions);
    detail.appendChild(info);
    main.appendChild(detail);
  }

  function renderSeriesDetail(main, item) {
    main.innerHTML = '';
    var detail = el('div', 'detail');

    if (item.cover) {
      var back = el('div', 'detail-backdrop');
      back.style.backgroundImage = 'url(' + API.secureUrl(item.cover) + ')';
      detail.appendChild(back);
    }

    var cover = el('div', 'detail-cover');
    if (item.image) {
      var img = document.createElement('img');
      img.src = API.secureUrl(item.image);
      cover.appendChild(img);
    } else { cover.textContent = '📺'; }
    detail.appendChild(cover);

    var info = el('div', 'detail-info');
    info.appendChild(el('h2', '', esc(item.title)));

    var meta = el('div', 'detail-meta');
    if (item.imdb && item.imdb > 0) { meta.appendChild(el('span', 'imdb', '⭐ ' + item.imdb)); }
    if (item.year) { meta.appendChild(el('span', 'badge', esc(item.year))); }
    (item.genres || []).forEach(function (g) { meta.appendChild(el('span', 'badge', esc(g.title))); });
    info.appendChild(meta);

    info.appendChild(el('div', 'detail-desc', esc(item.description || '')));

    var btnFav = el('button', 'btn secondary focusable', isFavorite(item) ? '❤️ حذف از علاقه‌مندی‌ها' : '🤍 افزودن به علاقه‌مندی‌ها');
    btnFav.tabIndex = -1;
    btnFav.addEventListener('click', function () {
      toggleFavorite(item, 'serie');
      btnFav.textContent = isFavorite(item) ? '❤️ حذف از علاقه‌مندی‌ها' : '🤍 افزودن به علاقه‌مندی‌ها';
    });
    info.appendChild(btnFav);
    detail.appendChild(info);
    main.appendChild(detail);

    // فصل‌ها
    var section = el('div', 'section-title', '📅 فصل‌ها و قسمت‌ها');
    main.appendChild(section);

    var loading = el('div', 'empty', 'در حال بارگذاری فصل‌ها…');
    main.appendChild(loading);

    API.getSeasons(item.id).then(function (seasons) {
      loading.remove();
      if (!seasons || seasons.length === 0) {
        main.appendChild(el('div', 'empty', 'فصلی یافت نشد'));
        return;
      }

      var activeSeason = 0;

      function renderEpisodes() {
        var oldList = document.querySelector('.episode-list');
        if (oldList) { oldList.remove(); }
        var season = seasons[activeSeason];
        var list = el('div', 'episode-list');

        (season.episodes || []).forEach(function (ep, idx) {
          var epEl = el('div', 'episode focusable');
          epEl.tabIndex = -1;
          epEl.appendChild(el('div', 'ep-num', String(idx + 1)));
          epEl.appendChild(el('div', 'ep-title', esc(ep.title || ('قسمت ' + (idx + 1)))));
          if (ep.duration && ep.duration !== 'N/A') {
            epEl.appendChild(el('div', 'ep-dur', esc(ep.duration)));
          }
          epEl.addEventListener('click', function () {
            var epSources = ep.sources || [];
            var playable = epSources.filter(function (s) {
              return (s.type === 'mp4' || s.type === 'webm' || (s.url && s.url.indexOf('.m3u8') !== -1));
            });
            var srcs = playable.length > 0 ? playable : epSources;
            if (srcs.length > 0) {
              window.PlutoPlayer.open(ep, srcs, item.title + ' — ' + (ep.title || ('قسمت ' + (idx + 1))));
            } else {
              toast('این قسمت سورس قابل پخشی ندارد');
            }
          });
          list.appendChild(epEl);
        });

        main.appendChild(list);
      }

      // چیپ‌های فصل
      var seasonsWrap = el('div', 'seasons');
      seasons.forEach(function (s, i) {
        var chip = el('div', 'chip focusable' + (i === 0 ? ' active' : ''), esc(s.title || ('فصل ' + (i + 1))));
        chip.tabIndex = -1;
        chip.addEventListener('click', function () {
          activeSeason = i;
          seasonsWrap.querySelectorAll('.chip').forEach(function (c, j) {
            c.classList.toggle('active', j === i);
          });
          renderEpisodes();
        });
        seasonsWrap.appendChild(chip);
      });
      main.appendChild(seasonsWrap);

      renderEpisodes();
    }).catch(function (err) {
      loading.textContent = 'خطا در بارگذاری فصل‌ها: ' + err.message;
    });
  }

  // ---------- جستجو ----------
  var SEARCH_KEYS = [
    'ا', 'ب', 'پ', 'ت', 'ث', 'ج', 'چ', 'ح', 'خ', 'د',
    'ذ', 'ر', 'ز', 'ژ', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ',
    'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن', 'و',
    'ه', 'ی', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
    'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r',
    's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1',
    '2', '3', '4', '5', '6', '7', '8', '9', ' ', '-'
  ];

  function renderSearch(main) {
    main.innerHTML = '';
    main.appendChild(el('div', 'screen-title', '🔍 جستجو'));

    var box = el('div', 'search-box');
    var caret = el('span', 'caret');
    box.appendChild(caret);
    var querySpan = el('span', 'query', '');
    box.insertBefore(querySpan, caret);
    main.appendChild(box);

    var kbd = el('div', 'kbd');
    SEARCH_KEYS.forEach(function (ch) {
      var key = el('button', 'kbd-key focusable', ch === ' ' ? '⎵' : ch);
      key.tabIndex = -1;
      key.addEventListener('click', function () {
        addChar(ch);
      });
      kbd.appendChild(key);
    });

    // دکمه‌های عمل
    var backBtn = el('button', 'kbd-key wide focusable', '⌫ حذف');
    backBtn.tabIndex = -1;
    backBtn.addEventListener('click', function () { removeChar(); });
    kbd.appendChild(backBtn);

    var clearBtn = el('button', 'kbd-key wide focusable', '✕ پاک‌کردن');
    clearBtn.tabIndex = -1;
    clearBtn.addEventListener('click', function () { clearQuery(); });
    kbd.appendChild(clearBtn);

    var goBtn = el('button', 'kbd-key wide focusable', '🔍 جستجو');
    goBtn.tabIndex = -1;
    goBtn.addEventListener('click', function () { doSearch(); });
    kbd.appendChild(goBtn);

    main.appendChild(kbd);

    var resultsWrap = el('div', 'grid');
    main.appendChild(resultsWrap);
    var msg = el('div', 'empty', 'با صفحه‌کلید بالا جستجو کنید');
    main.appendChild(msg);

    var query = '';

    function updateBox() {
      querySpan.textContent = query;
    }

    function addChar(ch) {
      if (query.length >= 60) { return; }
      query += ch;
      updateBox();
    }
    function removeChar() {
      query = query.substring(0, query.length - 1);
      updateBox();
    }
    function clearQuery() {
      query = '';
      updateBox();
    }
    function doSearch() {
      if (!query.trim()) { return; }
      resultsWrap.innerHTML = '';
      msg.textContent = 'در حال جستجو…';
      API.search(query.trim()).then(function (res) {
        var posters = (res && res.posters) || [];
        msg.remove();
        resultsWrap.innerHTML = '';
        if (posters.length === 0) {
          msg.textContent = 'نتیجه‌ای یافت نشد';
          main.appendChild(msg);
          return;
        }
        posters.forEach(function (p) {
          var type = (p.type === 'serie') ? 'serie' : 'movie';
          resultsWrap.appendChild(makeCard(p, type));
        });
      }).catch(function (err) {
        msg.textContent = 'خطا: ' + err.message;
      });
    }
  }

  // ---------- علاقه‌مندی‌ها ----------
  function getFavorites() {
    try {
      var raw = localStorage.getItem('pluto_favs');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function isFavorite(item) {
    var favs = getFavorites();
    return favs.some(function (f) { return f.id === item.id && f.type === (item.type || 'movie'); });
  }

  function toggleFavorite(item, type) {
    var favs = getFavorites();
    var t = item.type || type || 'movie';
    var idx = favs.findIndex(function (f) { return f.id === item.id && f.type === t; });
    if (idx >= 0) {
      favs.splice(idx, 1);
      toast('از علاقه‌مندی‌ها حذف شد');
    } else {
      favs.push({ id: item.id, type: t, title: item.title, year: item.year, imdb: item.imdb, image: item.image, description: item.description, genres: item.genres || [] });
      toast('به علاقه‌مندی‌ها اضافه شد ❤️');
    }
    try { localStorage.setItem('pluto_favs', JSON.stringify(favs)); } catch (e) {}
  }

  function renderFavorites(main) {
    main.innerHTML = '';
    main.appendChild(el('div', 'screen-title', '❤️ علاقه‌مندی‌ها'));

    var favs = getFavorites();
    if (favs.length === 0) {
      main.appendChild(el('div', 'empty', 'هنوز چیزی ذخیره نکرده‌اید'));
      return;
    }

    var grid = el('div', 'grid');
    favs.forEach(function (f) {
      var card = el('div', 'card focusable');
      card.tabIndex = -1;
      var poster = el('div', 'poster');
      if (f.image) {
        var img = document.createElement('img');
        img.src = API.secureUrl(f.image);
        poster.appendChild(img);
      } else { poster.textContent = '🎬'; }
      card.appendChild(poster);
      card.appendChild(el('div', 'card-title', esc(f.title)));
      var meta = el('div', 'card-meta');
      if (f.imdb) { meta.appendChild(el('span', 'imdb', '⭐ ' + f.imdb)); }
      if (f.year) { meta.appendChild(el('span', '', esc(f.year))); }
      card.appendChild(meta);
      card.addEventListener('click', function () {
        openDetail(f, f.type === 'serie' ? 'serie' : 'movie');
      });
      grid.appendChild(card);
    });
    main.appendChild(grid);
  }

  // ---------- کشورها ----------
  function renderCountries(main) {
    main.innerHTML = '';
    main.appendChild(el('div', 'screen-title', '🌍 کشورها'));

    var loading = el('div', 'empty', 'در حال بارگذاری…');
    main.appendChild(loading);

    API.getCountries().then(function (countries) {
      loading.remove();
      var grid = el('div', 'grid');
      (countries || []).forEach(function (c) {
        var card = el('div', 'card focusable');
        card.tabIndex = -1;
        var poster = el('div', 'poster');
        if (c.image) {
          var img = document.createElement('img');
          img.src = API.secureUrl(c.image);
          poster.appendChild(img);
        } else { poster.textContent = '🏳️'; }
        card.appendChild(poster);
        card.appendChild(el('div', 'card-title', esc(c.title)));
        card.appendChild(el('div', 'card-meta', 'کشور'));
        card.addEventListener('click', function () {
          window.PlutoApp.navigate('country', { id: c.id, title: c.title });
        });
        grid.appendChild(card);
      });
      main.appendChild(grid);
    }).catch(function (err) {
      loading.textContent = 'خطا: ' + err.message;
    });
  }

  function renderCountry(main, opts) {
    main.innerHTML = '';
    main.appendChild(el('div', 'screen-title', '🌍 ' + esc(opts.title || 'کشور')));

    var grid = el('div', 'grid');
    main.appendChild(grid);
    var loading = el('div', 'empty', 'در حال بارگذاری…');
    main.appendChild(loading);

    var page = 0;
    var all = [];
    var loadingMore = false;
    var hasMore = true;

    function load() {
      if (loadingMore) { return; }
      loadingMore = true;
      API.getCountryPosters(opts.id, page, CFG.filters.DEFAULT).then(function (items) {
        loadingMore = false;
        if (!items || items.length === 0) { hasMore = false; }
        else {
          items.forEach(function (p) {
            var type = (p.type === 'serie') ? 'serie' : 'movie';
            grid.appendChild(makeCard(p, type));
            all.push(p);
          });
        }
        loading.remove();
      }).catch(function (err) {
        loadingMore = false;
        loading.textContent = 'خطا: ' + err.message;
      });
    }
    load();
  }

  // ---------- تنظیمات ----------
  function renderSettings(main) {
    main.innerHTML = '';
    main.appendChild(el('div', 'screen-title', '⚙️ تنظیمات'));

    var card1 = el('div', 'settings-card focusable');
    card1.tabIndex = -1;
    card1.appendChild(el('h3', '', '🗑 پاک‌کردن حافظه کش'));
    card1.appendChild(el('div', 'settings-row', 'برای رفع مشکلات نمایش، کش را پاک کنید'));
    card1.addEventListener('click', function () {
      API.clearCache();
      toast('کش پاک شد ✓');
    });
    main.appendChild(card1);

    var card2 = el('div', 'settings-card focusable');
    card2.tabIndex = -1;
    card2.appendChild(el('h3', '', '❤️ علاقه‌مندی‌ها'));
    var favRow = el('div', 'settings-row', 'مشاهده لیست علاقه‌مندی‌ها');
    favRow.addEventListener('click', function () { window.PlutoApp.navigate('favorites'); });
    card2.appendChild(favRow);
    main.appendChild(card2);

    var card3 = el('div', 'settings-card focusable');
    card3.tabIndex = -1;
    card3.appendChild(el('h3', '', 'ℹ️ درباره'));
    card3.appendChild(el('div', 'settings-row', 'Pluto TV — نسخه ۱.۰'));
    card3.appendChild(el('div', 'settings-row', 'بهینه‌سازی‌شده برای تلویزیون‌های سامسونگ (Tizen)'));
    main.appendChild(card3);
  }

  // ---------- توست ----------
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(function () {
      t.classList.add('hidden');
    }, 2500);
  }

  // ---------- پاکسازی شنونده‌های اسکرول ----------
  function cleanupScroll() {
    if (window.__plutoScrollCleanup) {
      window.__plutoScrollCleanup.forEach(function (fn) { try { fn(); } catch (e) {} });
      window.__plutoScrollCleanup = [];
    }
  }

  window.PlutoViews = {
    renderHome: renderHome,
    renderList: renderList,
    renderMovieDetail: renderMovieDetail,
    renderSeriesDetail: renderSeriesDetail,
    renderSearch: renderSearch,
    renderFavorites: renderFavorites,
    renderCountries: renderCountries,
    renderCountry: renderCountry,
    renderSettings: renderSettings,
    cleanupScroll: cleanupScroll,
    toast: toast,
    isFavorite: isFavorite
  };
})(window);
