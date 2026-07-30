export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;
    const pageUrl = formData.get('page_url') as string;

    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Email not configured' }), { status: 500 });
    }

    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    const emailBody = `New contact form submission from MechanicsLienForm.com\n\nName: ${name}\nEmail: ${email}\nPage URL: ${pageUrl}\n\nMessage:\n${message}\n\n---\nSent from mechanicslienform.com contact form`;

    await transporter.sendMail({
      from: `"MechanicsLienForm Contact" <${GMAIL_USER}>`,
      to: 'amitsharma00261@gmail.com',
      replyTo: email,
      subject: `LienForm Contact: ${name}`,
      text: emailBody,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error('contact form error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
