import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS, SettingKey, SettingsMap } from '@/lib/settings';
import { audit } from '@/lib/server/audit';
import { getAuth, requireAuth } from '@/lib/server/auth';
import { badRequest, handle, ok, readJson } from '@/lib/server/http';
import { getSetting, saveSetting } from '@/lib/server/settings';

type Ctx = { params: Promise<{ key: string }> };

function keyOf(raw: string): SettingKey {
  if (!(raw in DEFAULT_SETTINGS)) throw badRequest('Unknown setting.');
  return raw as SettingKey;
}

export const GET = handle(async (request: Request, ctx: Ctx) => {
  const key = keyOf((await ctx.params).key);
  // The company profile is public business info (printed on every invoice) and
  // is shown on the login screen; everything else is admin-only.
  if (key === 'company') {
    const auth = await getAuth(request);
    return ok(await getSetting(auth?.tenantId || process.env.DEFAULT_TENANT_ID || 'default', key));
  }
  const auth = await requireAuth(request, 'settings.manage');
  return ok(await getSetting(auth.tenantId, key));
});

export const PUT = handle(async (request: Request, ctx: Ctx) => {
  const key = keyOf((await ctx.params).key);
  const auth = await requireAuth(request, 'settings.manage', { write: true });
  const before = await getSetting(auth.tenantId, key);
  const body = await readJson<SettingsMap[typeof key]>(request);
  const saved = await saveSetting(auth.tenantId, key, body, auth.name);
  await audit(prisma, auth, { action: 'SETTINGS_UPDATED', entityType: 'Setting', entityId: key, oldValue: before, newValue: saved, sensitive: key === 'security' });
  return ok(saved, 'Settings saved.');
});
