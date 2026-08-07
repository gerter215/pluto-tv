/* ============================================================
   Pluto TV — هسته اپ (app.js)
   - ناوبری بین صفحات (راوتر ساده مبتنی بر state)
   - راه‌اندازی اولیه و منوی کناری
   - مدیریت کلید بازگشت
   ============================================================ */
(function (window) {
  'use strict';

  var FOCUS = window.PlutoFocus;
  var VIEWS = window.PlutoViews;

  // ---------- منوی کناری ----------
  var NAV_ITEMS = [
    { id: 'home', label: 'خانه', icon: '🏠' },
    { id: 'movies', label: 'فیلم‌ها', icon: '🎬' },
    { id: 'series', label: 'سریال‌ها', icon: '📺' },
    { id: 'search', label: 'جستجو', icon: '🔍' },
    { id: 'favorites', label: 'علاقه‌مندی‌ها', icon: '❤️' },
    { id: 'countries', label: 'کشورها', icon: '🌍' },
    { id: 'settings', label: 'تنظیمات', icon: '⚙️' }
  ];

  var currentRoute = null;
  var historyStack = [];

  function buildNav() {
    var wrap = document.getElementById('nav-items');
    wrap.innerHTML = '';
    NAV_ITEMS.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'nav-item focusable';
      el.tabIndex = -1;
      el.setAttribute('data-route', item.id);
      el.innerHTML = '<span class="nav-icon">' + item.icon + '</span>' + item.label;
      el.addEventListener('click', function () {
        navigate(item.id);
      });
      wrap.appendChild(el);
    });
  }

  function setActiveNav(route) {
    var items = document.querySelectorAll('.nav-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', items[i].getAttribute('data-route') === route);
    }
  }

  // ---------- ناوبری ----------
  function navigate(route, opts) {
    opts = opts || {};

    // اگر همان صفحه است و آپشن ندارد، کاری نکن
    if (currentRoute === route && !opts.force) { return; }

    currentRoute = route;
    VIEWS.cleanupScroll();

    var main = document.getElementById('main');
    main.scrollTop = 0;
    setActiveNav(route);

    switch (route) {
      case 'home':
        VIEWS.renderHome(main);
        break;
      case 'movies':
        VIEWS.renderList(main, 'movie', opts);
        break;
      case 'series':
        VIEWS.renderList(main, 'serie', opts);
        break;
      case 'seriesDetail':
        VIEWS.renderSeriesDetail(main, opts.item);
        break;
      case 'search':
        VIEWS.renderSearch(main);
        break;
      case 'favorites':
        VIEWS.renderFavorites(main);
        break;
      case 'countries':
        VIEWS.renderCountries(main);
        break;
      case 'country':
        VIEWS.renderCountry(main, opts);
        break;
      case 'movie':
        VIEWS.renderMovieDetail(main, opts.item);
        break;
      case 'series':
        VIEWS.renderSeriesDetail(main, opts.item);
        break;
      case 'settings':
        VIEWS.renderSettings(main);
        break;
      default:
        VIEWS.renderHome(main);
    }

    // ذخیره در تاریخچه (برای دکمه بازگشت)
    historyStack.push({ route: route, opts: opts });

    // فوکوس اولیه
    setTimeout(function () {
      FOCUS.resetFocus(main);
      // اگر عنصری فوکوس نشد، فوکوس منوی کناری
      if (!FOCUS.getFocused()) {
        var nav = document.querySelector('.nav-item.active');
        if (nav) { FOCUS.setFocus(nav); }
      }
    }, 50);
  }

  // ---------- دکمه بازگشت ----------
  function onBack() {
    // اگر پخش‌کننده باز است، ببند
    if (window.PlutoPlayer && window.PlutoPlayer.isOpen()) {
      window.PlutoPlayer.close();
      return;
    }

    // اگر منوی کیفیت باز است (داخل پلیر هندل می‌شود، ولی اطمینان)
    var qm = document.getElementById('quality-menu');
    if (qm && !qm.classList.contains('hidden')) {
      qm.classList.add('hidden');
      return;
    }

    // اگر در صفحه اصلی هستیم، برو خانه
    if (historyStack.length > 1) {
      historyStack.pop(); // حذف صفحه فعلی
      var prev = historyStack[historyStack.length - 1];
      currentRoute = null; // اجبار رندر
      navigate(prev.route, prev.opts);
      return;
    }

    // اگر خانه هستیم و دکمه back → خروج یا هیچ
    if (currentRoute === 'home' || currentRoute === null) {
      // در تلویزیون معمولاً کاری نمی‌کنیم
      return;
    }

    navigate('home');
  }

  // ---------- راه‌اندازی ----------
  function init() {
    buildNav();
    FOCUS.enable();

    // حذف صفحه بارگذاری
    setTimeout(function () {
      var splash = document.getElementById('splash');
      splash.classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
    }, 600);

    navigate('home');
  }

  window.PlutoApp = {
    init: init,
    navigate: navigate,
    onBack: onBack,
    onPlayerClosed: function () {
      // برگشت از پلیر → فوکوس دوباره
      setTimeout(function () {
        FOCUS.resetFocus(document.getElementById('main'));
      }, 100);
    }
  };

  // راه‌اندازی بعد از DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      window.PlutoPlayer.init();
      init();
    });
  } else {
    window.PlutoPlayer.init();
    init();
  }
})(window);
