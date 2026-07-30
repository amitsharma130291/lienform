export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const { email, productName, pdfBase64, fileName } = await request.json();

    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const adminEmail = 'amitsharma00261@gmail.com';

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error('Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in Vercel env vars.');
      return new Response(JSON.stringify({ error: 'Email not configured' }), { status: 500 });
    }

    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Email to customer
    if (email) {
      try {
        await transporter.sendMail({
          from: `"MechanicsLienForm.com" <${GMAIL_USER}>`,
          to: email,
          subject: `Your ${productName} — Download Attached`,
          text: `Thank you for your purchase!\n\nYour ${productName} is attached to this email as a PDF.\n\nIf you have any questions, visit mechanicslienform.com/contact/\n\n— MechanicsLienForm Team`,
          attachments: [{ filename: fileName, content: pdfBuffer, contentType: 'application/pdf' }],
        });
      } catch (err) {
        console.error('Failed to send customer email:', err);
      }
    }

    // Silent admin copy — not mentioned to customer
    try {
      await transporter.sendMail({
        from: `"MechanicsLienForm.com" <${GMAIL_USER}>`,
        to: adminEmail,
        subject: `[LienForm Order] ${productName} — Customer: ${email || 'unknown'}`,
        text: `New order fulfilled.\n\nProduct: ${productName}\nCustomer email: ${email || 'not provided'}\n\nPDF attached.`,
        attachments: [{ filename: fileName, content: pdfBuffer, contentType: 'application/pdf' }],
      });
    } catch (err) {
      console.error('Failed to send admin copy:', err);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error('send-pdf-email error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
