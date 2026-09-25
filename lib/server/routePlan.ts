import { prisma } from '@/lib/db';
import { businessDate } from './http';

// Delivery route for a delivery boy's open orders. Each customer's location is
// the GPS point of their most recent delivery (captured by the delivery app).
// Stops are ordered nearest-first and then improved with 2-opt; the result
// opens in Google Maps as turn-by-turn directions (max 9 stops per link).

interface Pt {
  lat: number;
  lng: number;
}
const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
export function km(a: Pt, b: Pt) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const pathKm = (start: Pt | null, pts: Pt[]) => pts.reduce((s, p, i) => s + (i === 0 ? (start ? km(start, p) : 0) : km(pts[i - 1], p)), 0);

/** Nearest neighbour from the start, then 2-opt until no swap shortens the route. */
export function orderStops<T extends Pt>(start: Pt | null, stops: T[]): T[] {
  if (stops.length < 2) return stops;
  const left = [...stops];
  const out: T[] = [];
  let cur: Pt = start || left[0];
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (km(cur, left[i]) < km(cur, left[best])) best = i;
    cur = left.splice(best, 1)[0];
    out.push(cur as T);
  }
  let improved = true;
  for (let pass = 0; improved && pass < 50; pass++) {
    improved = false;
    for (let i = 0; i < out.length - 1; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const next = [...out.slice(0, i), ...out.slice(i, j + 1).reverse(), ...out.slice(j + 1)];
        if (pathKm(start, next) + 1e-9 < pathKm(start, out)) {
          out.splice(0, out.length, ...next);
          improved = true;
        }
      }
    }
  }
  return out;
}

const mapsLinks = (start: Pt | null, stops: Pt[]) => {
  const f = (p: Pt) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  const links: string[] = [];
  let origin = start;
  for (let i = 0; i < stops.length; i += 9) {
    const leg = stops.slice(i, i + 9);
    const dest = leg[leg.length - 1];
    const params = new URLSearchParams({ api: '1', destination: f(dest), travelmode: 'driving' });
    if (origin) params.set('origin', f(origin));
    if (leg.length > 1) params.set('waypoints', leg.slice(0, -1).map(f).join('|'));
    links.push(`https://www.google.com/maps/dir/?${params.toString()}`);
    origin = dest;
  }
  return links;
};

const OPEN = ['APPROVED', 'ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY'];

export async function routePlan(tenantId: string, opts: { date?: string; deliveryBoyId?: string | null; start?: Pt | null }) {
  const date = opts.date || businessDate();
  const orders = await prisma.order.findMany({
    where: { tenantId, status: { in: OPEN }, requestedDeliveryDate: { lte: date }, ...(opts.deliveryBoyId ? { assignedDeliveryBoyId: opts.deliveryBoyId } : {}) },
    select: { id: true, orderNumber: true, customerId: true, customerName: true, customerPhone: true, deliveryAddress: true, area: true, route: true, status: true, priority: true, assignedDeliveryBoyName: true, totalAmount: true, items: { select: { productName: true, orderedQty: true } } },
    orderBy: { requestedDeliveryDate: 'asc' },
  });
  const customerIds = [...new Set(orders.map((o) => o.customerId))];
  // Latest GPS per customer from past deliveries.
  const fixes = customerIds.length
    ? await prisma.delivery.findMany({ where: { tenantId, customerId: { in: customerIds }, latitude: { not: null }, longitude: { not: null } }, select: { customerId: true, latitude: true, longitude: true, submittedAt: true }, orderBy: { submittedAt: 'desc' }, take: 5000 })
    : [];
  const loc = new Map<string, Pt>();
  for (const f of fixes) if (!loc.has(f.customerId) && f.latitude && f.longitude) loc.set(f.customerId, { lat: f.latitude, lng: f.longitude });

  type Stop = (typeof orders)[number] & Pt & { cylinders: number };
  const located: Stop[] = [];
  const unlocated = [];
  for (const o of orders) {
    const p = loc.get(o.customerId);
    const cylinders = o.items.reduce((s, i) => s + i.orderedQty, 0);
    if (p) located.push({ ...o, ...p, cylinders });
    else unlocated.push({ ...o, cylinders });
  }
  // Urgent orders first, each group routed on its own.
  const urgent = orderStops(opts.start || null, located.filter((s) => s.priority === 'URGENT'));
  const rest = orderStops(urgent[urgent.length - 1] || opts.start || null, located.filter((s) => s.priority !== 'URGENT'));
  const stops = [...urgent, ...rest];
  const naive = pathKm(opts.start || null, located);
  const planned = pathKm(opts.start || null, stops);
  let run = 0;
  const legs = stops.map((s, i) => {
    const prev = i === 0 ? opts.start : stops[i - 1];
    const leg = prev ? km(prev, s) : 0;
    run += leg;
    return { seq: i + 1, orderId: s.id, orderNumber: s.orderNumber, customer: s.customerName, phone: s.customerPhone, address: s.deliveryAddress || '', area: s.route || s.area || '', priority: s.priority, cylinders: s.cylinders, items: s.items.map((i) => `${i.orderedQty} × ${i.productName}`).join(', '), deliveryBoy: s.assignedDeliveryBoyName || '', lat: s.lat, lng: s.lng, legKm: Math.round(leg * 10) / 10, cumulativeKm: Math.round(run * 10) / 10 };
  });
  return {
    date,
    stops: legs,
    unlocated: unlocated.map((o) => ({ orderId: o.id, orderNumber: o.orderNumber, customer: o.customerName, phone: o.customerPhone, address: o.deliveryAddress || '', area: o.route || o.area || '', cylinders: o.cylinders, deliveryBoy: o.assignedDeliveryBoyName || '' })),
    totalKm: Math.round(planned * 10) / 10,
    savedKm: Math.max(0, Math.round((naive - planned) * 10) / 10),
    mapLinks: mapsLinks(opts.start || null, stops),
  };
}
