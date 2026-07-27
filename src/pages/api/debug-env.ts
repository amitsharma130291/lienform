// Temporary debug endpoint — DELETE BEFORE GOING LIVE
// Visit /api/debug-env to check which env vars are loaded
export const prerender = false;

export async function GET() {
  return new Response(
    JSON.stringify({
      DODO_API_KEY: process.env.DODO_API_KEY ? `SET (${process.env.DODO_API_KEY.substring(0, 8)}...)` : 'NOT SET',
      DODO_PRODUCT_ID: process.env.DODO_PRODUCT_ID || 'NOT SET',
      DODO_TEST_MODE: process.env.DODO_TEST_MODE || 'NOT SET',
      SITE_URL: process.env.SITE_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    }, null, 2),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
