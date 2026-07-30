import { useEffect, useState } from 'react';
import { generateLienBundle } from './PDFGenerator';

export default function SuccessDownloader() {
  const [status, setStatus] = useState<'loading' | 'sent' | 'error'>('loading');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const email = params.get('email') || '';
        setUserEmail(email);

        const stored = localStorage.getItem('lienform_pending_order');
        if (!stored) { setStatus('error'); return; }

        const order = JSON.parse(stored);
        const { state, role, productName, formData } = order;

        const blob = await generateLienBundle({ ...formData, state, role, extras: [] });

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];

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

          if (res.ok) {
            setStatus('sent');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lien-bundle-${state || 'form'}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            localStorage.removeItem('lienform_pending_order');
          } else {
            setStatus('error');
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
      <p className="font-medium">✓ Your documents are ready!</p>
      <p className="text-sm mt-1">Your PDF bundle has downloaded automatically and been sent to {userEmail}. Check your inbox (and spam folder).</p>
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
