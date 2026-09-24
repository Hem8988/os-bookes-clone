import { requireAuth } from '@/lib/server/auth';
import { ApiError, handle, ok, readJson, str } from '@/lib/server/http';

// English → Hindi (Devanagari) spelling for names, e.g. "Burger King" → "बर्गर किंग".
// Uses Google Input Tools (the engine behind Gboard's Hindi typing); only the
// typed text is sent. Parts already in Devanagari, digits and symbols are kept.

const ENDPOINT = 'https://inputtools.google.com/request';

async function toHindi(word: string): Promise<string> {
  const url = `${ENDPOINT}?text=${encodeURIComponent(word)}&itc=hi-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=deskshark`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as [string, [string, string[]][]];
  if (data[0] !== 'SUCCESS') throw new Error(String(data[0]));
  return data[1]?.[0]?.[1]?.[0] ?? word;
}

export const POST = handle(async (request: Request) => {
  await requireAuth(request, undefined, { write: true });
  const body = await readJson(request);
  const text = str(body.text, 'Text', { required: true, max: 200 });
  try {
    // Convert each run of Latin letters; leave numbers, punctuation and Hindi as typed.
    const parts = text.split(/([A-Za-z][A-Za-z ]*[A-Za-z]|[A-Za-z])/);
    const out = await Promise.all(parts.map((p) => (/^[A-Za-z]/.test(p) ? toHindi(p.toLowerCase()) : p)));
    return ok({ text: out.join('') });
  } catch {
    throw new ApiError(502, 'Hindi conversion is not available right now. Check the internet connection or type the name in Hindi.', 'TRANSLITERATE_FAILED');
  }
});
