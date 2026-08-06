/* =============================================
   Pluto TV — Settings Page
   ============================================= */

const PageSettings = (() => {

  function render(container, state) {
    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1 class="page-title">تنظیمات</h1>
      <p class="page-subtitle">پیکربندی برنامه</p>
    `;
    container.appendChild(header);

    const list = document.createElement('div');
    list.className = 'settings-list';
    const settings = Storage.getSettings();

    // Autoplay toggle
    list.appendChild(createToggleItem(
      'پخش خودکار',
      'آغاز خودکار پخش پس از انتخاب',
      settings.autoplay,
      (on) => Storage.updateSetting('autoplay', on)
    ));

    // Volume
    list.appendChild(createSliderItem(
      'حجم صدا',
      `${Math.round(settings.volume * 100)}٪`,
      settings.volume,
      0, 1, 0.1,
      (val) => {
        Storage.updateSetting('volume', val);
        const label = document.querySelector('[data-setting="volume"] .setting-value');
        if (label) label.textContent = `${Math.round(val * 100)}٪`;
      }
    ));

    // Clear cache
    list.appendChild(createButtonItem(
      'پاک کردن کش',
      'حذف داده‌های موقت برای بارگذاری مجدد',
      () => {
        API.clearCache();
        Toast.show('کش پاک شد');
      }
    ));

    // Clear favorites
    list.appendChild(createButtonItem(
      'پاک کردن علاقه‌مندی‌ها',
      'حذف تمام محتوای ذخیره‌شده',
      () => {
        if (confirm('همه علاقه‌مندی‌ها پاک شوند؟')) {
          Storage.clearFavorites();
          Toast.show('علاقه‌مندی‌ها پاک شد');
        }
      }
    ));

    // About
    list.appendChild(createInfoItem(
      'درباره Pluto TV',
      `نسخه ${CONFIG.VERSION} — بر پایه CCloud`
    ));

    container.appendChild(list);
  }

  function createToggleItem(label, desc, isOn, onChange) {
    const div = document.createElement('div');
    div.className = 'setting-item';
    div.setAttribute('tabindex', '0');
    div.innerHTML = `
      <div>
        <div class="setting-label">${label}</div>
        <div style="color:var(--text-muted); font-size:0.9rem; margin-top:4px;">${desc}</div>
      </div>
      <div class="toggle ${isOn ? 'on' : ''}"></div>
    `;
    div.addEventListener('click', () => {
      const toggle = div.querySelector('.toggle');
      const newOn = !toggle.classList.contains('on');
      toggle.classList.toggle('on', newOn);
      onChange(newOn);
    });
    return div;
  }

  function createSliderItem(label, displayValue, value, min, max, step, onChange) {
    const div = document.createElement('div');
    div.className = 'setting-item';
    div.setAttribute('data-setting', label.includes('صدا') ? 'volume' : '');
    div.setAttribute('tabindex', '0');
    div.innerHTML = `
      <div>
        <div class="setting-label">${label}</div>
      </div>
      <div class="setting-value">${displayValue}</div>
    `;
    // Simplified: just increment/decrement on click
    div.addEventListener('click', () => {
      let newVal = value + step;
      if (newVal > max) newVal = min;
      value = newVal;
      onChange(newVal);
    });
    return div;
  }

  function createButtonItem(label, desc, onClick) {
    const div = document.createElement('div');
    div.className = 'setting-item';
    div.setAttribute('tabindex', '0');
    div.innerHTML = `
      <div>
        <div class="setting-label">${label}</div>
        <div style="color:var(--text-muted); font-size:0.9rem; margin-top:4px;">${desc}</div>
      </div>
      <div class="setting-value">›</div>
    `;
    div.addEventListener('click', onClick);
    return div;
  }

  function createInfoItem(label, desc) {
    const div = document.createElement('div');
    div.className = 'setting-item';
    div.innerHTML = `
      <div>
        <div class="setting-label">${label}</div>
        <div style="color:var(--text-muted); font-size:0.9rem; margin-top:4px;">${desc}</div>
      </div>
    `;
    return div;
  }

  return { render };
})();
