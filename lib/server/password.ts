import { randomBytes, scryptSync, timingSafeEqual, createHash, randomInt } from 'crypto';

const KEY_LENGTH = 64;
const COST = 16384;

/** scrypt$<cost>$<salt>$<hash> */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(password, salt, KEY_LENGTH, { N: COST }).toString('base64url');
  return `scrypt$${COST}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (stored.startsWith('scrypt$')) {
    const [, cost, salt, hash] = stored.split('$');
    const expected = Buffer.from(hash, 'base64url');
    const actual = scryptSync(password, salt, expected.length, { N: Number(cost) });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  // Legacy SHA-256 hashes from the first version; re-hashed on next login.
  const legacy = createHash('sha256').update(password + 'deskshark_salt_2026').digest('hex');
  return legacy.length === stored.length && timingSafeEqual(Buffer.from(legacy), Buffer.from(stored));
}

export const needsRehash = (stored: string) => !stored.startsWith('scrypt$');

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain letters and numbers.';
  return null;
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(`otp:${code}`).digest('hex');
}
