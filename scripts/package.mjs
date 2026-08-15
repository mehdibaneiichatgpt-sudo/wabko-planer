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


/** ویندوز پایان خط CRLF می‌خواهد */
const crlf = (text) => text.replace(/\r?\n/g, '\r\n');

/* ------------------------- فایل اجرای ویندوز ------------------------- */

// فایل bat باید کاملاً ASCII باشد: cmd محتوای فارسی را به‌جای متن، دستور
// می‌خواند و اسکریپت از هم می‌پاشد. توضیح فارسی در راهنما.txt است.
// ضمناً Node گاهی نصب هست ولی در PATH نیست، پس مسیرهای استاندارد هم چک می‌شوند.
// سرور باید در حال اجرا بماند، ولی لازم نیست پنجره‌اش جلوی چشم باشد:
// لانچر آن را مینیمایز اجرا می‌کند و خودش بلافاصله بسته می‌شود، درست مثل
// یک میان‌بر معمولی. پنجرهٔ مینیمایز در نوار وظیفه می‌ماند تا هر وقت خواستی
// ببندیش و برنامه متوقف شود.
const bat = `@echo off
cd /d "%~dp0"

set "NODE_EXE="
where node >nul 2>nul && set "NODE_EXE=node"
if not defined NODE_EXE if exist "%ProgramFiles%\\nodejs\\node.exe" set "NODE_EXE=%ProgramFiles%\\nodejs\\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\\nodejs\\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\\nodejs\\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\\Programs\\nodejs\\node.exe" set "NODE_EXE=%LOCALAPPDATA%\\Programs\\nodejs\\node.exe"

if not defined NODE_EXE goto no_node

start "Wabko Planner" /min "%~dp0server\\run.bat"
exit /b 0

:no_node
echo.
echo   ============================================
echo    Node.js was not found on this computer.
echo   ============================================
echo.
echo    1. Install the LTS version from:
echo         https://nodejs.org
echo.
echo    2. If Node.js is already installed, run its
echo       installer again, choose "Repair",
echo       then restart Windows.
echo.
echo    3. Run this file again.
echo.
pause
exit /b 1
`;

// این یکی داخل پنجرهٔ مینیمایز اجرا می‌شود. اگر سرور با خطا بسته شد، pause
// نگهش می‌دارد تا پیام خطا دیده شود؛ در حالت عادی پنجره تا پایان کار باز است.
const runBat = `@echo off
chcp 65001 >nul
title Wabko Planner
cd /d "%~dp0.."
if not defined NODE_EXE set "NODE_EXE=node"
"%NODE_EXE%" server\\server.mjs
if errorlevel 1 (
  echo.
  echo   The app stopped with an error. Read the message above.
  echo.
  pause
)
`;

writeFileSync(join(OUT, 'اجرای پلنر.bat'), crlf(bat), 'ascii');
writeFileSync(join(OUT, 'server', 'run.bat'), crlf(runBat), 'ascii');

/* ------------------------- اجرا روی مک و لینوکس ---------------------- */

const sh = `#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js نصب نیست. از https://nodejs.org نسخه LTS را نصب کن."
  exit 1
fi
node server/server.mjs
`;

if (process.env.INCLUDE_UNIX_LAUNCHER === '1') {
  writeFileSync(join(OUT, 'start.command'), sh, { mode: 0o755 });
}

/* --------------------------------- راهنما --------------------------- */

const readme = `پلنر روزانه وانکو
==================

اجرا
----
روی فایل «اجرای پلنر.bat» دابل‌کلیک کن.
یک پنجره سیاه یک لحظه باز و بسته می‌شود، بعد مرورگر خودش برنامه را نشان می‌دهد.

برنامه در پس زمینه اجرا می‌ماند: در نوار وظیفه (پایین صفحه) یک پنجره
مینیمایز به اسم Wabko Planner می‌بینی.

بستن برنامه
-----------
همان پنجره Wabko Planner را از نوار وظیفه باز کن و ببند.
بستن مرورگر به تنهایی برنامه را متوقف نمی‌کند.

اگر پیام داد Node.js نصب نیست، یک بار از nodejs.org نسخه LTS را نصب کن.
این کار فقط یک بار لازم است.

اگر پیام داد Node.js پیدا نشد
------------------------------
یعنی نصب نیست، یا نصب هست ولی ویندوز مسیرش را نمی‌شناسد.
اگر قبلا نصبش کرده‌ای: نصب‌کننده Node.js را دوباره باز کن، دکمه Repair را
بزن، بعد ویندوز را ری‌استارت کن و دوباره «اجرای پلنر» را بزن.

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

writeFileSync(join(OUT, 'راهنما.txt'), '\ufeff' + crlf(readme), 'utf8');

console.log(`✓ بسته در ${OUT} آماده شد`);
