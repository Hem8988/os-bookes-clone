import 'dotenv/config';
import { spawn } from 'child_process';
import { createReadStream } from 'fs';
import { mkdir, readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Database backup (SRS §17): run once a day (cron / Task Scheduler).
//   npm run db:backup
// Keeps 7 daily, 4 weekly (Sunday) and 12 monthly (1st) dumps in BACKUP_DIR,
// and copies each dump off the server when BACKUP_S3_BUCKET is set.
// Needs `pg_dump` (PostgreSQL client tools) on the PATH.

const DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const KEEP = { daily: 7, weekly: 4, monthly: 12 };

function dump(file: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('pg_dump', ['--format=custom', '--no-owner', `--file=${file}`, process.env.DATABASE_URL || ''], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump exited with ${code}`))));
  });
}

async function prune(kind: keyof typeof KEEP) {
  const files = (await readdir(DIR)).filter((f) => f.startsWith(`${kind}-`)).sort().reverse();
  for (const old of files.slice(KEEP[kind])) await unlink(path.join(DIR, old));
}

async function upload(file: string) {
  const bucket = process.env.BACKUP_S3_BUCKET;
  if (!bucket) return;
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'ap-south-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '' } : undefined,
  });
  const { size } = await stat(file);
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `db-backups/${path.basename(file)}`, Body: createReadStream(file), ContentLength: size }));
  console.log(`Copied to s3://${bucket}/db-backups/${path.basename(file)}`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
  await mkdir(DIR, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const daily = path.join(DIR, `daily-${stamp}.dump`);
  await dump(daily);
  console.log(`Backup written: ${daily}`);
  await upload(daily);

  const extra: string[] = [];
  if (now.getDay() === 0) extra.push(path.join(DIR, `weekly-${stamp}.dump`));
  if (now.getDate() === 1) extra.push(path.join(DIR, `monthly-${stamp}.dump`));
  for (const copy of extra) {
    await dump(copy);
    await upload(copy);
  }
  await Promise.all((Object.keys(KEEP) as (keyof typeof KEEP)[]).map(prune));
  console.log('Old backups pruned. Restore with: pg_restore --clean --no-owner -d "$DATABASE_URL" <file>');
}

main().catch((error) => {
  console.error('Backup failed:', error);
  process.exit(1);
});
