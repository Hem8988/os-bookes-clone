import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS, SettingKey, SettingsMap } from '@/lib/settings';

const cache = new Map<string, { value: unknown; at: number }>();
const TTL_MS = 30_000;

function merge<T>(defaults: T, stored: unknown): T {
  if (!stored || typeof stored !== 'object' || Array.isArray(defaults)) return (stored as T) ?? defaults;
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
    const d = (defaults as Record<string, unknown>)[k];
    out[k] = d && typeof d === 'object' && !Array.isArray(d) ? merge(d, v) : v;
  }
  return out as T;
}

export async function getSetting<K extends SettingKey>(tenantId: string, key: K): Promise<SettingsMap[K]> {
  const cacheKey = `${tenantId}:${key}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as SettingsMap[K];
  const row = await prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key } } });
  const value = merge(DEFAULT_SETTINGS[key], row?.value);
  cache.set(cacheKey, { value, at: Date.now() });
  return value;
}

export async function saveSetting<K extends SettingKey>(tenantId: string, key: K, value: SettingsMap[K], updatedBy: string) {
  const merged = merge(DEFAULT_SETTINGS[key], value);
  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: { tenantId, key, value: merged as object, updatedBy },
    update: { value: merged as object, updatedBy },
  });
  cache.delete(`${tenantId}:${key}`);
  return merged;
}
