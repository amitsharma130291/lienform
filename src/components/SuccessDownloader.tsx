import { useEffect, useState } from 'react';
import { generateLienBundle } from './PDFGenerator';

export default function SuccessDownloader() {
  const [status, setStatus] = useState<'loading' | 'sent' | 'downloaded' | 'payment_failed' | 'error'>('loading');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const email = params.get('email') || '';
        setUserEmail(email);

        // Check Dodo's actual payment status before proceeding
        const paymentStatus = params.get('status');
        if (paymentStatus && paymentStatus !== 'succeeded') {
          setStatus('payment_failed');
          return;
        }

        const stored = localStorage.getItem('lienform_pending_order');
        if (!stored) { setStatus('error'); return; }

        const order = JSON.parse(stored);
        const { state, role, productName, formData } = order;

        const blob = await generateLienBundle({ ...formData, state, role, extras: [] });

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];

          // ALWAYS download first — independent of email
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `lien-bundle-${state || 'form'}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          localStorage.removeItem('lienform_pending_order');

          // Email is best-effort — never blocks download
          try {
            const res = await fetch('/api/send-pdf-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email,
                productName,
                pdfBase64: base64,
                fileName: `lien-bundle-${state || 'form'}.pdf`,
              }),
            });
            if (res.ok && email) {
              setStatus('sent');  // downloaded + emailed
            } else {
              setStatus('downloaded');  // downloaded only
            }
          } catch {
            setStatus('downloaded');  // downloaded only (email network error)
          }
        };
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    };
    run();
  }, []);

  if (status === 'loading') return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800">
      <p className="font-medium">Preparing your documents...</p>
      <p className="text-sm mt-1">Generating and sending your PDF bundle. This takes a few seconds.</p>
    </div>
  );

  if (status === 'sent') return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
      <p className="font-medium">✓ Download started!</p>
      <p className="text-sm mt-1">Your PDF has downloaded and a copy has been sent to {userEmail}. Check your inbox (and spam folder).</p>
    </div>
  );

  if (status === 'downloaded') return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
      <p className="font-medium">✓ Download started!</p>
      <p className="text-sm mt-1">Your PDF bundle is downloading now. If it didn't start automatically, <a href="/contact/" className="underline">contact us</a> and we'll send it manually.</p>
    </div>
  );

  if (status === 'payment_failed') return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
      <p className="font-medium">Payment was not completed.</p>
      <p className="text-sm mt-1">Your payment did not go through. No charge was made. Please try again or <a href="/contact/" className="underline">contact us</a> if you need help.</p>
      <a href="/" className="inline-block mt-3 text-navy-700 underline text-sm font-medium">← Try again</a>
    </div>
  );

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
      <p className="font-medium">Something went wrong generating your PDF.</p>
      <p className="text-sm mt-1">Your payment was processed. Please contact us and we'll send your document manually.</p>
      <a href="/contact/" className="text-red-700 underline text-sm">Contact Support →</a>
    </div>
  );
}
