/**
 * عکس‌های واقعی محصول را داخل صفحهٔ طراحی جاگذاری می‌کند.
 *
 *   1. عکس‌ها را با این نام‌ها در design/photos بگذار (هر فرمتی: jpg, png, webp):
 *        redkey-w12 · fasdunt-hv1 · kochwerk-af90 · dassler-pro2400
 *   2. node scripts/embed-photos.mjs
 *
 * عکس به‌صورت data URI داخل design/wanko-home.html نوشته می‌شود تا صفحه
 * همچنان یک فایل مستقل بماند. اگر playwright نصب باشد، عکس‌های بزرگ اول با
 * کروم به webp حداکثر ۹۰۰ پیکسل فشرده می‌شوند؛ اگر نباشد، فایل همان‌طور که
 * هست جاگذاری می‌شود و هشدار حجم می‌گیری. دوباره اجرا کردنش مشکلی ندارد.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = join(ROOT, 'design', 'wanko-home.html');
const DIR = join(ROOT, 'design', 'photos');

const MAX_EDGE = 900;
const QUALITY = 0.82;
const READABLE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

if (!existsSync(DIR)) {
  console.error(`پوشهٔ ${DIR} نیست. بسازش و عکس‌ها را داخلش بگذار.`);
  process.exit(1);
}

const files = readdirSync(DIR).filter((f) => READABLE.has(extname(f).toLowerCase()));

if (!files.length) {
  console.log('هیچ عکسی در design/photos نیست — اگر عکسی قبلاً جاگذاری شده باشد، برداشته می‌شود.\n');
}

let html = readFileSync(PAGE, 'utf8');
const slots = [...html.matchAll(/data-photo="([^"]+)\.webp"/g)].map((m) => m[1]);

const BUDGET = 220 * 1024; // بالاتر از این، ارزش فشرده‌سازی دارد

/** کروم فقط وقتی لازم می‌شود که عکسی بزرگ‌تر از بودجه باشد */
async function openChromium() {
  for (const id of ['playwright', 'playwright-core']) {
    try {
      const { chromium } = await import(id);
      return await chromium.launch();
    } catch {}
  }
  return null;
}

const oversize = slots.some((slot) => {
  const f = files.find((x) => basename(x, extname(x)) === slot);
  return f && statSync(join(DIR, f)).size > BUDGET;
});

const browser = oversize ? await openChromium() : null;
const page = browser ? await browser.newPage() : null;

if (oversize && !browser) {
  console.log('⚠ playwright نصب نیست، پس عکس‌ها فشرده نمی‌شوند.');
  console.log('  یا `npm i -D playwright` بزن، یا خودت عکس‌ها را به webp با ضلع ۹۰۰ پیکسل کوچک کن.\n');
}

let done = 0;
let removed = 0;

for (const slot of slots) {
  const file = files.find((f) => basename(f, extname(f)) === slot);

  if (!file) {
    /* عکسی نیست: هر عکس قبلی را هم برمی‌داریم تا طرح خطی برگردد */
    const drop = new RegExp(`(<img class="photo" data-photo="${slot}\\.webp")\\s+src="[^"]*"`);
    if (drop.test(html)) {
      html = html.replace(drop, '$1');
      console.log(`↺ ${slot}: عکس قبلی برداشته شد، طرح خطی برگشت`);
      removed++;
    } else {
      console.log(`— ${slot}: عکسی پیدا نشد، طرح خطی سر جایش می‌ماند`);
    }
    continue;
  }

  const raw = readFileSync(join(DIR, file));
  const type = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp', '.avif': 'avif', '.gif': 'gif' }[
    extname(file).toLowerCase()
  ];
  const asIs = `data:image/${type};base64,${raw.toString('base64')}`;

  /* Chromium خودش عکس را می‌خواند، اندازه می‌کند و دوباره به webp درمی‌آورد */
  const out = page && raw.length > BUDGET ? await page.evaluate(
    async ({ src, max, quality }) => {
      const img = new Image();
      img.src = src;
      await img.decode();

      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      return { url: canvas.toDataURL('image/webp', quality), w: canvas.width, h: canvas.height };
    },
    { src: asIs, max: MAX_EDGE, quality: QUALITY }
  ) : { url: asIs, w: '?', h: '?' };

  const tag = new RegExp(`(<img class="photo" data-photo="${slot}\\.webp")(?:\\s+src="[^"]*")?`);
  html = html.replace(tag, `$1 src="${out.url}"`);

  const kb = Math.round((out.url.length * 0.75) / 1024);
  console.log(`✓ ${slot}: ${out.w}×${out.h} — ${kb} کیلوبایت (از ${Math.round(raw.length / 1024)})`);
  done++;
}

if (browser) await browser.close();
writeFileSync(PAGE, html);

console.log(
  `\n${done} عکس جاگذاری شد` +
    (removed ? `، ${removed} عکس برداشته شد` : '') +
    `. حجم صفحه: ${Math.round(html.length / 1024)} کیلوبایت.`
);
