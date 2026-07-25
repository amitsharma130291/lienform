export const prerender = true;

export async function GET() {
  const pages = [
    { url: 'https://lienform.com/', priority: '1.0', changefreq: 'weekly' },
    { url: 'https://lienform.com/mechanics-lien/', priority: '0.9', changefreq: 'weekly' },
    { url: 'https://lienform.com/mechanics-lien/michigan/', priority: '0.8', changefreq: 'monthly' },
    { url: 'https://lienform.com/mechanics-lien/california/', priority: '0.8', changefreq: 'monthly' },
    { url: 'https://lienform.com/mechanics-lien/texas/', priority: '0.8', changefreq: 'monthly' },
    { url: 'https://lienform.com/notice-to-owner/florida/', priority: '0.8', changefreq: 'monthly' },
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
