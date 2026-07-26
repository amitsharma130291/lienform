export const prerender = true;

export async function GET(context: { request: Request }) {
  const host = new URL(context.request.url).hostname;
  const isCanonical = host === 'mechanicslienform.com';

  // Block indexing on Vercel preview / non-canonical domains
  const body = isCanonical
    ? `User-agent: *\nAllow: /\n\nSitemap: https://mechanicslienform.com/sitemap.xml`
    : `User-agent: *\nDisallow: /`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' }
  });
}
