export const prerender = false;

import type { APIRoute } from 'astro';

// ─── Stripe Webhook Handler ────────────────────────────────────────────────────
//
// Verifies the Stripe webhook signature and processes events.
// Currently logs events for audit purposes.
// Future: trigger PDF generation and email delivery on successful payment.
//
// IMPORTANT: This route receives raw POST bodies from Stripe servers.
// Astro 5+ has security.checkOrigin = true by default which BLOCKS
// cross-origin POSTs. If you upgrade to Astro 5, add:
//   security: { checkOrigin: false }
// to astro.config.mjs (safe for webhook-only endpoints).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a Stripe webhook signature using the raw body and secret.
 * Implements HMAC-SHA256 verification per Stripe docs.
 */
async function verifyStripeSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = signature.split(',').reduce(
      (acc, part) => {
        const [key, val] = part.split('=');
        if (key === 't') acc.timestamp = val;
        if (key === 'v1') acc.signatures.push(val);
        return acc;
      },
      { timestamp: '', signatures: [] as string[] }
    );

    if (!parts.timestamp || parts.signatures.length === 0) return false;

    // Check timestamp tolerance (5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(parts.timestamp)) > 300) {
      console.warn('Stripe webhook timestamp too old');
      return false;
    }

    const signedPayload = `${parts.timestamp}.${rawBody}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computedSig = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return parts.signatures.includes(computedSig);
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    const webhookSecret =
      import.meta.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      // In development, proceed without verification
      if (import.meta.env.PROD) {
        return new Response('Webhook secret not configured', { status: 500 });
      }
    }

    // Verify signature in production
    if (webhookSecret && signature) {
      const valid = await verifyStripeSignature(rawBody, signature, webhookSecret);
      if (!valid) {
        console.warn('Invalid Stripe webhook signature');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    // Parse event
    let event: {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    };

    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    console.log(`[Stripe Webhook] Event received: ${event.type} (id: ${event.id})`);

    // Handle events
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('[Stripe Webhook] Payment intent succeeded:', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
        });
        // TODO (Phase 2): Trigger PDF generation and send download email
        // await sendDownloadEmail(paymentIntent);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('[Stripe Webhook] Checkout session completed:', {
          id: session.id,
          amount_total: session.amount_total,
          customer_email: session.customer_email,
          metadata: session.metadata,
        });
        // TODO (Phase 2): Generate PDF bundle and deliver download link
        // await generateAndDeliverBundle(session);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        console.warn('[Stripe Webhook] Payment failed:', {
          id: pi.id,
          last_payment_error: (pi as Record<string, unknown>).last_payment_error,
        });
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Stripe Webhook] Error processing webhook:', err);
    return new Response('Internal server error', { status: 500 });
  }
};
