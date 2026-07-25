import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  output: 'hybrid',
  integrations: [tailwind(), react()],
  site: 'https://lienform.com',
  // Astro 4: security.checkOrigin is not enabled by default for hybrid output
  // Stripe webhooks require cross-origin POSTs — add security: { checkOrigin: false }
  // on the webhook endpoint if issues arise post-deploy
});
