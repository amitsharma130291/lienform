// POST /api/checkout
// Creates a Dodo Payments checkout session and returns the redirect URL.
// The form data is encoded in the success_url so we can regenerate the PDF
// after payment without storing anything server-side.

export const prerender = false;

const DODO_API_KEY = import.meta.env.DODO_API_KEY;
const DODO_PRODUCT_ID = import.meta.env.DODO_PRODUCT_ID;
const DODO_TEST_MODE = import.meta.env.DODO_TEST_MODE === 'true';
const BASE_URL = import.meta.env.BASE_URL || 'https://mechanicslienform.com';

const DODO_BASE = DODO_TEST_MODE
  ? 'https://test.dodopayments.com'
  : 'https://live.dodopayments.com';

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();

    // Encode form data as base64 to pass through the redirect URL
    const formDataEncoded = btoa(encodeURIComponent(JSON.stringify(body)));

    const successUrl = `${BASE_URL}/success?data=${formDataEncoded}`;
    const cancelUrl = `${BASE_URL}/mechanics-lien/`;

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

    const response = await fetch(`${DODO_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DODO_API_KEY}`,
      },
      body: JSON.stringify(checkoutPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dodo API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Payment session creation failed', details: errorText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await response.json();

    // Dodo returns a checkout URL in the response
    const checkoutUrl = session.url || session.payment_url || session.checkout_url;

    if (!checkoutUrl) {
      console.error('No checkout URL in Dodo response:', session);
      return new Response(
        JSON.stringify({ error: 'No checkout URL returned', session }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ url: checkoutUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
