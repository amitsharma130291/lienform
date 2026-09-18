# MechanicsLienForm SEO and content audit

Reviewed September 18, 2026. Base: `62e9d9e`. Scope: every existing public page, five new state guides, the built sitemap, internal links, structured data, indexing rules, and public product claims. This is a repository and rendered-build audit; it is not a Search Console or backlink audit.

## Five new pages

| Page | Distinct reader value | Paid promotion |
| --- | --- | --- |
| `/mechanics-lien/illinois/` | Residential subcontractor notice, claim notice, four-month third-party protection, and accelerated enforcement demands | Supported-state PDF bundle directory, $24.99; Illinois generator availability disclosed |
| `/mechanics-lien/new-york/` | Single-family classification, four/eight calendar months, owner and contractor service, proof filing, and extensions | Supported-state PDF bundle directory, $24.99; New York generator availability disclosed |
| `/mechanics-lien/florida/` | First versus last furnishing, Notice to Owner prerequisites, recording, owner service, and contests | Dedicated Florida Notice to Owner tool, $24.99; notice distinguished from a recorded claim |
| `/mechanics-lien/north-carolina/` | Current general $40,000 lien-agent threshold, receipt timing, tier/funds analysis, superior-court filing, and parallel 120/180-day clocks | Supported-state PDF bundle directory, $24.99; North Carolina generator availability disclosed |
| `/mechanics-lien/colorado/` | Ten-day notice lead time, claimant classification, verified statement, purchaser issues, and enforcement tasks | Supported-state PDF bundle directory, $24.99; Colorado generator availability disclosed |

Each page has a unique title, description, H1, production canonical, visible FAQs matching FAQ structured data, Article markup, working breadcrumbs, official sources, and contextual document links. The pages are substantive guides, not newly implemented state-specific mechanics lien generators. Florida's existing paid notice product is promoted directly. Purchases do not file or serve documents.

## Findings and fixes

| Finding | Fix |
| --- | --- |
| Two California preliminary-notice pages competed for substantially the same intent | Consolidated into `/preliminary-notice/california/`; configured a permanent 301 from the old twenty-day URL; updated internal links and sitemap |
| Homepage and state hub repeated general lien explanations and FAQs | Rewrote homepage around preparation, purchase, coverage, and delivery; rewrote hub around state discovery and tool availability |
| Hub claimed forms for all 50 states despite only seven mechanics lien generators | Removed the unsupported claim and coming-soon filler; centralized the twelve actual guides and seven supported lien tools |
| Stale 2024 titles and long search metadata | Removed stale years and shortened the affected California, Michigan, Texas, Florida notice, and preliminary-notice metadata |
| FAQ structured answers were hidden or differed from actual visible answers | Removed hidden FAQ markup on legacy pages; aligned Michigan FAQs; rebuilt preliminary-notice and Florida-notice FAQs from the same data as their visible answers |
| Breadcrumb parents pointed to absent notice/waiver hubs | Routed breadcrumbs to existing guide pages; checked visible links and schema destinations |
| Astro site host differed from the canonical host | Set `site` to `https://mechanicslienform.com`; used canonical production URLs without query strings; standardized trailing slashes |
| Astro's strict slash policy made `/sitemap.xml` and `/robots.txt` return 404 in the local HTTP check | Let Astro accept both URL forms and use Vercel's HTML-only slash normalization, which exempts file extensions |
| Order-success utility lacked noindex and declared success regardless of order status | Added `noindex,follow`, neutral metadata, and an order-status heading; kept it out of the sitemap; added a noindex 404 page |
| Preview copies needed indexing control and review access | Added host-conditioned Vercel `X-Robots-Tag` headers for preview/deployment hosts and permanent www consolidation; previews remain usable |
| Default Vercel output override conflicted with the adapter's Build Output API | Removed the `dist` override; retained framework-native adapter output |
| Unsupported Michigan amendment and competitor superiority claims | Removed invented amendment details, broad competitor claims, and unverified compliance guarantees |
| Waiver guide falsely said Texas, Florida, and Michigan lacked statutory forms | Replaced with accurate form-specific review guidance and official-source links |
| Notice-of-intent guide confused Georgia/Washington preliminary notices with universal prefiling demands | Rewrote around statutory versus optional notices and Colorado's actual notice lead time |
| Release guide presented sweeping deadlines, penalties, and a wrong Michigan bond multiplier | Removed the unsupported cross-state table; replaced it with instrument identification, scope, execution, filing, and contested-route review |
| Texas advertised monthly/retainage templates that are absent from the generator | Corrected product inclusions and monthly-notice descriptions; removed unsupported retainage instructions and stale county fee estimates |
| Michigan/California county fee estimates and a Washington case citation were unreliable | Removed the unverified fee tables/estimates, linked the Michigan official office directory, and corrected the Washington reference to the verified court docket |
| California claimed its generator automatically supplied the required statutory lien warning | Corrected the claim to require review of the draft's warning and service declaration; corrected direct-contractor lender notice guidance |
| Florida notice guidance said late notice automatically preserved future work | Removed the incorrect advice and replaced it with the statutory prerequisite and missed-period explanation |
| Florida notice math used last furnishing, checkout did not forward the document type, and the price map differed from the advertised price | Added a first-furnishing rule, separated state selection by product, forwarded the product type, and aligned the requested NTO amount to $24.99 |
| Florida output reused a recorded-lien instrument | Added a dedicated statutory-notice draft and separate service-planning checklist; verified normal and long-input PDF rendering |
| Privacy copy said project PDFs never left the device and analytics were absent | Described actual local storage, server email delivery/admin copy, Gmail, Dodo, Vercel, and Google Analytics behavior |

