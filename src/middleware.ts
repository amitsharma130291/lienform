import { defineMiddleware } from 'astro:middleware';

const CANONICAL_HOST = 'mechanicslienform.com';

export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.url.hostname.toLowerCase();

  // Consolidate alternate public hosts while preserving path and query parameters.
  if (host === `www.${CANONICAL_HOST}`) {
    const url = new URL(context.request.url);
    url.protocol = 'https:';
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  // Preview deployments remain reviewable, but cannot become alternate indexed copies.
  // vercel.json applies the same policy to prerendered HTML and static assets.
  if (host.endsWith('.vercel.app')) {
    const response = await next();
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  return next();
});
