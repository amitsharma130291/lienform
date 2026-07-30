export const prerender = false;

// Pricing map — amounts in cents (USD)
const priceMap: Record<string, number> = {
  'mechanics-lien': 2499,    // $24.99
  'lien-release': 1499,      // $14.99
  'lien-waiver': 999,        // $9.99
  'notice-to-owner': 1499,   // $14.99
  'preliminary-notice': 1499, // $14.99
  'notice-of-intent': 999,   // $9.99
};

// Dodo Payments uses test.dodopayments.com in test mode
// and live.dodopayments.com in live mode.
// The test key provided starts with "6w9u..." which is a test key.
const DODO_BASE_URL = 'https://test.dodopayments.com';

export async function POST({ request }: { request: Request }) {
  const apiKey = import.meta.env.DODO_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Payment not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let productType: string;
  try {
    const body = await request.json();
    productType = body.productType || 'mechanics-lien';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const amountCents = priceMap[productType] ?? priceMap['mechanics-lien'];
  const productId = import.meta.env.DODO_PRODUCT_ID || 'pdt_0Nk4mkyzkQM33OI9ZL9La';

  // Construct the return / cancel URLs.
  // BASE_URL should be set to your deployed domain (e.g. https://mechanicslienform.com).
  const baseUrl = import.meta.env.BASE_URL || 'https://mechanicslienform.com';
  const returnUrl = `${baseUrl}/success/`;
  const cancelUrl = `${baseUrl}/`;

  try {
    // POST https://test.dodopayments.com/checkouts
    // Auth: Bearer <api_key>
    // Body: { product_cart: [{ product_id, quantity, amount }], return_url, cancel_url, metadata }
    //
    // NOTE: The `amount` field is only honoured when the product has
    // "Pay What You Want" enabled in the Dodo dashboard.  If your product has
    // a fixed price, Dodo ignores `amount` and charges the dashboard price.
    // To charge different prices per product type you either:
    //   (a) enable PWYW on the product, OR
    //   (b) create a separate product per document type in the Dodo dashboard
    //       and supply the matching product_id here.
    const payload = {
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
          amount: amountCents, // honoured only if PWYW is enabled
        },
      ],
      return_url: returnUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: productType,
        amount_cents: amountCents,
      },
    };

    const res = await fetch(`${DODO_BASE_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[create-checkout] Dodo API error', res.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session', detail: errText }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Response shape: { session_id: string, checkout_url: string | null }
    const session = await res.json() as { session_id: string; checkout_url?: string | null };

    if (!session.checkout_url) {
      console.error('[create-checkout] No checkout_url in Dodo response', session);
      return new Response(
        JSON.stringify({ error: 'No checkout URL returned from Dodo' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ url: session.checkout_url, session_id: session.session_id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[create-checkout] Unexpected error', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
