// POST /api/checkout
// Creates a Dodo Payments checkout session and returns the redirect URL.

export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    // Read env vars inside the function (not at module level) so they're
    // always fresh from the Vercel runtime environment
    const DODO_API_KEY = process.env.DODO_API_KEY;
    const DODO_PRODUCT_ID = process.env.DODO_PRODUCT_ID;
    const DODO_TEST_MODE = process.env.DODO_TEST_MODE === 'true';
    const SITE_URL = process.env.SITE_URL || 'https://mechanicslienform.com';

    if (!DODO_API_KEY) {
      console.error('DODO_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Payment not configured', debug: 'missing DODO_API_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const DODO_BASE = DODO_TEST_MODE
      ? 'https://test.dodopayments.com'
      : 'https://live.dodopayments.com';

    const body = await request.json();

    // Encode form data as base64 to pass through the redirect URL
    const formDataEncoded = btoa(encodeURIComponent(JSON.stringify(body)));
    const successUrl = `${SITE_URL}/success?data=${formDataEncoded}`;
    const cancelUrl = `${SITE_URL}/mechanics-lien/`;

    const checkoutPayload = {
      product_cart: [
        {
          product_id: DODO_PRODUCT_ID,
          quantity: 1,
        },
      ],
      payment_link: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        state: body.state || '',
        role: body.role || '',
        county: body.county || '',
      },
    };

    console.log('Calling Dodo API:', DODO_BASE, 'test mode:', DODO_TEST_MODE);

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
    console.log('Dodo response body:', responseText);

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

    // Dodo returns checkout URL — try multiple possible field names
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
