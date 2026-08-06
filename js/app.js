/* =============================================
   Pluto TV — Main App
   ============================================= */

(function() {

  function init() {
    console.log('[Pluto TV] Initializing...');

    // Init remote control
    Remote.init();

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const route = item.dataset.route;
        if (route) Router.navigate(route);
      });
    });

    // Player back button
    const playerBack = document.getElementById('player-back');
    if (playerBack) {
      playerBack.addEventListener('click', () => Player.close());
    }

    // Hide splash & show app
    setTimeout(() => {
      const splash = document.getElementById('splash');
      const app = document.getElementById('app');
      if (splash) splash.style.opacity = '0'
      if (app) app.classList.remove('hidden');
      setTimeout(() => {
        if (splash) splash.remove();
      }, 600);

      // Load home
      Router.navigate('home');
    }, 1500);

    // Register service worker (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('[SW] registered'))
        .catch(err => console.warn('[SW] failed:', err));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle Tizen app exits
  window.addEventListener('keydown', (e) => {
    // Samsung Tizen "Exit" key
    if (e.key === '10252' || e.key === 'XF86Exit') {
        window.tizen && window.tizen.application.getCurrentApplication().exit();
    }
  });

  // Prevent context menu (long press on TV)
  document.addEventListener('contextmenu', (e) => e.preventDefault());

})();
