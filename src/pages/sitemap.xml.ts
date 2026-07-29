export const prerender = true;

const DOMAIN = 'https://mechanicslienform.com';

export async function GET() {
  const pages = [
    { url: `${DOMAIN}/`, priority: '1.0', changefreq: 'weekly' },
    { url: `${DOMAIN}/mechanics-lien/`, priority: '0.9', changefreq: 'weekly' },
    { url: `${DOMAIN}/mechanics-lien/michigan/`, priority: '0.8', changefreq: 'monthly' },
    { url: `${DOMAIN}/mechanics-lien/california/`, priority: '0.8', changefreq: 'monthly' },
    { url: `${DOMAIN}/mechanics-lien/texas/`, priority: '0.8', changefreq: 'monthly' },
    { url: `${DOMAIN}/notice-to-owner/florida/`, priority: '0.8', changefreq: 'monthly' },
    { url: `${DOMAIN}/about/`, priority: '0.5', changefreq: 'monthly' },
    { url: `${DOMAIN}/contact/`, priority: '0.5', changefreq: 'monthly' },
    { url: `${DOMAIN}/privacy-policy/`, priority: '0.3', changefreq: 'yearly' },
    { url: `${DOMAIN}/terms-of-service/`, priority: '0.3', changefreq: 'yearly' },
    { url: 'https://mechanicslienform.com/mechanics-lien/release/', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://mechanicslienform.com/preliminary-notice/california/', priority: '0.8', changefreq: 'monthly' },
    { url: 'https://mechanicslienform.com/20-day-preliminary-notice/california/', priority: '0.8', changefreq: 'monthly' },
    { url: 'https://mechanicslienform.com/lien-waiver/conditional/', priority: '0.7', changefreq: 'monthly' },
    { url: 'https://mechanicslienform.com/notice-of-intent-to-lien/', priority: '0.7', changefreq: 'monthly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
