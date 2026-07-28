import React, { useState } from 'react';
import type { LienFormData } from './PDFGenerator';

interface Props {
  formData: LienFormData;
  disabled?: boolean;
  state?: string;
  role?: string;
  productName?: string;
}

// ─── PAYMENT MODE TOGGLE ───────────────────────────────────────────────────
// true  = paid checkout via Dodo Payments ($19)
// false = free beta (direct PDF download, no payment)
const PAID_MODE = true;
// ──────────────────────────────────────────────────────────────────────────

export default function DownloadButton({ formData, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Free mode: generate PDF directly ──────────────────────────────────
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

  // ── Paid mode: redirect to Dodo checkout ──────────────────────────────
  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to create checkout session');
      }
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleClick = PAID_MODE ? handleCheckout : handleFreeDownload;

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className="w-full flex items-center justify-center gap-2 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
        style={{ backgroundColor: '#1e2f6e' }}
      >
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {PAID_MODE ? 'Redirecting to checkout…' : 'Generating your PDF…'}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {PAID_MODE ? 'Get My Lien Bundle — $19' : 'Download Free Lien Bundle →'}
          </>
        )}
      </button>

      {error && (
        <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <p className="text-center text-xs text-slate-500">
        {PAID_MODE
          ? 'Secure payment via Dodo Payments · Instant PDF download after payment'
          : 'Free during early access — no account or payment required'}
      </p>
    </div>
  );
}
