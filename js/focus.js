/* ============================================================
   Pluto TV — سیستم فوکوس و ناوبری ریموت (focus.js)
   - پیمایش D-pad بین عناصر .focusable
   - کلیدهای تلویزیون سامسونگ: جهت‌ها، OK (Enter)، بازگشت
   - حالت فوکوس اسکرول خودکار
   ============================================================ */
(function (window) {
  'use strict';

  var currentFocused = null;
  var enabled = false;
  var lastScrollTarget = null;

  // کلیدهای ریموت سامسونگ Tizen
  var KEY = {
    UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39,
    ENTER: 13,
    BACK: 10009,      // کلید بازگشت سامسونگ
    ESC: 27,
    BACKSPACE: 8,
    PLAY: 415, PAUSE: 19, STOP: 413,
    REWIND: 412, FF: 417,
    INFO: 457, MENU: 458,
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406,
    CH_UP: 427, CH_DOWN: 428,
    VOL_UP: 447, VOL_DOWN: 448,
    MUTE: 449
  };

  function isFocusable(el) {
    return el && el.classList && el.classList.contains('focusable') &&
           !el.classList.contains('hidden') && el.offsetParent !== null;
  }

  function getAllFocusables(container) {
    container = container || document;
    var all = container.querySelectorAll('.focusable');
    var list = [];
    for (var i = 0; i < all.length; i++) {
      if (isFocusable(all[i])) { list.push(all[i]); }
    }
    return list;
  }

  function getRect(el) {
    var r = el.getBoundingClientRect();
    return {
      left: r.left, top: r.top,
      right: r.right, bottom: r.bottom,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      w: r.width, h: r.height
    };
  }

  // پیدا کردن بهترین کاندید در جهت مشخص
  function findBestCandidate(elements, from, dir) {
    var fr = getRect(from);
    var best = null, bestScore = Infinity;

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el === from) { continue; }
      var r = getRect(el);

      // فاصله مرکز به مرکز
      var dx = r.cx - fr.cx;
      var dy = r.cy - fr.cy;

      var overlap, dist, score;

      if (dir === 'left') {
        if (dx >= 0) { continue; }
        overlap = Math.min(r.bottom, fr.bottom) - Math.max(r.top, fr.top);
        dist = Math.abs(dx);
        if (overlap < 0) { dist += Math.abs(overlap) * 3; }
        score = dist + (overlap < 10 ? 200 : 0);
      } else if (dir === 'right') {
        if (dx <= 0) { continue; }
        overlap = Math.min(r.bottom, fr.bottom) - Math.max(r.top, fr.top);
        dist = Math.abs(dx);
        if (overlap < 0) { dist += Math.abs(overlap) * 3; }
        score = dist + (overlap < 10 ? 200 : 0);
      } else if (dir === 'up') {
        if (dy >= 0) { continue; }
        overlap = Math.min(r.right, fr.right) - Math.max(r.left, fr.left);
        dist = Math.abs(dy);
        if (overlap < 0) { dist += Math.abs(overlap) * 3; }
        score = dist + (overlap < 10 ? 200 : 0);
      } else { // down
        if (dy <= 0) { continue; }
        overlap = Math.min(r.right, fr.right) - Math.max(r.left, fr.left);
        dist = Math.abs(dy);
        if (overlap < 0) { dist += Math.abs(overlap) * 3; }
        score = dist + (overlap < 10 ? 200 : 0);
      }

      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  function scrollIntoView(el) {
    if (el.scrollIntoViewIfNeeded) {
      try { el.scrollIntoViewIfNeeded(true); } catch (e) { el.scrollIntoView(true); }
    } else {
      el.scrollIntoView(true);
    }
  }

  function setFocus(el, opts) {
    opts = opts || {};
    if (!el) { return; }
    if (currentFocused && currentFocused.classList) {
      currentFocused.classList.remove('focused');
    }
    currentFocused = el;
    el.classList.add('focused');
    if (opts.scroll !== false) {
      scrollIntoView(el);
    }
  }

  function getFocused() { return currentFocused; }

  function focusFirst(container) {
    var list = getAllFocusables(container);
    if (list.length > 0) {
      setFocus(list[0], { scroll: false });
      // اسکرول به عنصر اول فقط اگر خارج دید باشد
      scrollIntoView(list[0]);
      return list[0];
    }
    return null;
  }

  // -------- مدیریت کلیدها --------
  function move(dir) {
    if (!currentFocused) {
      focusFirst(document.getElementById('main'));
      return;
    }
    var container = currentFocused.closest('#main') || document;
    var list = getAllFocusables(container);
    var best = findBestCandidate(list, currentFocused, dir);
    if (best) {
      setFocus(best);
      // اسکرول افقی برای کارت‌ها
      var scroller = best.closest('.hscroll');
      if (scroller && dir === 'left' || scroller && dir === 'right') {
        var rect = best.getBoundingClientRect();
        var srect = scroller.getBoundingClientRect();
        if (dir === 'right' && rect.right > srect.right - 20) {
          scroller.scrollLeft += rect.right - srect.right + 60;
        } else if (dir === 'left' && rect.left < srect.left + 20) {
          scroller.scrollLeft -= srect.left - rect.left + 60;
        }
      }
    }
  }

  function activate() {
    if (!currentFocused) { return; }
    // اجرای کلیک روی عنصر
    if (typeof currentFocused.click === 'function') {
      currentFocused.click();
    }
  }

  function onKeyDown(e) {
    if (!enabled) { return; }

    var k = e.keyCode || e.which;
    var handled = true;

    switch (k) {
      case KEY.UP:    move('up'); break;
      case KEY.DOWN:  move('down'); break;
      case KEY.LEFT:  move('left'); break;
      case KEY.RIGHT: move('right'); break;
      case KEY.ENTER: activate(); break;
      case KEY.BACK:
      case KEY.ESC:
      case KEY.BACKSPACE:
        window.PlutoApp && window.PlutoApp.onBack && window.PlutoApp.onBack();
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // فوکوس اولیه وقتی صفحه عوض می‌شود
  function resetFocus(container) {
    currentFocused = null;
    if (container) {
      focusFirst(container);
    }
  }

  function enable() {
    if (enabled) { return; }
    enabled = true;
    document.addEventListener('keydown', onKeyDown, true);
  }

  function disable() {
    enabled = false;
    document.removeEventListener('keydown', onKeyDown, true);
    if (currentFocused && currentFocused.classList) {
      currentFocused.classList.remove('focused');
    }
    currentFocused = null;
  }

  window.PlutoFocus = {
    enable: enable,
    disable: disable,
    setFocus: setFocus,
    resetFocus: resetFocus,
    getFocused: getFocused,
    getAllFocusables: getAllFocusables,
    move: move,
    activate: activate,
    KEY: KEY
  };
})(window);
