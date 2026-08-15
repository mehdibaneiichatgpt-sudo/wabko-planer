/**
 * بستهٔ آمادهٔ اجرا برای کامپیوتر مغازه می‌سازد.
 *
 * خروجی پوشه‌ای است که کاربر آن را در D:\Cloude می‌گذارد و با دابل‌کلیک روی
 * فایل اجرا، برنامه بالا می‌آید. داده‌ها کنار همین پوشه در data.json می‌نشیند.
 */
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const NAME = 'wabko-planner';
const OUT = join('release', NAME);

if (!existsSync(join('dist', 'index.html'))) {
  console.error('اول npm run build را اجرا کن.');
  process.exit(1);
}

rmSync('release', { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

cpSync('dist', join(OUT, 'app'), { recursive: true });
cpSync('server', join(OUT, 'server'), { recursive: true });

// سرور به فایل‌های ساخته‌شده نیاز دارد، نه به Service Worker
rmSync(join(OUT, 'app', 'sw.js'), { force: true });

/* ------------------------- فایل اجرای ویندوز ------------------------- */

const bat = `@echo off
chcp 65001 >nul
title پلنر روزانه وانکو
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js روی این کامپیوتر نصب نیست.
  echo.
  echo   یک بار از این آدرس نسخه LTS را نصب کن و دوباره همین فایل را اجرا کن:
  echo   https://nodejs.org/fa/download
  echo.
  pause
  exit /b 1
)

node server\\server.mjs
echo.
echo   برنامه بسته شد.
pause
`;

writeFileSync(join(OUT, 'اجرای پلنر.bat'), '\ufeff' + bat, 'utf8');
writeFileSync(join(OUT, 'start.bat'), '\ufeff' + bat, 'utf8');

/* ------------------------- اجرا روی مک و لینوکس ---------------------- */

const sh = `#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js نصب نیست. از https://nodejs.org نسخه LTS را نصب کن."
  exit 1
fi
node server/server.mjs
`;

writeFileSync(join(OUT, 'start.command'), sh, { mode: 0o755 });

/* --------------------------------- راهنما --------------------------- */

const readme = `پلنر روزانه وانکو
==================

اجرا
----
روی فایل «اجرای پلنر.bat» دابل‌کلیک کن.
یک پنجره سیاه باز می‌شود و مرورگر خودش برنامه را نشان می‌دهد.

تا وقتی آن پنجره باز است برنامه کار می‌کند. برای بستن، پنجره را ببند.

اگر پیام داد Node.js نصب نیست، یک بار از nodejs.org نسخه LTS را نصب کن.
این کار فقط یک بار لازم است.

آدرس برنامه
-----------
http://127.0.0.1:7373

این آدرس را می‌توانی در هر مرورگری باز کنی: کروم، فایرفاکس، اج.
همه یک داده را می‌بینند، چون داده در فایل است نه در مرورگر.
می‌توانی از مرورگر Bookmark بگیری تا هر روز سریع بازش کنی.

اطلاعات کجاست
--------------
data.json            همه اطلاعات، کنار همین پوشه
backups\\             نسخه پشتیبان خودکار، روزی یک بار

پاک کردن اطلاعات مرورگر یا عوض کردن مرورگر هیچ اثری روی این فایل ندارد.
هر تغییری که در برنامه بدهی، نیم ثانیه بعد در data.json ثبت می‌شود.
بالای صفحه، کنار تاریخ، نوشته «ذخیره شد» تا مطمئن باشی.

نسخه پشتیبان دستی
------------------
برای اطمینان بیشتر، هر چند وقت یک بار کل این پوشه را روی فلش کپی کن.
یا از داخل برنامه، بخش تنظیمات، دکمه «دریافت فایل پشتیبان».

اینترنت
-------
لازم نیست. همه چیز روی همین کامپیوتر اجرا می‌شود.
`;

writeFileSync(join(OUT, 'راهنما.txt'), '\ufeff' + readme, 'utf8');

console.log(`✓ بسته در ${OUT} آماده شد`);
