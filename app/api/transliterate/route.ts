import { requireAuth } from '@/lib/server/auth';
import { ApiError, handle, ok, readJson, str } from '@/lib/server/http';

// English → Hindi or Marathi (Devanagari) spelling for names, e.g. "Burger King" → "बर्गर किंग".
// Uses Google Input Tools (the engine behind Gboard's Hindi typing); only the
// typed text is sent. Parts already in Devanagari, digits and symbols are kept.

const ENDPOINT = 'https://inputtools.google.com/request';

async function toDevanagari(word: string, lang: 'hi' | 'mr'): Promise<string> {
  const url = `${ENDPOINT}?text=${encodeURIComponent(word)}&itc=${lang}-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=deskshark`;
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
  const lang = body.lang === 'mr' ? 'mr' : 'hi';
  try {
    // Convert each run of Latin letters; leave numbers, punctuation and Devanagari as typed.
    const parts = text.split(/([A-Za-z][A-Za-z ]*[A-Za-z]|[A-Za-z])/);
    const out = await Promise.all(parts.map((p) => (/^[A-Za-z]/.test(p) ? toDevanagari(p.toLowerCase(), lang) : p)));
    return ok({ text: out.join('') });
  } catch {
    throw new ApiError(502, `${lang === 'mr' ? 'Marathi' : 'Hindi'} conversion is not available right now. Check the internet connection or type the name yourself.`, 'TRANSLITERATE_FAILED');
  }
});
