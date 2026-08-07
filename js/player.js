/* ============================================================
   Pluto TV — پخش‌کننده ویدیو (player.js)
   - پشتیبانی از فرمت‌های قابل پخش در Tizen (mp4 / webm / m3u8)
   - انتخاب کیفیت
   - کنترل‌های ریموت: پخش/توقف، جلو/عقب ۱۰ ثانیه
   - نمایش پیام‌های خطا برای فرمت‌های غیرقابل پخش (mkv و…)
   ============================================================ */
(function (window) {
  'use strict';

  var CFG = window.PlutoConfig;
  var video = null;
  var overlay = null;
  var ui = null;
  var qualityMenu = null;
  var currentSources = [];
  var currentSourceIndex = 0;
  var currentItem = null;
  var hideTimer = null;
  var uiVisible = true;
  var isLive = false;

  var QUALITY_RANK = { '1080': 5, '720': 4, '480': 3, '360': 2, 'تیزر': 1, 'پیش‌نمایش': 1 };
  function qualityRank(q) {
    for (var k in QUALITY_RANK) {
      if (q.indexOf(k) !== -1) { return QUALITY_RANK[k]; }
    }
    return 0;
  }

  // فرمت قابل پخش در مرورگر Tizen؟
  function isPlayableType(url, type) {
    var t = (type || '').toLowerCase();
    var u = (url || '').toLowerCase();
    if (t === 'mp4' || t === 'webm' || t === 'ogg' || t === 'm3u8') { return true; }
    if (u.indexOf('.mp4') !== -1 || u.indexOf('.webm') !== -1 || u.indexOf('.m3u8') !== -1) { return true; }
    if (t === 'mkv' || u.indexOf('.mkv') !== -1) { return false; }
    return true; // ناشناخته → تلاش می‌کنیم
  }

  function init() {
    video = document.getElementById('video');
    overlay = document.getElementById('player-overlay');
    ui = document.getElementById('player-ui');
    qualityMenu = document.getElementById('quality-menu');

    // رویدادهای ویدیو
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('progress', updateBuffer);
    video.addEventListener('play', function () { setPlayIcon(true); });
    video.addEventListener('pause', function () { setPlayIcon(false); });
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onVideoError);

    // کلیک روی ویدیو → نمایش/مخفی کردن کنترل‌ها
    video.addEventListener('click', toggleUI);
    ui.addEventListener('click', function () { showUI(); });

    // کنترل‌ها
    document.getElementById('btn-playpause').addEventListener('click', togglePlay);
    document.getElementById('btn-rewind').addEventListener('click', function () { seekBy(-10); });
    document.getElementById('btn-fwd').addEventListener('click', function () { seekBy(10); });
    document.getElementById('btn-back-player').addEventListener('click', close);

    document.querySelectorAll('[data-action="fullscreen"]').forEach(function (b) {
      b.addEventListener('click', toggleFullscreen);
    });
    document.querySelectorAll('[data-action="download"]').forEach(function (b) {
      b.addEventListener('click', downloadCurrent);
    });
    document.getElementById('btn-quality').addEventListener('click', toggleQualityMenu);

    // تایم‌بار: کلیک → سک به موقعیت
    var tb = document.getElementById('player-timebar');
    tb.addEventListener('click', function (e) {
      var r = tb.getBoundingClientRect();
      var ratio = (e.clientX - r.left) / r.width;
      if (!isLive && video.duration) {
        video.currentTime = ratio * video.duration;
      }
    });

    // کلیدهای ریموت هنگام پخش
    document.addEventListener('keydown', onPlayerKey, true);
  }

  function setPlayIcon(playing) {
    var b = document.getElementById('btn-playpause');
    if (b) { b.textContent = playing ? '⏸' : '▶'; }
  }

  function showUI() {
    uiVisible = true;
    ui.classList.remove('faded');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (uiVisible && !video.paused && !qualityMenuVisible()) {
        ui.classList.add('faded');
        uiVisible = false;
      }
    }, 4000);
  }

  function toggleUI() {
    if (uiVisible) { ui.classList.add('faded'); uiVisible = false; }
    else { showUI(); }
  }

  function qualityMenuVisible() {
    return qualityMenu && !qualityMenu.classList.contains('hidden');
  }

  function updateTime() {
    var cur = document.getElementById('player-time');
    if (!cur) { return; }
    if (isLive) {
      cur.textContent = 'زنده';
      return;
    }
    var t = video.currentTime || 0;
    var d = video.duration || 0;
    cur.textContent = fmt(t) + ' / ' + fmt(d);

    var prog = document.getElementById('player-progress');
    var handle = document.getElementById('player-handle');
    if (prog && d > 0) {
      var pct = (t / d) * 100;
      prog.style.width = pct + '%';
      // RTL: هندل از راست
      handle.style.right = 'calc(' + pct + '% - 12px)';
    }
  }

  function updateBuffer() {
    var buf = document.getElementById('player-buffer');
    if (!buf || !video.duration) { return; }
    try {
      if (video.buffered && video.buffered.length > 0) {
        var end = video.buffered.end(video.buffered.length - 1);
        var pct = (end / video.duration) * 100;
        buf.style.width = pct + '%';
      }
    } catch (e) { /* ignore */ }
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) { sec = 0; }
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = Math.floor(sec % 60);
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return (h > 0 ? pad(h) + ':' : '') + pad(m) + ':' + pad(s);
  }

  function seekBy(sec) {
    if (isLive) { return; }
    video.currentTime = Math.max(0, Math.min((video.currentTime || 0) + sec, video.duration || 0));
    showUI();
  }

  function togglePlay() {
    if (video.paused) { video.play(); }
    else { video.pause(); }
    showUI();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) { document.exitFullscreen(); }
      else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
    } else {
      var el = document.documentElement;
      if (el.requestFullscreen) { el.requestFullscreen(); }
      else if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); }
    }
  }

  // -------- انتخاب کیفیت --------
  function sortSources(sources) {
    var arr = sources.slice();
    arr.sort(function (a, b) {
      // اول قابل پخش (mp4/webm) بعد بقیه
      var pa = isPlayableType(a.url, a.type) ? 1 : 0;
      var pb = isPlayableType(b.url, b.type) ? 1 : 0;
      if (pa !== pb) { return pb - pa; }
      return qualityRank(b.quality) - qualityRank(a.quality);
    });
    return arr;
  }

  function open(item, sources, title) {
    currentItem = item;
    currentSources = sortSources(sources || []);
    currentSourceIndex = 0;

    document.getElementById('player-title').textContent = title || '';
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    loadSource(0);
    showUI();
    // فوکوس به پخش/توقف
    window.PlutoFocus && window.PlutoFocus.setFocus(document.getElementById('btn-playpause'));
  }

  function loadSource(index) {
    if (!currentSources || currentSources.length === 0) {
      showMessage('سورسی برای پخش یافت نشد');
      return;
    }
    if (index < 0 || index >= currentSources.length) { return; }
    currentSourceIndex = index;
    triedHttpsFallback = false;
    var src = currentSources[index];
    var url = CFG.secureSourceUrl ? CFG.secureSourceUrl(src.url) : src.url;

    isLive = (url.toLowerCase().indexOf('.m3u8') !== -1) || (src.type === 'm3u8');
    hideMessage();

    video.src = url;
    video.load();

    var playPromise = video.play();
    if (playPromise && playPromise['catch']) {
      playPromise['catch'](function () {
        // تلاش برای پخش ادامه می‌یابد (نیاز به تعامل کاربر در بعضی مرورگرها)
      });
    }

    buildQualityMenu();
  }

  function buildQualityMenu() {
    qualityMenu.innerHTML = '';
    var title = document.createElement('div');
    title.style.cssText = 'padding:10px 16px;font-size:16px;color:#9a9ab0;font-weight:700;text-align:right;';
    title.textContent = 'انتخاب کیفیت / سورس';
    qualityMenu.appendChild(title);

    currentSources.forEach(function (src, i) {
      var item = document.createElement('button');
      item.className = 'q-item focusable';
      if (i === currentSourceIndex) { item.classList.add('active'); }
      var playable = isPlayableType(src.url, src.type);
      item.textContent = (src.quality || 'نامشخص') + ' — ' + (src.type || '؟') + (playable ? '' : ' (ممکن است پخش نشود)');
      item.addEventListener('click', function () {
        loadSource(i);
        hideQualityMenu();
        showUI();
      });
      qualityMenu.appendChild(item);
    });
  }

  function toggleQualityMenu() {
    if (qualityMenuVisible()) { hideQualityMenu(); }
    else {
      qualityMenu.classList.remove('hidden');
      showUI();
      // فوکوس به اولین آیتم
      var first = qualityMenu.querySelector('.q-item');
      if (first) { window.PlutoFocus.setFocus(first); }
    }
  }

  function hideQualityMenu() {
    qualityMenu.classList.add('hidden');
    window.PlutoFocus.setFocus(document.getElementById('btn-quality'));
  }

  function showMessage(msg) {
    var el = document.getElementById('player-msg');
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function hideMessage() {
    document.getElementById('player-msg').classList.add('hidden');
  }

  function onEnded() {
    setPlayIcon(false);
    showUI();
  }

  var triedHttpsFallback = false;

  function onVideoError() {
    var src = currentSources[currentSourceIndex];
    var label = src ? (src.quality + ' ' + (src.type || '')) : '';

    // اگر URL اصلی http بود و https جواب نداد، برگرد به http (آخرین راه)
    if (src && !triedHttpsFallback && src.url && src.url.indexOf('http://') === 0) {
      triedHttpsFallback = true;
      video.src = src.url; // http اصلی
      video.load();
      var p = video.play();
      if (p && p['catch']) { p['catch'](function () {}); }
      showMessage('اتصال امن برقرار نشد؛ تلاش با لینک مستقیم…');
      return;
    }

    showMessage('پخش این فرمت (' + label + ') در مرورگر تلویزیون ممکن نیست. کیفیت دیگری را انتخاب کنید یا دانلود کنید.');
    showUI();
  }

  function downloadCurrent() {
    var src = currentSources[currentSourceIndex];
    if (!src) { return; }
    var url = CFG.secureSourceUrl ? CFG.secureSourceUrl(src.url) : src.url;
    // باز کردن مستقیم لینک (دانلود در مرورگر تلویزیون)
    window.open(url, '_blank');
  }

  function close() {
    try { video.pause(); } catch (e) {}
    video.removeAttribute('src');
    video.load();
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    qualityMenu.classList.add('hidden');
    window.PlutoApp && window.PlutoApp.onPlayerClosed && window.PlutoApp.onPlayerClosed();
  }

  // کلیدهای ریموت در حالت پخش
  function onPlayerKey(e) {
    if (overlay.classList.contains('hidden')) { return; }
    var k = e.keyCode || e.which;

    // اگر منوی کیفیت باز است، ناوبری عادی (فوکوس) کار کند
    if (qualityMenuVisible()) {
      return; // اجازه به سیستم فوکوس
    }

    switch (k) {
      case 415: // play
      case 19:  // pause
      case 10252:
      case 13:
        if (k === 13) {
          var tag = (e.target && e.target.tagName) || '';
          if (tag === 'BUTTON') { return; } // دکمه‌ها خودشان هندل می‌شوند
          togglePlay();
        } else {
          togglePlay();
        }
        e.preventDefault();
        break;
      case 412: // rewind
        seekBy(-10);
        e.preventDefault();
        break;
      case 417: // fast forward
        seekBy(10);
        e.preventDefault();
        break;
      case 10009: // back
      case 27:
      case 8:
        if (qualityMenuVisible()) { hideQualityMenu(); }
        else { close(); }
        e.preventDefault();
        e.stopImmediatePropagation();
        break;
    }
  }

  window.PlutoPlayer = {
    init: init,
    open: open,
    close: close,
    isOpen: function () { return overlay && !overlay.classList.contains('hidden'); }
  };
})(window);
