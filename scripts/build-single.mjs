/**
 * یک فایل HTML تنها از خروجی build می‌سازد.
 *
 * همهٔ JS، CSS، فونت و آیکون داخل خود فایل جاسازی می‌شوند تا بشود فایل را
 * روی کامپیوتر مغازه گذاشت و با دابل‌کلیک باز کرد — بدون سرور، بدون
 * اینترنت و بدون هیچ نصبی.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DIST = 'dist';
const OUTPUT = join(DIST, 'planner.html');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('اول npm run build را اجرا کن.');
  process.exit(1);
}

let html = readFileSync(join(DIST, 'index.html'), 'utf8');

const readAsset = (src) => readFileSync(join(DIST, src.replace(/^\.\//, '')), 'utf8');
const readAssetBase64 = (src) => readFileSync(join(DIST, src.replace(/^\.\//, ''))).toString('base64');

/**
 * فونت‌های داخل CSS به data URI تبدیل می‌شوند.
 * مسیر فونت‌ها نسبت به خود فایل CSS نوشته شده، نه نسبت به ریشهٔ خروجی.
 */
function inlineFonts(css, cssDir) {
  let inlined = 0;
  let skipped = 0;
  const result = css.replace(/url\(([^)]+\.woff2?)\)/g, (match, rawUrl) => {
    const url = rawUrl.replace(/['"]/g, '').trim();
    // نسخهٔ woff را کنار می‌گذاریم؛ مرورگرهای امروزی woff2 را می‌خوانند
    if (url.endsWith('.woff')) {
      skipped += 1;
      return 'url()';
    }
    try {
      const base64 = readAssetBase64(join(cssDir, url.replace(/^\.\//, '')));
      inlined += 1;
      return `url(data:font/woff2;charset=utf-8;base64,${base64})`;
    } catch (error) {
      console.warn(`  ! فونت پیدا نشد: ${url}`);
      return match;
    }
  });
  console.log(`  ${inlined} فونت جاسازی شد (${skipped} نسخهٔ woff کنار گذاشته شد)`);
  return result;
}

// ۱) CSS
html = html.replace(
  /<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
  (_match, href) => {
    const cssDir = dirname(href.replace(/^\.\//, ''));
    return `<style>\n${inlineFonts(readAsset(href), cssDir)}\n</style>`;
  },
);

// ۲) JavaScript
html = html.replace(
  /<script[^>]*src="([^"]+)"[^>]*><\/script>/g,
  (_match, src) => {
    const code = readAsset(src);
    console.log(`  ${Math.round(code.length / 1024)} کیلوبایت جاوااسکریپت جاسازی شد`);
    // بستن تگ داخل رشته‌های کد، تگ script را زودتر می‌بندد
    return `<script type="module">\n${code.replace(/<\/script>/g, '<\\/script>')}\n</script>`;
  },
);

// ۳) آیکون به‌صورت data URI و حذف ارجاع‌های بیرونی
const iconSvg = readAsset('icon.svg');
const iconData = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`;
html = html
  .replace(/<link[^>]+rel="manifest"[^>]*>\s*/g, '')
  .replace(/<link[^>]+rel="apple-touch-icon"[^>]*>\s*/g, '')
  .replace(/<link[^>]+rel="icon"[^>]*>\s*/g, '')
  .replace('<title>', `<link rel="icon" href="${iconData}" />\n    <title>`);

writeFileSync(OUTPUT, html);

const size = Math.round(Buffer.byteLength(html) / 1024);
console.log(`\n✓ ${OUTPUT} ساخته شد (${size} کیلوبایت، تک‌فایل و کاملاً آفلاین)`);
