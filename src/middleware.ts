import { defineMiddleware } from 'astro:middleware';

const CANONICAL_HOST = 'mechanicslienform.com';

export const onRequest = defineMiddleware((context, next) => {
  const host = context.request.headers.get('host') || '';
  const hostname = host.split(':')[0]; // strip port if present

  // Redirect any non-canonical host (vercel.app, www, etc.) to the real domain
  if (hostname !== CANONICAL_HOST && hostname !== `www.${CANONICAL_HOST}`) {
    const url = new URL(context.request.url);
    url.protocol = 'https:';
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  // Redirect www → non-www
  if (hostname === `www.${CANONICAL_HOST}`) {
    const url = new URL(context.request.url);
    url.protocol = 'https:';
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  return next();
});
