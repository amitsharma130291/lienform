# LienForm.com

State-specific mechanics lien document generator. Generates compliant PDF bundles for contractors, subcontractors, and material suppliers across all 50 states.

## Tech Stack

- [Astro 4](https://astro.build/) with hybrid SSR
- [React 18](https://react.dev/) for interactive islands
- [Tailwind CSS](https://tailwindcss.com/) with custom navy/trust palette
- [jsPDF](https://rawgit.com/MrRio/jsPDF/master/docs/) for client-side PDF generation
- [Stripe](https://stripe.com/) for payments
- Deployed on [Vercel](https://vercel.com/)

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-org/lienform.git
cd lienform
npm install
```

### 2. Set up environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...   # or pk_live_... in production
STRIPE_SECRET_KEY=sk_test_...        # or sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_...      # from your Stripe webhook dashboard
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### 4. Build for production

```bash
npm run build
```

### 5. Preview the production build

```bash
npm run preview
```

---

## Project Structure

```
lienform/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── FormStepper.tsx          # 3-step form wizard (React island)
│   │   ├── DeadlineCalculator.tsx   # State-specific deadline calculator (React island)
│   │   ├── PDFPreview.tsx           # Live document preview with lock overlay (React island)
│   │   ├── CheckoutButton.tsx       # Stripe checkout + upsell checkboxes (React island)
│   │   └── PDFGenerator.ts          # jsPDF multi-page bundle generator
│   ├── layouts/
│   │   └── StatePage.astro          # Shared HTML shell (nav, footer, SEO, fonts)
│   ├── pages/
│   │   └── api/
│   │       ├── create-checkout.ts   # POST /api/create-checkout → Stripe session
│   │       └── webhook.ts           # POST /api/webhook → Stripe event handler
│   └── styles/
│       └── global.css               # Tailwind + custom component layer
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── vercel.json
└── .env.example
```

---

## Deploying to Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/lienform)

### Manual deploy

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Link and deploy:
   ```bash
   vercel
   ```

3. Set environment variables in the Vercel dashboard:
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

   Or via CLI:
   ```bash
   vercel env add STRIPE_SECRET_KEY
   vercel env add STRIPE_PUBLISHABLE_KEY
   vercel env add STRIPE_WEBHOOK_SECRET
   ```

4. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## Stripe Setup

### 1. Create a Stripe account

Sign up at [stripe.com](https://stripe.com) and activate your account.

### 2. Get your API keys

From your [Stripe Dashboard](https://dashboard.stripe.com/apikeys):
- Copy the **Publishable key** (`pk_live_...`) → `STRIPE_PUBLISHABLE_KEY`
- Copy the **Secret key** (`sk_live_...`) → `STRIPE_SECRET_KEY`

Use test keys (`pk_test_...` / `sk_test_...`) during development.

### 3. Set up a webhook

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Set the URL to: `https://lienform.com/api/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 4. Test locally with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:4321/api/webhook
```

### Pricing

| Product | Price |
|---|---|
| Lien Bundle (standard) | $24.99 |
| Florida NTO Bundle | $14.99 |
| Lien Waiver (add-on) | $9.99 |
| Notice of Intent (add-on) | $9.99 |
| Lien Release (add-on) | $9.99 |

---

## Adding State Pages

State-specific landing pages follow this pattern:

```
src/pages/mechanics-lien/[state]/index.astro
```

Each page imports `StatePage.astro` as its layout and uses the shared React islands:

```astro
---
import StatePage from '../../../layouts/StatePage.astro';
import FormStepper from '../../../components/FormStepper';
import DeadlineCalculator from '../../../components/DeadlineCalculator';
import PDFPreview from '../../../components/PDFPreview';
import CheckoutButton from '../../../components/CheckoutButton';

const state = 'michigan';
---

<StatePage title="Michigan Mechanics Lien Form | LienForm" ...>
  <FormStepper defaultState={state} onFormComplete={...} client:load />
  <DeadlineCalculator state={state} role="subcontractor" dateType="last-furnishing" client:load />
  <PDFPreview formData={null} state={state} client:load />
  <CheckoutButton state={state} role="" formData={null} price={24.99} productName="Michigan Lien Bundle" client:load />
</StatePage>
```

---

## Legal Notice

This tool generates form documents for informational purposes only. It does not constitute legal advice. Users should consult a licensed construction attorney in their state before filing any lien document.

---

## License

Proprietary — LienForm.com. All rights reserved.
