import { useState } from 'react';
import type { LienFormData } from './FormStepper';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutButtonProps {
  state: string;
  role: string;
  formData: LienFormData | null;
  price: number;
  productName: string;
}

interface UpsellItem {
  id: string;
  label: string;
  description: string;
  price: number;
}

const UPSELLS: UpsellItem[] = [
  {
    id: 'lien-waiver',
    label: 'Lien Waiver',
    description: 'Release your lien rights upon payment receipt.',
    price: 9.99,
  },
  {
    id: 'notice-of-intent',
    label: 'Notice of Intent to Lien',
    description: 'Pre-lien notice to prompt payment before filing.',
    price: 9.99,
  },
  {
    id: 'lien-release',
    label: 'Lien Release Form',
    description: 'Formally discharge a recorded lien from title.',
    price: 9.99,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckoutButton({
  state,
  role,
  formData,
  price,
  productName,
}: CheckoutButtonProps) {
  const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleUpsell = (id: string) => {
    setSelectedUpsells((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const upsellTotal = UPSELLS.filter((u) => selectedUpsells.includes(u.id)).reduce(
    (sum, u) => sum + u.price,
    0
  );
  const grandTotal = price + upsellTotal;

  const handleCheckout = async () => {
    if (!formData) return;
    setLoading(true);
    setError(null);

    try {
      const items = ['lien-bundle', ...selectedUpsells];
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, role, items }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const disabled = !formData || loading;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Main CTA */}
      <div className="p-6">
        <button
          onClick={handleCheckout}
          disabled={disabled}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-bold text-white transition-all ${
            disabled
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-navy-700 hover:bg-navy-800 shadow-md hover:shadow-lg active:scale-[0.99]'
          }`}
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Redirecting to checkout...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download PDF Bundle &mdash; ${grandTotal.toFixed(2)}
            </>
          )}
        </button>

        {!formData && (
          <p className="text-center text-xs text-slate-400 mt-2">
            Complete the form above to enable checkout.
          </p>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <p className="text-center text-xs text-slate-500 mt-3 flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-trust-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          No account required. Instant download after payment.
        </p>
      </div>

      {/* Upsells */}
      <div className="border-t border-slate-100 px-6 py-4 bg-slate-50">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
          Add to your bundle
        </p>
        <div className="space-y-2">
          {UPSELLS.map((upsell) => (
            <label
              key={upsell.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedUpsells.includes(upsell.id)
                  ? 'border-navy-300 bg-navy-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 rounded border-slate-300 text-navy-700 focus:ring-navy-600"
                checked={selectedUpsells.includes(upsell.id)}
                onChange={() => toggleUpsell(upsell.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{upsell.label}</span>
                  <span className="text-sm font-semibold text-navy-700 whitespace-nowrap">
                    +${upsell.price.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{upsell.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Trust signals */}
      <div className="border-t border-slate-100 px-6 py-4">
        <div className="flex items-center justify-around text-center">
          <div>
            <p className="text-[10px] font-bold text-slate-700">🔒 Secure</p>
            <p className="text-[10px] text-slate-400">256-bit SSL</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-700">⚡ Instant</p>
            <p className="text-[10px] text-slate-400">Immediate download</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-700">📋 State-specific</p>
            <p className="text-[10px] text-slate-400">Your jurisdiction</p>
          </div>
        </div>
      </div>
    </div>
  );
}
