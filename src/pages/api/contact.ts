export const prerender = false;

export async function POST({ request }: { request: Request }) {
  try {
    const data = await request.formData();
    const name = (data.get('name') as string || '').trim();
    const email = (data.get('email') as string || '').trim();
    const message = (data.get('message') as string || '').trim();
    const pageUrl = (data.get('page_url') as string || '').trim();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      // Log but don't expose key absence to user
      console.error('RESEND_API_KEY not set');
      return new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 503 });
    }

    const body = [
      'New contact form submission — LienForm.com',
      '',
      `Name: ${name}`,
      `From email: ${email}`,
      `Page URL: ${pageUrl || 'not provided'}`,
      '',
      'Message:',
      message,
      '',
      '---',
      'Sent via lienform.com contact form',
    ].join('\n');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LienForm <onboarding@resend.dev>',
        to: ['amitsharma00261@gmail.com'],
        reply_to: email,
        subject: `LienForm Contact from ${name}`,
        text: body,
      }),
    });

    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return new Response(JSON.stringify({ error: 'Failed to send' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error('Contact API error:', e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
