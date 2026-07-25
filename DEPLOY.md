# LienForm — Deployment Guide

## Prerequisites
- Node.js 18+
- Vercel account
- Stripe account (existing account OK, or create at stripe.com)

## Local Development

```bash
cd lienform
cp .env.example .env
# Fill in your Stripe keys in .env
npm install
npm run dev
# → http://localhost:4321
```

## Environment Variables

Set these in Vercel dashboard → Project Settings → Environment Variables:

| Variable | Description | Where to get |
|---|---|---|
| `STRIPE_PUBLISHABLE_KEY` | Starts with `pk_live_` or `pk_test_` | Stripe Dashboard → Developers → API Keys |
| `STRIPE_SECRET_KEY` | Starts with `sk_live_` or `sk_test_` | Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Starts with `whsec_` | After registering webhook (step below) |

## Deploy to Vercel

1. Push to GitHub (already done via Task 5)
2. Go to https://vercel.com/new
3. Click "Import Git Repository" → select `lienform`
4. Framework Preset: **Astro** (auto-detected)
5. Add environment variables (table above)
6. Click **Deploy**

## Stripe Setup

### Products to create in Stripe Dashboard
Go to Stripe Dashboard → Products → Add product:

| Product | Price | Lookup Key |
|---|---|---|
| Mechanics Lien Bundle | $24.99 one-time | `lien-bundle` |
| Florida Notice to Owner | $14.99 one-time | `nto-florida` |
| Lien Waiver | $9.99 one-time | `lien-waiver` |
| Notice of Intent | $9.99 one-time | `notice-of-intent` |
| Lien Release | $9.99 one-time | `lien-release` |

### Register Webhook
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. Endpoint URL: `https://lienform.com/api/webhook`
3. Events to listen for: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy the **Signing Secret** → set as `STRIPE_WEBHOOK_SECRET` in Vercel

## Custom Domain
1. Vercel Dashboard → Project → Settings → Domains
2. Add `lienform.com`
3. Update your DNS: add Vercel's nameservers or A/CNAME records as instructed
4. SSL is automatic via Vercel

## Post-Deploy Test Checklist
- [ ] Homepage loads at https://lienform.com
- [ ] /mechanics-lien/michigan/ loads with form
- [ ] Deadline calculator shows correct date
- [ ] "Download PDF Bundle" → opens Stripe Checkout
- [ ] Complete test payment (use Stripe test card 4242 4242 4242 4242)
- [ ] Webhook fires (check Stripe Dashboard → Developers → Webhooks → recent deliveries)
- [ ] Sitemap at https://lienform.com/sitemap.xml
- [ ] robots.txt at https://lienform.com/robots.txt

## Stripe Lookup Keys in create-checkout.ts
Update `src/pages/api/create-checkout.ts` to use your actual Stripe Price IDs once you've created the products. Replace the placeholder price creation with `price: 'price_XXXX'` references.
