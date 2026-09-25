import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// Encrypts small secrets kept in the database (e.g. the SMTP password) with
// AES-256-GCM. The key is derived from SESSION_SECRET, so a real secret must be
// configured before anything can be stored.

function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('Set a SESSION_SECRET of at least 32 characters in the server .env before saving passwords.');
  return createHash('sha256').update(`deskshark:secret-box:${secret}`).digest();
}

/** "v1:<iv>:<tag>:<ciphertext>" (base64url parts). */
export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join(':');
}

/** Returns null when the value cannot be opened (wrong / rotated secret). */
export function open(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const [version, iv, tag, data] = sealed.split(':');
  if (version !== 'v1' || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
