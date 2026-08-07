/* ============================================================
   Pluto TV — تنظیمات (config.js)
   تمام آدرس‌ها و کلیدها در یک جا
   ============================================================ */
(function (window) {
  'use strict';

  window.PlutoConfig = {
    // نام اپ
    appName: 'Pluto TV',

    // سرور اصلی API
    apiBase: 'https://server-hi-speed-iran.info',

    // سرورهای کمکی (در صورت خطای سرور اصلی)
    helperServers: [
      'https://hostinnegar.com',
      'https://windowsdiba.info'
    ],

    // کلید API
    apiKey: '4F5A9C3D9A86FA54EACEDDD635185',

    // تعداد آیتم در هر صفحه
    pageSize: 30,

    // فیلترهای مرتب‌سازی
    filters: {
      DEFAULT: 'created',
      BY_YEAR: 'year',
      BY_IMDB: 'imdb'
    }
  };

  // تشخیص مرورگر تلویزیون
  var ua = (window.navigator && window.navigator.userAgent) || '';
  window.PlutoConfig.isTizen = (ua.indexOf('Tizen') !== -1) || (window.tizen !== undefined);
  window.PlutoConfig.isSmartTV = window.PlutoConfig.isTizen || (ua.indexOf('SMART-TV') !== -1) || (ua.indexOf('SmartTV') !== -1);
})(window);
