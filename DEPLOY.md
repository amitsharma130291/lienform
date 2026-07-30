# LienForm — Deployment Guide

## Prerequisites
- Node.js 18+
- Vercel account
- Dodo Payments account (https://app.dodopayments.com)

## Local Development

```bash
cd lienform
cp .env.example .env
# Fill in your Dodo API key in .env
npm install
npm run dev
# → http://localhost:4321
```

## Environment Variables

Set these in Vercel dashboard → Project Settings → Environment Variables:

| Variable | Description | Where to get |
|---|---|---|
| `DODO_API_KEY` | **Live** secret key (from Dodo live mode) | Dodo Dashboard → Developers → API Keys |
| `DODO_PRODUCT_ID` | Product ID (already configured: `pdt_0Nk4mkyzkQM33OI9ZL9La`) | Dodo Dashboard → Products |
| `DODO_WEBHOOK_SECRET` | Signing secret for webhook verification | After registering webhook (step below) |
| `BASE_URL` | Your deployed domain (no trailing slash) | e.g. `https://mechanicslienform.com` |

## Deploy to Vercel

1. Push to GitHub (see Task 7 in job plan)
2. Go to https://vercel.com/new
3. Click "Import Git Repository" → select `lienform`
4. Framework Preset: **Astro** (auto-detected)
5. Add environment variables (table above)
6. Click **Deploy**

## Dodo Payments Setup

### API Keys
1. Log in at https://app.dodopayments.com
2. Go to **Developers → API Keys**
3. Ensure you are in **Live mode** (toggle in the Dodo dashboard)
4. Copy your **Live Secret Key** and set it as `DODO_API_KEY` in Vercel environment variables
5. Similarly, update `DODO_WEBHOOK_SECRET` to your **live** webhook signing secret

### Product
The product ID `pdt_0Nk4mkyzkQM33OI9ZL9La` is already configured in the codebase.
Confirm it exists in your Dodo dashboard under **Products**.

If you want per-document-type pricing (lien waiver at $9.99 vs mechanics lien at $24.99),
either:
- Enable **Pay What You Want** on the product (the API sends `amount` per request), OR
- Create separate products per type and update the `productId` lookup in `src/pages/api/create-checkout.ts`

### Register Webhook
1. Dodo Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://mechanicslienform.com/api/webhook`
3. Events to listen for: select **All events** (or at minimum `payment.succeeded`)
4. Copy the **Signing Secret** → set as `DODO_WEBHOOK_SECRET` in Vercel

### Live Mode
- `create-checkout.ts` now points at `https://live.dodopayments.com` (live mode)
- **Operator must update Vercel env vars to live values:**
  - `DODO_API_KEY` → your live secret key from Dodo Dashboard → Developers → API Keys (live mode)
  - `DODO_WEBHOOK_SECRET` → your live webhook signing secret

## Post-Deploy Test Checklist
- [ ] Homepage loads at https://mechanicslienform.com
- [ ] /mechanics-lien/michigan/ loads with form
- [ ] Deadline calculator shows correct date
- [ ] "Buy Now — $24.99" → redirects to Dodo hosted checkout
- [ ] Complete test checkout using a test card
- [ ] `/success/` page loads after payment
- [ ] Webhook fires (check Dodo Dashboard → Developers → Webhooks → Delivery Logs)
- [ ] "Continue with free beta download" still works (generates PDF client-side)
- [ ] Sitemap at https://mechanicslienform.com/sitemap.xml

## Already on Live Mode
The endpoint is already set to `https://live.dodopayments.com` in `create-checkout.ts`.

**Before going live, ensure these Vercel env vars are set to live values:**
1. `DODO_API_KEY` — live secret key from Dodo Dashboard → Developers → API Keys (live mode)
2. `DODO_WEBHOOK_SECRET` — live webhook signing secret from Dodo Dashboard → Developers → Webhooks

No code changes needed — just update the environment variables and redeploy.