## Duplicate, thin, and scaled content decisions

The retired California article was the principal same-intent overlap. One primary URL now serves that intent. Homepage and hub retain their useful state directory, but their surrounding copy serves different purchase and navigation tasks. Shared navigation, product cards, and layout are normal reusable components; they are not treated as standalone articles.

The five guides have different legal triggers, offices, recipients, exceptions, and preparation tasks. They are not state-name substitutions of one generic article. Paid availability is explicit. No unsupported state generator or empty state landing page was added.

Short utility pages were evaluated by purpose. Contact supplies a working form and order-support instructions; privacy and terms describe the service. These do not need an arbitrary article-length target. The substantive reference guides were rewritten to answer concrete tasks and remove unsupported filler rather than padded to a word quota.

The automated audit compares five-word shingles in rendered main content, excluding paid-card and form-island boilerplate. A Jaccard score of 0.50 flags a pair for review. That threshold and the new-guide length check are editorial heuristics, not Google ranking rules. The highest pair and complete page inventory are recorded in `reports/seo-audit.json`. A low similarity score alone cannot establish quality, legal correctness, or immunity from a spam assessment.

Google's [spam policies](https://developers.google.com/search/docs/essentials/spam-policies) describe scaled content abuse in terms of producing pages primarily to manipulate rankings rather than help users. Its [generative-content guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) emphasizes accuracy, quality, and relevance. The changes use distinct reader tasks and primary references; no “10/10” ranking guarantee is claimed.

## Internal linking

All five pages are linked from the homepage and state directory, the central form guide, and relevant waiver/release/notice references. Existing Michigan, California, Georgia, Arizona, and Florida notice pages add relevant contextual discovery routes. Each guide links back to the hub, the preparation checklist, related document tasks, and selected states where a comparison explains a real procedural difference.

The rendered audit records incoming and outgoing links for each new guide. Every indexable page is reachable from homepage main-content links. Paid CTAs lead to real available tools; fragment targets are checked. This favors useful pathways over inserting every state link into every paragraph.

## Validation and practical limits

Run with Node 20, matching `package.json`:

```sh
npm ci
npm run build
npm run seo:audit
npm run test:products
npx tsc --noEmit
```

The audit covers all 24 sitemap pages, unique metadata, canonical URLs, one H1 per indexable page, internal URLs and fragments, schema breadcrumbs, visible FAQ parity, sitemap exclusions, configured California 301, new-guide discovery, paid promotion, and content similarity. Product regression checks first-furnishing dates, missing-date behavior, the existing Michigan clock, distinct Florida output, and long input.

Browser review checked all five guides at mobile width, the Illinois desktop geometry, and the Florida paid card. Sample Florida PDFs were rendered and visually reviewed, including overflow pages. Production changes still need deployment and a live crawl to confirm host headers, redirects, indexing, and actual checkout configuration. The Dodo dashboard can determine the final charged price; no paid transaction was performed during this audit.

No Search Console account, live traffic history, Google-selected canonical data, or sitewide Core Web Vitals data was available. Legal document sufficiency and every historical statute/case are not certified by this SEO audit. Generated drafts still require statutory/local review. After deployment, submit the sitemap and inspect the five URLs in Search Console; observe actual index coverage and query behavior.

Canonical consolidation follows Google's [canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls). FAQ markup is valid semantic markup; it does not promise eligibility for Google FAQ rich results.

