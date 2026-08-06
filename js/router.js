/* =============================================
   Pluto TV — Router & Toast
   ============================================= */

const Toast = (() => {
  let timer = null;
  function show(msg, duration = 3000) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.classList.add('hidden'), 300);
    }, duration);
  }
  return { show };
})();

const Router = (() => {
  let currentRoute = 'home';
  let pageState = {};

  function navigate(route, state = {}) {
    if (currentRoute === route && Object.keys(state).length === 0) return;

    currentRoute = route;
    pageState = state;

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });

    const main = document.getElementById('main');

    // Fade out, render, fade in
    main.style.opacity = '0';
    main.style.transition = 'opacity 0.2s';

    setTimeout(() => {
      main.scrollTop = 0;
      main.innerHTML = '';

      switch (route) {
        case 'home':      PageHome.render(main, state); break;
        case 'movies':    PageMovies.render(main, state); break;
        case 'series':    PageSeries.render(main, state); break;
        case 'search':    PageSearch.render(main, state); break;
        case 'favorites': PageFavorites.render(main, state); break;
        case 'settings':  PageSettings.render(main, state); break;
        default:
          main.innerHTML = '<div class="empty-state"><p>صفحه یافت نشد</p></div>';
      }

      main.style.opacity = '1';
      // Focus management after render
      setTimeout(() => {
        const firstFocusable = main.querySelector('[data-focus], .poster-card, .nav-item');
        if (firstFocusable) firstFocusable.focus();
      }, 100);
    }, 200);
  }

  function getCurrentRoute() { return currentRoute; }
  function getState() { return pageState; }

  return { navigate, getCurrentRoute, getState };
})();
