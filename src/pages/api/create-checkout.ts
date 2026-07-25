export const prerender = false;

import type { APIRoute } from 'astro';

// ─── Price Map ────────────────────────────────────────────────────────────────

const PRICES: Record<string, { amount: number; label: string }> = {
  'lien-bundle': { amount: 2499, label: 'Lien Document Bundle' },
  'nto-florida': { amount: 1499, label: 'Florida Notice to Owner Bundle' },
  'lien-waiver': { amount: 999, label: 'Lien Waiver Form' },
  'notice-of-intent': { amount: 999, label: 'Notice of Intent to Lien' },
  'lien-release': { amount: 999, label: 'Lien Release Form' },
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { state, role, items } = body as {
      state: string;
      role: string;
      items: string[];
    };

    if (!state || !role || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: state, role, items' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripeKey = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build line items
    const lineItems = items
      .filter((id) => PRICES[id])
      .map((id) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: PRICES[id].label,
            description: `State: ${state} | Role: ${role}`,
          },
          unit_amount: PRICES[id].amount,
        },
        quantity: 1,
      }));

    if (lineItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid items selected' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const origin = request.headers.get('origin') || 'https://lienform.com';
    const cancelState = state.toLowerCase().replace(/\s+/g, '-');

    // Create Stripe Checkout Session
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'payment',
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/mechanics-lien/${cancelState}/`,
        'payment_method_types[]': 'card',
        // Encode line items as Stripe form data
        ...Object.fromEntries(
          lineItems.flatMap((item, i) => [
            [`line_items[${i}][price_data][currency]`, item.price_data.currency],
            [`line_items[${i}][price_data][unit_amount]`, String(item.price_data.unit_amount)],
            [`line_items[${i}][price_data][product_data][name]`, item.price_data.product_data.name],
            [`line_items[${i}][price_data][product_data][description]`, item.price_data.product_data.description],
            [`line_items[${i}][quantity]`, String(item.quantity)],
          ])
        ),
        // Metadata for webhook processing
        'metadata[state]': state,
        'metadata[role]': role,
        'metadata[items]': items.join(','),
      }),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json();
      console.error('Stripe error:', err);
      return new Response(
        JSON.stringify({ error: err?.error?.message || 'Failed to create checkout session' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await stripeRes.json();
    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('create-checkout error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
