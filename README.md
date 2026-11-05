# amber sand stickers

Static site + one Cloudflare Pages Function that creates Stripe Checkout sessions.

## Edit your stickers and prices
`public/stickers.json` is the single source of truth (site and server both read it).
Put images in `public/img/` and set `"image": "img/yourfile.png"` (square works best). Prices are in cents.

## Deploy (free)
1. Create a Stripe account, then copy your **secret key** (start with the test key, `sk_test_...`).
2. Push this folder to a GitHub repo.
3. Cloudflare dashboard > Workers & Pages > Create > Pages > connect the repo.
   Build command: *(none)*. Build output directory: `public`.
4. Project > Settings > Variables and Secrets: add `STRIPE_SECRET_KEY` (type: Secret). Redeploy.
5. Test with card `4242 4242 4242 4242`, any future date, any CVC.
6. Swap in the live key (`sk_live_...`) and redeploy when ready.

## Local testing
Create `.dev.vars` containing `STRIPE_SECRET_KEY=sk_test_...`, then run `npx wrangler pages dev public`.
