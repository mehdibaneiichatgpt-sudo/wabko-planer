/**
 * نگهداری داده‌ها در یک فایل واقعی روی دیسک.
 *
 * دو نکتهٔ مهم:
 * ۱) نوشتن اتمی است: اول در فایل موقت نوشته می‌شود و بعد جابه‌جا می‌شود.
 *    اگر وسط نوشتن برق برود یا برنامه بسته شود، فایل اصلی سالم می‌ماند.
 * ۲) پیش از اولین ذخیرهٔ هر روز، یک نسخهٔ پشتیبان از داده‌های قبلی گرفته
 *    می‌شود تا اگر چیزی اشتباه ثبت شد، برگشت‌پذیر باشد.
 */
import { mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const BACKUP_LIMIT = 60;

export class DataStore {
  constructor(rootDir) {
    this.file = join(rootDir, 'data.json');
    this.tempFile = join(rootDir, 'data.json.tmp');
    this.backupDir = join(rootDir, 'backups');
  }

  read() {
    if (!existsSync(this.file)) return null;
    try {
      return JSON.parse(readFileSync(this.file, 'utf8'));
    } catch (error) {
      // فایل خراب را کنار می‌گذاریم تا با نوشتن بعدی پاک نشود
      const broken = `${this.file}.broken-${Date.now()}`;
      renameSync(this.file, broken);
      console.error(`Data file could not be read; moved to ${broken}:`, error.message);
      return null;
    }
  }

  write(data) {
    this.backupOncePerDay();
    writeFileSync(this.tempFile, JSON.stringify(data, null, 2), 'utf8');
    renameSync(this.tempFile, this.file);
  }

  /** روزی یک نسخهٔ پشتیبان، نه بیشتر */
  backupOncePerDay() {
    if (!existsSync(this.file)) return;

    mkdirSync(this.backupDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const target = join(this.backupDir, `data-${stamp}.json`);
    if (existsSync(target)) return;

    writeFileSync(target, readFileSync(this.file, 'utf8'), 'utf8');
    this.pruneBackups();
  }

  pruneBackups() {
    const files = readdirSync(this.backupDir)
      .filter((name) => name.startsWith('data-') && name.endsWith('.json'))
      .sort();
    for (const name of files.slice(0, Math.max(0, files.length - BACKUP_LIMIT))) {
      unlinkSync(join(this.backupDir, name));
    }
  }
}
