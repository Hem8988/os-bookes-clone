import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { badRequest } from './http';

// Proof photos, cheque photos and payment screenshots (SRS §3.2).
// STORAGE_DRIVER=s3 stores in any S3-compatible bucket; otherwise files are
// kept on local disk under STORAGE_DIR. Files are always served through the
// authenticated /api/files route, never publicly.

const MAX_BYTES = 5 * 1024 * 1024;
const LOCAL_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), 'storage', 'uploads');
const PUBLIC_PREFIX = '/api/files/';

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
  { mime: 'application/pdf', ext: 'pdf', test: (b) => b.subarray(0, 5).toString() === '%PDF-' },
];

let s3: S3Client | null = null;
const useS3 = () => process.env.STORAGE_DRIVER === 's3';

function s3Client() {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.S3_REGION || 'ap-south-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '' } : undefined,
    });
  }
  return s3;
}

export function isStoredFile(url: string | null | undefined): boolean {
  return !!url && url.startsWith(PUBLIC_PREFIX) && /^[a-z0-9-]+\/[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(url.slice(PUBLIC_PREFIX.length));
}

/** Validate type by magic bytes (not the client-provided MIME) and size. */
export function inspectFile(data: Buffer) {
  if (data.length === 0) throw badRequest('File is empty.');
  if (data.length > MAX_BYTES) throw badRequest('File is larger than 5 MB.');
  const kind = SIGNATURES.find((s) => s.test(data));
  if (!kind) throw badRequest('Only JPG, PNG, WEBP images or PDF files are allowed.');
  return kind;
}

export async function storeFile(tenantId: string, data: Buffer): Promise<{ url: string; mime: string; size: number }> {
  const kind = inspectFile(data);
  const folder = tenantId.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'default';
  const key = `${folder}/${randomUUID()}.${kind.ext}`;
  if (useS3()) {
    await s3Client().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: data, ContentType: kind.mime }));
  } else {
    const target = path.join(LOCAL_DIR, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
  }
  return { url: `${PUBLIC_PREFIX}${key}`, mime: kind.mime, size: data.length };
}

export async function readStoredFile(key: string): Promise<{ data: Buffer; mime: string } | null> {
  if (!/^[a-z0-9-]+\/[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(key)) return null;
  const mime = SIGNATURES.find((s) => key.endsWith(`.${s.ext}`))?.mime || 'application/octet-stream';
  try {
    if (useS3()) {
      const res = await s3Client().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? { data: Buffer.from(bytes), mime } : null;
    }
    return { data: await readFile(path.join(LOCAL_DIR, key)), mime };
  } catch {
    return null;
  }
}

/** Tenant folder of a stored-file URL, for access checks. */
export const fileTenantFolder = (key: string) => key.split('/')[0];
