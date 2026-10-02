import { prisma } from '@/lib/db';
import { GST_STATES } from '@/lib/gst';
import { COMMON_CITIES, stateCodeFromPin } from '@/lib/places';
import { requireAuth } from '@/lib/server/auth';
import { badRequest, handle, ok } from '@/lib/server/http';

interface PinInfo { pincode: string; stateCode: string | null; state: string | null; city: string | null; district: string | null; areas: string[] }
const cache = new Map<string, PinInfo>();

/** City / district / post offices for a PIN from India Post's public API (only the PIN is sent). */
async function lookup(pin: string): Promise<PinInfo> {
  const hit = cache.get(pin);
  if (hit) return hit;
  const offline = stateCodeFromPin(pin);
  let info: PinInfo = { pincode: pin, stateCode: offline, state: offline ? GST_STATES[offline] : null, city: null, district: null, areas: [] };
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: AbortSignal.timeout(5000) });
    const json = (await res.json()) as { Status?: string; PostOffice?: { Name: string; District: string; Block?: string; State: string }[] }[];
    const offices = json?.[0]?.Status === 'Success' ? json[0].PostOffice || [] : [];
    if (offices.length) {
      const stateName = offices[0].State;
      const code = Object.entries(GST_STATES).find(([, n]) => n.toLowerCase().replace(/&/g, 'and') === stateName.toLowerCase().replace(/&/g, 'and'))?.[0] || offline;
      // The district reads as the city people expect (Pune, Hyderabad, Bangalore); post offices are the localities.
      info = { pincode: pin, stateCode: code, state: code ? GST_STATES[code] : stateName, city: offices[0].District, district: offices[0].District, areas: [...new Set(offices.map((o) => o.Name))] };
    }
  } catch {
    // offline / slow: keep the state from the PIN prefix
  }
  if (info.city || info.state) cache.set(pin, info);
  return info;
}

/**
 * GET ?pin=411019 → state, city, district and areas for a PIN code.
 * GET             → cities to pick from: the ones already used in your data plus common cities.
 */
export const GET = handle(async (request: Request) => {
  const auth = await requireAuth(request);
  const pin = new URL(request.url).searchParams.get('pin');
  if (pin !== null) {
    if (!/^[1-9]\d{5}$/.test(pin)) throw badRequest('Enter a 6-digit PIN code.');
    return ok(await lookup(pin));
  }
  const [customers, addresses, employees] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId: auth.tenantId, city: { not: null } }, select: { city: true }, distinct: ['city'] }),
    prisma.customerAddress.findMany({ where: { city: { not: null }, customer: { tenantId: auth.tenantId } }, select: { city: true }, distinct: ['city'] }),
    prisma.employee.findMany({ where: { tenantId: auth.tenantId }, select: { city: true }, distinct: ['city'] }).catch(() => [] as { city: string | null }[]),
  ]);
  const used = [...customers, ...addresses, ...employees].map((r) => (r.city || '').trim()).filter(Boolean);
  const seen = new Map<string, string>();
  for (const c of [...used, ...COMMON_CITIES]) if (!seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c);
  return ok({ used: [...new Set(used)].sort(), all: [...seen.values()].sort((a, b) => a.localeCompare(b)) });
});
