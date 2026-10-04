import { ApiError } from './http';

// Online GSTIN lookup (registered name, trade name, address, status) through a
// GST API provider. Configure in .env:
//   GST_API_KEY=<your key>
//   GST_API_PROVIDER=gstincheck        (default; https://gstincheck.co.in)
// The key stays on the server. Results are cached per process so the same
// GSTIN does not spend a paid lookup twice.

export interface GstDetails {
  gstin: string;
  legalName: string | null;
  tradeName: string | null;
  status: string | null; // e.g. Active, Cancelled, Suspended
  active: boolean;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  registeredOn: string | null;
  businessType: string | null;
}

type Raw = Record<string, unknown>;
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);
const obj = (v: unknown): Raw => (v && typeof v === 'object' ? (v as Raw) : {});

/** GSTN taxpayer-search shape (lgnm, tradeNam, sts, pradr.addr…) → our fields. */
function normalise(gstin: string, d: Raw): GstDetails {
  const addr = obj(obj(d.pradr).addr);
  const parts = [addr.bno, addr.flno, addr.bnm, addr.st, addr.loc, addr.landMark].map(text).filter((p) => p && p !== '0');
  const status = text(d.sts) || text(d.status);
  return {
    gstin,
    legalName: text(d.lgnm) || text(d.legalName) || text(d.legal_name),
    tradeName: text(d.tradeNam) || text(d.tradeName) || text(d.trade_name),
    status,
    active: !status || /^active/i.test(status),
    // The provider's one-line address reads best; else build it from the parts.
    address: text(obj(d.pradr).adr) || (parts.length ? parts.join(', ') : text(d.address)),
    city: text(addr.city) || text(addr.loc) || text(addr.dst),
    district: text(addr.dst),
    state: text(addr.stcd) || text(d.state),
    pincode: text(addr.pncd) || text(d.pincode),
    registeredOn: text(d.rgdt),
    businessType: text(d.ctb) || text(d.dty),
  };
}

const cache = new Map<string, GstDetails>();

export function gstLookupConfigured() {
  return !!process.env.GST_API_KEY;
}

export async function lookupGstin(gstin: string): Promise<GstDetails> {
  const key = process.env.GST_API_KEY;
  if (!key) throw new ApiError(503, 'GST auto-fill is not set up yet — add GST_API_KEY to the server .env.', 'GST_LOOKUP_NOT_CONFIGURED');
  const hit = cache.get(gstin);
  if (hit) return hit;

  const provider = (process.env.GST_API_PROVIDER || 'gstincheck').toLowerCase();
  if (provider !== 'gstincheck') throw new ApiError(503, `GST provider "${provider}" is not supported yet.`, 'GST_LOOKUP_NOT_CONFIGURED');

  let body: Raw;
  try {
    const res = await fetch(`https://sheet.gstincheck.co.in/check/${encodeURIComponent(key)}/${encodeURIComponent(gstin)}`, { signal: AbortSignal.timeout(12_000), cache: 'no-store' });
    body = obj(await res.json());
  } catch {
    throw new ApiError(502, 'Could not reach the GST service — check the internet connection and try again.', 'GST_LOOKUP_FAILED');
  }
  // gstincheck: { flag: true|false, message, data: {...} }
  if (body.flag === false || !body.data) {
    const message = text(body.message) || 'GSTIN not found.';
    throw new ApiError(/credit|key|limit|auth/i.test(message) ? 502 : 404, message, 'GST_LOOKUP_FAILED');
  }
  const details = normalise(gstin, obj(body.data));
  cache.set(gstin, details);
  return details;
}
