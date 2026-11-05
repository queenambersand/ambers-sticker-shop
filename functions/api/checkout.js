// Cloudflare Pages Function: POST /api/checkout
// Prices are recomputed here from stickers.json, so the browser can't change them.
import data from '../../public/stickers.json';

const INTL = ['CA','GB','AU','NZ','IE','DE','FR','NL','BE','ES','IT','PT','SE','NO','DK','FI','AT','CH','PL','JP','KR','SG','MX','BR'];
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  const { items, method } = body, P = data.pricing;
  if (!Array.isArray(items) || !['domestic', 'international', 'pickup'].includes(method)) return json({ error: 'bad request' }, 400);

  let n = 0; const names = [];
  for (const it of items) {
    const s = data.stickers.find(x => x.id === it.id);
    if (!s || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 100) return json({ error: 'invalid item' }, 400);
    n += it.qty; names.push(`${it.qty} x ${s.name}`);
  }
  if (n < 1 || n > 200) return json({ error: 'invalid quantity' }, 400);

  const sub = P.first + P.additional * (n - 1);
  const envelopes = Math.ceil(n / P.perEnvelope);
  const origin = new URL(request.url).origin;
  const summary = names.join(', ').slice(0, 480);

  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('success_url', origin + '/?success=1');
  p.set('cancel_url', origin + '/');
  p.set('metadata[method]', method);
  p.set('metadata[items]', summary);

  let i = 0;
  const line = (name, amount, desc) => {
    p.set(`line_items[${i}][quantity]`, '1');
    p.set(`line_items[${i}][price_data][currency]`, 'usd');
    p.set(`line_items[${i}][price_data][unit_amount]`, String(amount));
    p.set(`line_items[${i}][price_data][product_data][name]`, name);
    if (desc) p.set(`line_items[${i}][price_data][product_data][description]`, desc);
    i++;
  };
  line(`stickers (${n})`, sub, summary);

  if (method === 'pickup') {
    p.set('phone_number_collection[enabled]', 'true');
    p.set('custom_text[submit][message]', 'Local pickup is coordinated with Amber Sand. You will be contacted to arrange pickup at a show.');
  } else {
    line(`${method} shipping (${envelopes} envelope${envelopes > 1 ? 's' : ''})`, envelopes * P[method]);
    (method === 'domestic' ? ['US'] : INTL).forEach((c, k) => p.set(`shipping_address_collection[allowed_countries][${k}]`, c));
  }

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: p
  });
  const s = await r.json();
  return s.url ? json({ url: s.url }) : json({ error: 'stripe error' }, 502);
}
