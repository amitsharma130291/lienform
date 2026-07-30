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
| `DODO_API_KEY` | Test key starts with `sk_test_` | Dodo Dashboard → Developers → API Keys |
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
3. Copy your **Test Secret Key** (starts with `sk_test_`) for development
4. Set it as `DODO_API_KEY` in Vercel environment variables

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

### Test Mode vs Live Mode
- `create-checkout.ts` currently points at `https://test.dodopayments.com` (test mode)
- To go live, change `DODO_BASE_URL` to `https://live.dodopayments.com` and use a live API key
- Test cards: Dodo uses Stripe-compatible test cards in test mode.
  Common test card: `4242 4242 4242 4242`, any future expiry, any CVC

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

## Switching from Test to Live
1. In Dodo dashboard, confirm your business details and get live API credentials
2. Update Vercel env: `DODO_API_KEY` → live secret key
3. In `src/pages/api/create-checkout.ts`, change:
   ```ts
   const DODO_BASE_URL = 'https://live.dodopayments.com';
   ```
4. Redeploy
