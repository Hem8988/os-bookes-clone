import { DEFAULT_WEBSITE, type WebsiteContent, type WebsiteStep } from '@/lib/website';
import { badRequest } from './http';
import { fileTenantFolder, isStoredFile } from './storage';

// Clean what Admin → Website sends before it is saved: known fields only, text trimmed and
// capped, lists capped, and photos limited to the site's own pictures or files this tenant
// uploaded (so the public page never links to anything else).

const text = (v: unknown, max: number, fallback = '') => (typeof v === 'string' ? v.trim().slice(0, max) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const list = <T>(v: unknown, max: number, map: (x: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(v) ? v : []).slice(0, max).flatMap((x) => {
    const r = x && typeof x === 'object' ? map(x as Record<string, unknown>) : null;
    return r ? [r] : [];
  });
const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

function image(v: unknown, tenantId: string, label: string): string {
  const url = text(v, 300);
  if (!url) return '';
  if (/^\/site\/[\w.-]+\.(webp|png|jpe?g|svg)$/i.test(url)) return url;
  if (isStoredFile(url) && fileTenantFolder(url.slice('/api/files/'.length)) === tenantId.toLowerCase().replace(/[^a-z0-9-]/g, '-')) return url;
  throw badRequest(`${label}: upload the photo again.`);
}

const steps = (v: unknown, max: number): WebsiteStep[] =>
  list(v, max, (s) => {
    const title = text(s.title, 80);
    const body = text(s.text, 400);
    return title || body ? { title, text: body } : null;
  });

export function cleanWebsite(raw: unknown, tenantId: string): WebsiteContent {
  const d = DEFAULT_WEBSITE;
  const hero = obj(obj(raw).hero);
  const products = obj(obj(raw).products);
  const cylinders = obj(obj(raw).cylinders);
  const ordering = obj(obj(raw).ordering);
  const audience = obj(obj(raw).audience);
  const safety = obj(obj(raw).safety);
  const inquiry = obj(obj(raw).inquiry);
  const contact = obj(obj(raw).contact);

  const headline = text(hero.headline, 90);
  if (!headline) throw badRequest('Top section: the main heading cannot be empty.');
  return {
    hero: {
      headline,
      lead: text(hero.lead, 400),
      image: image(hero.image, tenantId, 'Top section photo'),
      imageAlt: text(hero.imageAlt, 200),
      emergencyNote: bool(hero.emergencyNote, d.hero.emergencyNote),
    },
    products: {
      show: bool(products.show, true),
      title: text(products.title, 80),
      lead: text(products.lead, 400),
      banner: image(products.banner, tenantId, 'Products banner'),
      items: list(products.items, 12, (p) => {
        const name = text(p.name, 60);
        return name ? { name, tag: text(p.tag, 40), image: image(p.image, tenantId, `Product "${name}" photo`), text: text(p.text, 400) } : null;
      }),
    },
    cylinders: { show: bool(cylinders.show, true), title: text(cylinders.title, 80), lead: text(cylinders.lead, 400) },
    ordering: { show: bool(ordering.show, true), title: text(ordering.title, 80), lead: text(ordering.lead, 400), steps: steps(ordering.steps, 6) },
    audience: {
      show: bool(audience.show, true),
      ticker: bool(audience.ticker, true),
      title: text(audience.title, 80),
      lead: text(audience.lead, 400),
      items: (Array.isArray(audience.items) ? audience.items : []).slice(0, 20).map((s) => text(s, 30)).filter(Boolean),
    },
    safety: { show: bool(safety.show, true), title: text(safety.title, 80), lead: text(safety.lead, 400), tips: steps(safety.tips, 8) },
    inquiry: { show: bool(inquiry.show, true), title: text(inquiry.title, 80), lead: text(inquiry.lead, 400), steps: steps(inquiry.steps, 5) },
    contact: { show: bool(contact.show, true), title: text(contact.title, 80), lead: text(contact.lead, 400) },
  };
}
