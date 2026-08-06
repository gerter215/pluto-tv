# 📺 Pluto TV

اپلیکیشن وب استریم فیلم و سریال — **بهینه‌شده برای تلویزیون‌های هوشمند سامسونگ (Tizen)**

ساخته‌شده بر پایه منبع [CCloud](https://github.com/code3-dev/CCloud) — رایگان و بدون تبلیغ.

## ✨ امکانات

- 🎬 مرور فیلم‌ها و سریال‌ها از API سرور CCloud
- 📺 رابط کاربری بهینه برای تلویزیون (ریموت‌کنترل: کلیدهای جهت‌نما + Enter + Back)
- ▶️ پخش ویدیو با Video.js (پشتیبانی MP4 + HLS)
- 🔍 جستجوی فیلم و سریال
- ⭐ فیلتر بر اساس IMDb، سال، جدیدترین
- ❤️ علاقه‌مندی‌ها (ذخیره در حافظه تلویزیون)
- 📡 سرورهای جایگزین (Fallback) در صورت قطعی
- 📱 PWA — قابل نصب و استفاده آفلاین (بعد از بارگذاری اولیه)

## 🚀 دیپلوی رایگان

این پروژه **بدون نیاز به سرور** است — فقط فایل‌های استاتیک است. هر کدام از این‌ها را انتخاب کنید:

### گزینه ۱: GitHub Pages (ساده‌ترین)

1. یک مخزن جدید در GitHub بسازید (مثلاً `pluto-tv`)
2. محتوای این پروژه را آپلود کنید:
   ```bash
   git init
   git add .
   git commit -m "Pluto TV"
   git branch -M main
   git remote add origin https://github.com/<username>/pluto-tv.git
   git push -u origin main
   ```
3. در GitHub → Settings → Pages:
   - Source: `Deploy from a branch`
   - Branch: `main` / `root`
4. بعد از چند دقیقه، سایت روی:
   `https://<username>.github.io/pluto-tv/` در دسترس است

### گزینه ۲: Vercel (سریع‌تر)

```bash
npm i -g vercel
cd pluto-tv
vercel --prod
```

یا بدون نصب — فقط پروژه را به [vercel.com/new](https://vercel.com/new) آپلود کنید (Import از GitHub).

### گزینه ۳: Netlify

- درگ‌انداز پوشه پروژه به [app.netlify.com/drop](https://app.netlify.com/drop)

---

## 🖥️ استفاده روی تلویزیون سامسونگ

1. مرورگر وب تلویزیون را باز کنید (Internet)
2. آدرس سایت دیپلوی‌شده را وارد کنید
3. اگر مرورگر سامسونگ گزینه «Add to Home Screen» دارد، اضافه کنید تا مثل یک اپ اجرا شود

### کنترل با ریموت:
| دکمه | عملکرد |
|------|--------|
| ⬆️⬇️ | حرکت بین ردیف‌ها |
| ⬅️➡️ | حرکت بین کارت‌ها |
| ✅ Enter/OK | انتخاب / پخش |
| 🔙 Back | بازگشت / بستن پخش |

> 💡 اگر تلویزیون سامسونگ شما از [TV KeyCode](https://developer.samsung.com/smarttv/develop/guides/fundamentals/input-device.html) خاصی استفاده می‌کند، فایل `js/remote.js` را ویرایش کنید.

## 🛠️ توسعه

### ساختار پروژه

```
pluto-tv/
├── index.html          ← صفحه اصلی
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker
├── css/
│   └── style.css       ← استایل‌ها
├── js/
│   ├── config.js       ← تنظیمات (API key و سرورها)
│   ├── api.js          ← ارتباط با API
│   ├── storage.js      ← علاقه‌مندی‌ها + تنظیمات
│   ├── player.js       ← پخش‌کننده ویدیو
│   ├── router.js       ← ناوبری
│   ├── remote.js       ← کنترل با ریموت
│   ├── app.js          ← نقطه شروع
│   └── pages/          ← صفحات برنامه
└── assets/
    └── icons/          ← آیکون‌های PWA
```

### اجرای محلی

```bash
cd pluto-tv
python3 -m http.server 8899
# → http://localhost:8899
```

### تغییر سرور API

فایل `js/config.js` را ویرایش کنید:

```js
API: {
  PRIMARY_SERVER: 'https://server-hi-speed-iran.info',
  HELPER_SERVERS: ['https://hostinnegar.com', 'https://windowsdiba.info'],
  API_KEY: '4F5A9C3D9A86FA54EACEDDD635185',
}
```

## ⚠️ نکته درباره پخش

- فرمت‌های **MP4** در همه مرورگرها (از جمله Tizen) پخش می‌شوند
- فرمت **MKV** روی برخی تلویزیون‌های سامسونگ پشتیبانی نمی‌شود — اگر پخش کار نکرد، کیفیت دیگری انتخاب کنید
- منبع این برنامه سرور عمومی CCloud است؛ اگر کند یا قطع بود، از سرورهای جایگزین استفاده می‌شود

## 📄 لایسنس

بر پایه [CCloud](https://github.com/code3-dev/CCloud) ساخته شده است.
