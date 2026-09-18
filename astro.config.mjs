import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'hybrid',
  adapter: vercel(),
  integrations: [tailwind(), react()],
  site: 'https://mechanicslienform.com',
  // Vercel normalizes HTML URLs; accept extension-bearing endpoints without a slash.
  trailingSlash: 'ignore',
  redirects: {
    '/20-day-preliminary-notice/california/': { status: 301, destination: '/preliminary-notice/california/' },
  },
});
