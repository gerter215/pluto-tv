/* =============================================
   Pluto TV — Remote Control Navigation
   D-pad: Arrow keys, Enter, Back/Escape
   Optimized for Samsung Smart TV remote
   ============================================= */

const Remote = (() => {

  let keyHandlers = {};

  function init() {
    document.addEventListener('keydown', handleKey);
    document.addEventListener('keyup', (e) => {
      // Reset key state
    });
  }

  function handleKey(e) {
    const key = e.key || e.keyCode;

    // Map Samsung Tizen remote keys
    const keyMap = {
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'Enter': 'enter',
      'Escape': 'back',
      'Backspace': 'back',
      'ArrowLeft_37': 'left',
      'ArrowRight_39': 'right',
      'ArrowUp_38': 'up',
      'ArrowDown_40': 'down',
      'Enter_13': 'enter',
      'Escape_27': 'back',
      'Backspace_8': 'back'
    };

    const action = keyMap[key] || keyMap[`${key}_${e.keyCode}`];

    if (!action) return;

    // If player is open, let Video.js handle controls
    const playerOverlay = document.getElementById('player-overlay');
    if (playerOverlay && !playerOverlay.classList.contains('hidden')) {
      handlePlayerKeys(action, e);
      return;
    }

    // If detail modal is open
    const detailModal = document.getElementById('detail-modal');
    if (detailModal && !detailModal.classList.contains('hidden')) {
      handleDetailKeys(action, e);
      return;
    }

    // Normal navigation
    handleNavKeys(action, e);
  }

  function handleNavKeys(action, e) {
    switch (action) {
      case 'back':
        e.preventDefault();
        // If not on home, go home; else try to exit
        if (Router.getCurrentRoute() !== 'home') {
          Router.navigate('home');
        }
        break;

      case 'enter':
        // Let default focus/click happen
        break;

      case 'up':
      case 'down':
        e.preventDefault();
        moveFocus(action === 'up' ? -1 : 1, 'vertical');
        break;

      case 'left':
      case 'right':
        // In sidebar, left/right can also navigate
        const focused = document.activeElement;
        if (focused && focused.classList.contains('nav-item')) {
          if (action === 'right') {
            // Move into main content
            const main = document.getElementById('main');
            const first = main.querySelector('[data-focus], .poster-card');
            if (first) first.focus();
          }
        } else {
          moveFocus(action === 'left' ? -1 : 1, 'horizontal');
        }
        break;
    }
  }

  function moveFocus(direction, axis) {
    const focusables = getFocusables();
    if (focusables.length === 0) return;

    const current = document.activeElement;
    let currentIdx = -1;
    for (let i = 0; i < focusables.length; i++) {
      if (focusables[i] === current) { currentIdx = i; break; }
    }

    if (currentIdx === -1) {
      // No current focus, focus first element
      focusables[0].focus();
      return;
    }

    if (axis === 'horizontal') {
      // Navigate within same row
      moveHorizontal(focusables, currentIdx, direction);
    } else {
      // Navigate vertically (between rows)
      moveVertical(focusables, currentIdx, direction);
    }
  }

  function moveHorizontal(elements, currentIdx, direction) {
    const current = elements[currentIdx];
    const currentRect = current.getBoundingClientRect();

    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < elements.length; i++) {
      if (i === currentIdx) continue;
      const el = elements[i];
      const rect = el.getBoundingClientRect();

      // Must be roughly on same row (vertical overlap)
      const vOverlap = Math.min(currentRect.bottom, rect.bottom) - Math.max(currentRect.top, rect.top);
      if (vOverlap < currentRect.height * 0.3) continue;

      // Check direction
      if (direction > 0 && rect.left > currentRect.left + 5) {
        const dist = rect.left - currentRect.left;
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      } else if (direction < 0 && rect.right < currentRect.right - 5) {
        const dist = currentRect.right - rect.right;
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
    }

    if (bestIdx >= 0) {
      elements[bestIdx].focus();
      // Scroll into view
      scrollIntoView(elements[bestIdx]);
    }
  }

  function moveVertical(elements, currentIdx, direction) {
    const current = elements[currentIdx];
    const currentRect = current.getBoundingClientRect();

    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < elements.length; i++) {
      if (i === currentIdx) continue;
      const el = elements[i];
      const rect = el.getBoundingClientRect();

      // Must be on different row
      const vOverlap = Math.min(currentRect.bottom, rect.bottom) - Math.max(currentRect.top, rect.top);
      if (vOverlap > currentRect.height * 0.5) continue;

      // Check direction
      if (direction > 0 && rect.top > currentRect.bottom - 10) {
        const dist = rect.top - currentRect.bottom;
        const hDist = Math.abs(rect.left + rect.width / 2 - currentRect.left - currentRect.width / 2);
        const totalDist = dist + hDist * 0.3;
        if (totalDist < bestDist) { bestDist = totalDist; bestIdx = i; }
      } else if (direction < 0 && rect.bottom < currentRect.top + 10) {
        const dist = currentRect.top - rect.bottom;
        const hDist = Math.abs(rect.left + rect.width / 2 - currentRect.left - currentRect.width / 2);
        const totalDist = dist + hDist * 0.3;
        if (totalDist < bestDist) { bestDist = totalDist; bestIdx = i; }
      }
    }

    if (bestIdx >= 0) {
      elements[bestIdx].focus();
      scrollIntoView(elements[bestIdx]);
    } else {
      // Try sidebar
      if (direction < 0) {
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems.length > 0) {
          const active = document.querySelector('.nav-item.active') || navItems[0];
          if (active) active.focus();
        }
      }
    }
  }

  function scrollIntoView(el) {
    // Scroll main content
    const main = document.getElementById('main');
    const rect = el.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    if (rect.top < mainRect.top + 100) {
      main.scrollTop -= (mainRect.top + 100 - rect.top);
    } else if (rect.bottom > mainRect.bottom - 100) {
      main.scrollTop += (rect.bottom - mainRect.bottom + 100);
    }
  }

  function getFocusables() {
    const all = document.querySelectorAll(
      '.nav-item[data-focus], .nav-item, .poster-card, .quality-btn, .episode-card, .season-header, .filter-tab, .genre-chip, .hero-btn-play, .hero-btn-info, [data-focus], button, input, .setting-item'
    );
    return Array.from(all).filter(el => {
      if (el.classList.contains('hidden')) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  function handlePlayerKeys(action, e) {
    switch (action) {
      case 'back':
        e.preventDefault();
        Player.close();
        break;
    }
  }

  function handleDetailKeys(action, e) {
    switch (action) {
      case 'back':
        e.preventDefault();
        Detail.close();
        break;
      case 'up':
      case 'down':
        e.preventDefault();
        moveFocus(action === 'up' ? -1 : 1, 'vertical');
        break;
      case 'left':
      case 'right':
        e.preventDefault();
        moveFocus(action === 'left' ? -1 : 1, 'horizontal');
        break;
    }
  }

  return { init };
})();
