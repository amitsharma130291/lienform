// POST /api/checkout
// Creates a Dodo Payments checkout session and returns the redirect URL.
// In TEST_BYPASS mode, skips Dodo and redirects directly to /success.

export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const DODO_API_KEY = process.env.DODO_API_KEY;
    const DODO_PRODUCT_ID = process.env.DODO_PRODUCT_ID;
    const DODO_TEST_MODE = process.env.DODO_TEST_MODE === 'true';
    const SITE_URL = process.env.SITE_URL || 'https://mechanicslienform.com';

    const body = await request.json();

    // Encode form data as base64 to pass through the redirect URL
    const formDataEncoded = btoa(encodeURIComponent(JSON.stringify(body)));
    const successUrl = `${SITE_URL}/success?data=${formDataEncoded}`;

    // ── TEST BYPASS ────────────────────────────────────────────────────────
    // When Dodo card payments aren't yet activated, skip checkout and
    // go straight to /success so we can verify the PDF generation flow.
    // REMOVE this block before going live.
    if (DODO_TEST_MODE) {
      console.log('TEST BYPASS: skipping Dodo checkout, redirecting to success');
      return new Response(
        JSON.stringify({ url: successUrl }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // ── END TEST BYPASS ────────────────────────────────────────────────────

    if (!DODO_API_KEY) {
      console.error('DODO_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Payment not configured', debug: 'missing DODO_API_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const DODO_BASE = 'https://live.dodopayments.com';
    const cancelUrl = `${SITE_URL}/mechanics-lien/`;

    const checkoutPayload = {
      product_cart: [{ product_id: DODO_PRODUCT_ID, quantity: 1 }],
      payment_link: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        state: body.state || '',
        role: body.role || '',
        county: body.county || '',
      },
    };

    console.log('Calling Dodo live API');

    const response = await fetch(`${DODO_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DODO_API_KEY}`,
      },
      body: JSON.stringify(checkoutPayload),
    });

    const responseText = await response.text();
    console.log('Dodo response status:', response.status);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: 'Payment session creation failed',
          status: response.status,
          details: responseText,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let session: any;
    try {
      session = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON from Dodo', raw: responseText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const checkoutUrl =
      session.url ||
      session.payment_url ||
      session.checkout_url ||
      session.link ||
      session.redirect_url;

    if (!checkoutUrl) {
      return new Response(
        JSON.stringify({ error: 'No checkout URL in response', session }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ url: checkoutUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Checkout error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
