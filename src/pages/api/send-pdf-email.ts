export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const { email, productName, pdfBase64, fileName } = await request.json();

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email not configured' }), { status: 500 });
    }

    const adminEmail = 'amitsharma00261@gmail.com';

    // Send to customer
    const customerRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'LienForm <onboarding@resend.dev>',
        to: [email],
        subject: `Your ${productName} — Download Attached`,
        text: `Thank you for your purchase!\n\nYour ${productName} is attached to this email as a PDF.\n\nIf you have any questions, visit mechanicslienform.com/contact/\n\n— LienForm Team`,
        attachments: [{ filename: fileName, content: pdfBase64 }],
      }),
    });

    // Silent admin copy for order tracking (not mentioned to customer)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'LienForm <onboarding@resend.dev>',
        to: [adminEmail],
        subject: `[LienForm Order] ${productName} — Customer: ${email}`,
        text: `New order fulfilled.\n\nProduct: ${productName}\nCustomer email: ${email}\n\nPDF attached.`,
        attachments: [{ filename: fileName, content: pdfBase64 }],
      }),
    });

    if (!customerRes.ok) {
      const errBody = await customerRes.text();
      console.error('Resend failed:', customerRes.status, errBody);
      return new Response(JSON.stringify({ error: 'Failed to send email', detail: errBody }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
