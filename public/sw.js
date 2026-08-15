/**
 * Service Worker پلنر فروشگاه.
 *
 * هدف: بعد از اولین باز کردن، برنامه بدون اینترنت هم اجرا شود.
 *
 * نام فایل‌های ساخته‌شده (assets) هنگام build هش می‌گیرند و از قبل معلوم
 * نیستند، پس به‌جای فهرست ثابت، هر چیزی که یک‌بار با موفقیت دانلود شد در
 * حافظه نگه داشته می‌شود. چون نام این فایل‌ها با هر تغییر عوض می‌شود،
 * نگه داشتن همیشگی‌شان امن است.
 *
 * صفحهٔ اصلی برعکس، اول از شبکه خوانده می‌شود تا نسخهٔ جدید برنامه به دست
 * کاربر برسد، و فقط وقتی شبکه نباشد از حافظه برداشته می‌شود.
 */

const CACHE = 'wabko-planer-__BUILD_VERSION__';
const SHELL = './';

/** این فهرست هنگام build توسط افزونهٔ vite پر می‌شود */
const PRECACHE = __PRECACHE_LIST__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // باز کردن خود برنامه: اول شبکه، بعد حافظه
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  // بقیهٔ فایل‌ها: اول حافظه، و اگر نبود از شبکه بگیر و ذخیره کن
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
