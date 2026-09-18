# MechanicsLienForm

Astro 4 hybrid site with React preparation tools, Tailwind CSS, browser-side jsPDF generation, Dodo hosted checkout, and Gmail email delivery. Production: https://mechanicslienform.com/.

## Coverage

Mechanics lien preparation tools: Arizona, California, Georgia, Michigan, Ohio, Texas, and Washington. Florida has a separate Notice to Owner tool. Illinois, New York, North Carolina, Colorado, and Florida mechanics lien pages are filing guides; they do not offer new state-specific lien generators. The directory and sitemap use src/data/sitePages.ts.

Documents are drafts for statutory and local review. Purchase does not record or serve a document, verify eligibility, or begin enforcement. Available preparation tools are advertised at $24.99; confirm Dodo dashboard configuration before release.

## Local development

Use Node 20, matching package.json. Install with npm ci and start with npm run dev. Copy .env.example to a local .env and configure Dodo and Gmail credentials; do not commit secrets. The active checkout uses DODO_API_KEY and DODO_PRODUCT_ID. Gmail delivery uses GMAIL_USER and GMAIL_APP_PASSWORD. BASE_URL is the production return origin.

## Validation

Run npm run build, npm run seo:audit, npm run test:products, and npx tsc --noEmit. With the local development server running, run node scripts/http-smoke.mjs http://127.0.0.1:4321 (use the actual port).

The Vercel adapter generates .vercel/output; no dist override is needed. Vercel normalizes HTML trailing slashes, marks preview hosts noindex, and consolidates www. Astro accepts extension-bearing sitemap and robots endpoints without a trailing slash. The retired twenty-day California article redirects permanently to the consolidated preliminary-notice guide.

## Audit

See SEO-AUDIT.md for findings, editorial decisions, scope, validation, and deployment checks. The machine-readable rendered audit is reports/seo-audit.json. Rebuild before regenerating it. PDF test samples stay in ignored .audit-tmp/. This SEO audit does not certify legal sufficiency or guarantee rankings.

## License

Proprietary. All rights reserved.
