import React, { useState } from 'react';
import type { LienFormData } from './PDFGenerator';

interface Props {
  formData: LienFormData;
  disabled?: boolean;
  state?: string;
  role?: string;
  productName?: string;
}

export default function DownloadButton({ formData, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Free beta: generate the PDF client-side ────────────────────────────────
  const handleFreeDownload = async () => {
    setLoading(true);
    setError('');
    try {
      const { generateLienBundle } = await import('./PDFGenerator');
      const blob = await generateLienBundle(formData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const state = formData.state || 'lien';
      const county = formData.county || '';
      a.download = `mechanics-lien-${state}${county ? `-${county}` : ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to generate PDF. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Paid: redirect to Dodo Payments hosted checkout ───────────────────────
  const handleBuyNow = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType: 'mechanics-lien' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Primary CTA: paid checkout */}
      <button
        onClick={handleBuyNow}
        disabled={disabled || loading}
        className="w-full bg-navy-700 hover:bg-navy-800 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#1e2f6e' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Redirecting to checkout…
          </span>
        ) : (
          'Buy Now — $24.99'
        )}
      </button>

      {/* Secondary CTA: free beta download */}
      <button
        onClick={handleFreeDownload}
        disabled={disabled || loading}
        className="w-full text-sm text-slate-500 underline mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue with free beta download
      </button>

      {error && (
        <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <p className="text-center text-xs text-slate-500">
        Secure payment via Dodo Payments · Instant PDF bundle after payment
      </p>
    </div>
  );
}