## Final rendered results

24 indexable pages checked; **0 automated errors and 0 metadata warnings**. Build: passed with Node 20; generated server runtime: nodejs20.x. TypeScript and product regressions: passed. HTTP smoke check: passed for all 24 pages, California 301, 404/noindex, success noindex, sitemap, and robots.

| New guide | Editorial words | Contextual incoming pages | Internal outgoing destinations |
| --- | ---: | ---: | ---: |
| `/mechanics-lien/illinois/` | 935 | 9 | 8 |
| `/mechanics-lien/new-york/` | 1004 | 10 | 8 |
| `/mechanics-lien/florida/` | 942 | 7 | 9 |
| `/mechanics-lien/north-carolina/` | 967 | 9 | 8 |
| `/mechanics-lien/colorado/` | 1013 | 7 | 8 |

Counts use rendered main content and exclude shared paid-card/form boilerplate. Incoming counts exclude global navigation and footers. Word counts are descriptive, not ranking targets.

### Complete indexable page inventory

| URL | Search title | Editorial words |
| --- | --- | ---: |
| `/` | Mechanics Lien PDF Preparation Tools — $24.99 | 597 |
| `/mechanics-lien/` | Mechanics Lien State Guides & Available PDF Tools | 603 |
| `/mechanics-lien/arizona/` | Arizona Mechanics Lien Deadlines: 20-Day Notice, Filing & Service | 1572 |
| `/mechanics-lien/california/` | California Mechanics Lien Form & Completion Deadlines | 1552 |
| `/mechanics-lien/colorado/` | Colorado Mechanics Lien: 10-Day Notice & Filing Rules | 1013 |
| `/mechanics-lien/florida/` | Florida Mechanics Lien: 90-Day Filing & Owner Notices | 942 |
| `/mechanics-lien/georgia/` | Georgia Mechanics Lien: 90-Day Filing and 2-Day Service Rules | 1726 |
| `/mechanics-lien/illinois/` | Illinois Mechanics Lien: Notices & Four-Month Filing | 935 |
| `/mechanics-lien/michigan/` | Michigan Mechanics Lien Form & 90-Day Filing Rule | 2726 |
| `/mechanics-lien/new-york/` | New York Mechanics Lien: 4/8-Month Filing & Service | 1004 |
| `/mechanics-lien/north-carolina/` | North Carolina Mechanics Lien: 120/180-Day Deadlines | 967 |
| `/mechanics-lien/ohio/` | Ohio Mechanics Lien Deadlines: 60, 75 or 120 Days? | 1642 |
| `/mechanics-lien/texas/` | Texas Mechanics Lien Form & Monthly Notice Rules | 1337 |
| `/mechanics-lien/washington/` | Washington Mechanics Lien: 90-Day Filing and Notice Deadlines | 1501 |
| `/mechanics-lien/form/` | Mechanics Lien Form Guide: Requirements, Filing and Deadlines | 1837 |
| `/notice-to-owner/florida/` | Florida Notice to Owner Preparation Tool — $24.99 | 650 |
| `/preliminary-notice/california/` | California 20-Day Preliminary Notice: Service & Timing | 675 |
| `/lien-waiver/conditional/` | Conditional Lien Waiver: Payment, Scope & State Forms | 521 |
| `/notice-of-intent-to-lien/` | Notice of Intent to Lien: Required Notice or Payment Demand? | 560 |
| `/mechanics-lien/release/` | Mechanics Lien Release: Recorded Claim Discharge Checklist | 587 |
| `/about/` | About MechanicsLienForm — Tools, Coverage & Limits | 387 |
| `/contact/` | Contact LienForm | 123 |
| `/privacy-policy/` | Privacy Policy — MechanicsLienForm | 385 |
| `/terms-of-service/` | Terms of Service — LienForm | 290 |

### Highest content-overlap pairs

| Pages | Five-word Jaccard similarity |
| --- | ---: |
| `/` and `/mechanics-lien/` | 17.6% |
| `/mechanics-lien/illinois/` and `/mechanics-lien/north-carolina/` | 3.3% |
| `/mechanics-lien/florida/` and `/mechanics-lien/illinois/` | 3.1% |
| `/mechanics-lien/florida/` and `/mechanics-lien/north-carolina/` | 3.1% |
| `/mechanics-lien/colorado/` and `/mechanics-lien/illinois/` | 3.0% |

Shared state-directory cards explain the homepage/hub overlap. It is below the 50% automated review threshold and supports different page purposes. New state guide pairs are substantially more distinct. Human editorial review remains necessary.
