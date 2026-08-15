import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** همهٔ فایل‌های داخل یک پوشه، به‌صورت بازگشتی */
function walk(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full, base) : [relative(base, full)];
  });
}

/**
 * فهرست فایل‌های ساخته‌شده را داخل Service Worker می‌نویسد.
 *
 * بدون این کار، در اولین بازدید فایل‌های JS و CSS پیش از فعال شدن
 * Service Worker دانلود می‌شوند و هرگز در حافظه نمی‌نشینند؛ نتیجه‌اش
 * صفحهٔ سفید در اولین اجرای آفلاین است.
 */
function precachePlugin(): Plugin {
  return {
    name: 'inject-precache-list',
    apply: 'build',
    closeBundle() {
      const dist = 'dist';
      const swPath = join(dist, 'sw.js');

      const files = walk(dist)
        .map((f) => f.split('\\').join('/'))
        .filter((f) => f !== 'sw.js')
        // نسخهٔ woff از قلم لازم نیست؛ همهٔ مرورگرهای امروزی woff2 را می‌خوانند
        .filter((f) => !f.endsWith('.woff'))
        .map((f) => `./${f}`);

      const list = ['./', ...files];
      // نسخهٔ حافظه از روی محتوای فهرست ساخته می‌شود تا هر build جدید،
      // حافظهٔ قدیمی را کنار بگذارد
      const version = Buffer.from(list.join('|')).toString('base64url').slice(-12);

      const source = readFileSync(swPath, 'utf8')
        .replace('__PRECACHE_LIST__', JSON.stringify(list, null, 2))
        .replace('__BUILD_VERSION__', version);

      writeFileSync(swPath, source);
      this.info(`فهرست پیش‌ذخیره با ${list.length} فایل در sw.js نوشته شد`);
    },
  };
}

export default defineConfig({
  plugins: [react(), precachePlugin()],
  // مسیر نسبی تا خروجی build روی هر هاستی (از جمله زیرپوشه) کار کند
  base: './',
  server: {
    host: true,
    port: 5173,
  },
});
