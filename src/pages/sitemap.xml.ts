import { SITE_URL, indexablePaths } from '../data/sitePages';
export const prerender = true;
export async function GET() {
 const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + indexablePaths.map(p => '<url><loc>' + SITE_URL + p + '</loc></url>').join('') + '</urlset>';
 return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}