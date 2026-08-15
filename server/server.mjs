/**
 * سرور محلی پلنر فروشگاه.
 *
 * فقط روی خود این کامپیوتر گوش می‌دهد (۱۲۷.۰.۰.۱) و از بیرون در دسترس
 * نیست. کارش دو چیز است: نشان دادن برنامه در مرورگر، و نگهداری داده‌ها در
 * فایل data.json کنار همین پوشه — مستقل از اینکه با کدام مرورگر باز شود.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { DataStore } from './store.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const PORT = Number(process.env.PORT) || 7373;
const HOST = '127.0.0.1';

// در بستهٔ نهایی، برنامه در پوشهٔ app است؛ هنگام توسعه در dist
const APP_DIR = existsSync(join(ROOT, 'app', 'index.html'))
  ? join(ROOT, 'app')
  : join(ROOT, 'dist');

const store = new DataStore(ROOT);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const json = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
};

function readBody(req, limitBytes = 32 * 1024 * 1024) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        rejectBody(new Error('حجم داده بیش از حد مجاز است'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rejectBody);
  });
}

function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  // جلوگیری از بیرون رفتن از پوشهٔ برنامه
  const target = join(APP_DIR, normalize(relative));
  if (!target.startsWith(APP_DIR)) {
    res.writeHead(403).end('دسترسی مجاز نیست');
    return;
  }

  const file = existsSync(target) && statSync(target).isFile() ? target : join(APP_DIR, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404).end('برنامه پیدا نشد. مطمئن شو پوشهٔ app کنار server است.');
    return;
  }

  const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
  // فایل‌های هش‌دار تغییر نمی‌کنند، ولی صفحهٔ اصلی باید همیشه تازه باشد
  const cache = file.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable';
  res.writeHead(200, { 'content-type': type, 'cache-control': cache });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${HOST}:${PORT}`);

  if (pathname === '/api/health') {
    json(res, 200, { app: 'wabko-planer', storage: 'file', file: store.file });
    return;
  }

  if (pathname === '/api/data') {
    if (req.method === 'GET') {
      json(res, 200, { data: store.read() });
      return;
    }

    if (req.method === 'PUT') {
      try {
        const raw = await readBody(req);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') throw new Error('ساختار داده معتبر نیست');
        store.write(parsed);
        json(res, 200, { ok: true, savedAt: new Date().toISOString() });
      } catch (error) {
        console.error('ذخیره ناموفق بود:', error.message);
        json(res, 400, { ok: false, error: error.message });
      }
      return;
    }

    res.writeHead(405).end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405).end();
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}/`;
  console.log('');
  console.log('  پلنر روزانهٔ فروشگاه');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  آدرس:        ${url}`);
  console.log(`  فایل داده:   ${store.file}`);
  console.log(`  پشتیبان‌ها:   ${store.backupDir}`);
  console.log('');
  console.log('  تا وقتی این پنجره باز است برنامه کار می‌کند.');
  console.log('  برای بستن، این پنجره را ببند یا Ctrl+C بزن.');
  console.log('');

  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n  پورت ${PORT} مشغول است — احتمالاً برنامه از قبل باز است.`);
    console.error(`  مرورگر را روی http://${HOST}:${PORT}/ باز کن.\n`);
  } else {
    console.error('\n  خطای سرور:', error.message, '\n');
  }
  process.exit(1);
});
