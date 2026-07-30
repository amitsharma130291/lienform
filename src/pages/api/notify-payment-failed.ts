export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const { customerEmail, paymentId, failureReason, pdfBase64, fileName, productName } = await request.json();

    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const adminEmail = 'amitsharma00261@gmail.com';

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error('Gmail not configured for failure notification');
      return new Response(JSON.stringify({ ok: false }), { status: 200 }); // 200 so UX isn't affected
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    const emailBody = [
      '[LienForm] Payment Failed',
      '',
      `Customer email: ${customerEmail || 'not captured'}`,
      `Payment ID: ${paymentId || 'unknown'}`,
      `Failure reason: ${failureReason || 'No reason provided by payment processor'}`,
      `Product: ${productName || 'unknown'}`,
      '',
      'The customer was shown a failure message and directed to /contact/ for support.',
    ].join('\n');

    const mailOptions: any = {
      from: `"MechanicsLienForm.com" <${GMAIL_USER}>`,
      to: adminEmail,
      subject: `[LienForm Payment Failed] Customer: ${customerEmail || 'unknown'} — ${failureReason || 'declined'}`,
      text: emailBody,
    };

    // Attach PDF if one was generated (edge case where PDF was ready before status check)
    if (pdfBase64 && fileName) {
      mailOptions.attachments = [{
        filename: fileName,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf',
      }];
    }

    await transporter.sendMail(mailOptions);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('notify-payment-failed error:', e);
    return new Response(JSON.stringify({ ok: false }), { status: 200 }); // never 500
  }
}
