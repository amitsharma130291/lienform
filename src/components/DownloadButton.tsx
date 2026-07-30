import { useState } from 'react';

interface DownloadButtonProps {
  state: string;
  productName: string;
  productType?: string;
  formData?: any;
}

export default function DownloadButton({ state, productName, productType = 'mechanics-lien', formData }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBuyNow = async () => {
    setLoading(true);
    setError('');
    try {
      const email = formData?.email || '';
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Could not start checkout. Please try again.');
      }
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleBuyNow}
        disabled={loading}
        className="w-full bg-navy-700 hover:bg-navy-800 disabled:bg-gray-400 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors"
      >
        {loading ? 'Redirecting to checkout...' : `Download ${productName} — $24.99`}
      </button>
      <p className="text-center text-sm text-gray-500">
        Secure checkout · No account required · Instant download after payment
      </p>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}
