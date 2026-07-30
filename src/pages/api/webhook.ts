export const prerender = false;

// ---------------------------------------------------------------------------
// Dodo Payments webhook handler
//
// Dodo uses the Standard Webhooks specification (standardwebhooks.com).
// Signature verification:
//   Header: webhook-signature  (e.g. "v1,<base64-HMAC>")
//   Header: webhook-id         (unique delivery ID)
//   Header: webhook-timestamp  (Unix seconds as string)
//   Signed content: "{webhook-id}.{webhook-timestamp}.{raw-body}"
//   HMAC: SHA-256 keyed with the base64-decoded webhook secret
//
// The secret is shown in the Dodo dashboard under:
//   Developers → Webhooks → [your endpoint] → Signing Secret
// Store it as DODO_WEBHOOK_SECRET in your Vercel environment variables.
// ---------------------------------------------------------------------------

async function verifyDodoSignature(
  rawBody: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
  secret: string
): Promise<boolean> {
  try {
    // Reject if timestamp is too old or in the future (±5 min)
    const ts = parseInt(webhookTimestamp, 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > 300) {
      console.warn('[webhook] Timestamp out of range', { ts, nowSec });
      return false;
    }

    // Build the signed content
    const toSign = `${webhookId}.${webhookTimestamp}.${rawBody}`;

    // Decode the base64 secret key
    const keyBytes = Uint8Array.from(atob(secret), c => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Compute HMAC
    const encoder = new TextEncoder();
    const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(toSign));
    const computedB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    // webhookSignature may contain multiple sigs: "v1,<b64> v1,<b64>"
    const signatures = webhookSignature.split(' ');
    for (const sig of signatures) {
      const [version, value] = sig.split(',');
      if (version === 'v1' && value === computedB64) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('[webhook] Signature verification error', err);
    return false;
  }
}

export async function POST({ request }: { request: Request }) {
  const webhookSecret = import.meta.env.DODO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Log but return 200 in dev so Dodo doesn't keep retrying
    console.warn('[webhook] DODO_WEBHOOK_SECRET not set — skipping verification');
  }

  // Read the raw body (needed for signature verification)
  const rawBody = await request.text();

  // Extract Standard Webhooks headers
  const webhookId = request.headers.get('webhook-id') || '';
  const webhookTimestamp = request.headers.get('webhook-timestamp') || '';
  const webhookSignature = request.headers.get('webhook-signature') || '';

  // Verify signature if the secret is configured
  if (webhookSecret) {
    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      console.warn('[webhook] Missing signature headers');
      return new Response('Missing signature headers', { status: 401 });
    }

    const valid = await verifyDodoSignature(
      rawBody,
      webhookId,
      webhookTimestamp,
      webhookSignature,
      webhookSecret
    );

    if (!valid) {
      console.warn('[webhook] Invalid signature');
      return new Response('Invalid signature', { status: 401 });
    }
  }

  // Parse the payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const eventType = payload.type as string | undefined;
  console.log('[webhook] Received event:', eventType, payload);

  // ---------------------------------------------------------------------------
  // Event routing
  // Common Dodo event types:
  //   payment.succeeded    — one-time payment completed
  //   payment.failed       — payment failed
  //   payment.processing   — payment is processing
  //   subscription.active  — new subscription activated
  //   subscription.renewed — subscription renewed
  //   refund.succeeded     — refund processed
  // ---------------------------------------------------------------------------
  switch (eventType) {
    case 'payment.succeeded': {
      // TODO (next pass): look up the customer's form data and email them their PDF.
      // The payment_id and customer email are in the payload:
      //   payload.data.payment_id
      //   payload.data.customer.email
      console.log('[webhook] Payment succeeded:', payload.data);
      break;
    }

    case 'payment.failed': {
      console.log('[webhook] Payment failed:', payload.data);
      break;
    }

    case 'refund.succeeded': {
      console.log('[webhook] Refund succeeded:', payload.data);
      break;
    }

    default: {
      console.log('[webhook] Unhandled event type:', eventType);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
