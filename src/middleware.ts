import { defineMiddleware } from 'astro:middleware';

const CANONICAL_HOST = 'mechanicslienform.com';

export const onRequest = defineMiddleware((context, next) => {
  const host = (context.request.headers.get('host') || '').split(':')[0].toLowerCase();

  // Only intercept Vercel preview / deployment URLs — never touch the canonical domain
  if (host.endsWith('.vercel.app')) {
    const url = new URL(context.request.url);
    url.protocol = 'https:';
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  return next();
});
