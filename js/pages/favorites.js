/* =============================================
   Pluto TV — Favorites Page
   ============================================= */

const PageFavorites = (() => {

  function render(container, state) {
    UI.showLoading();

    const header = document.createElement('div');
    header.className = 'page-header';
    header.innerHTML = `
      <h1 class="page-title">علاقه‌مندی‌ها</h1>
      <p class="page-subtitle">محتوای ذخیره‌شده شما</p>
    `;
    container.appendChild(header);

    const favs = Storage.getFavorites();

    if (favs.length === 0) {
      container.appendChild(UI.createEmptyState('هنوز چیزی به علاقه‌مندی‌ها اضافه نکرده‌اید'));
      UI.hideLoading();
      return;
    }

    // Clear all button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'detail-btn detail-btn-fav';
    clearBtn.style.marginBottom = '1.5rem';
    clearBtn.style.marginRight = '2.5rem';
    clearBtn.textContent = '🗑 پاک کردن همه';
    clearBtn.setAttribute('tabindex', '0');
    clearBtn.addEventListener('click', () => {
      if (confirm('همه علاقه‌مندی‌ها پاک شوند؟')) {
        Storage.clearFavorites();
        Router.navigate('favorites');
        Toast.show('علاقه‌مندی‌ها پاک شد');
      }
    });
    container.appendChild(clearBtn);

    const grid = UI.createContentGrid(favs, (item) => {
      if (item.type === 'serie') {
        Detail.openSeries(item);
      } else {
        Detail.openMovie(item);
      }
    });
    container.appendChild(grid);

    UI.hideLoading();
  }

  return { render };
})();
