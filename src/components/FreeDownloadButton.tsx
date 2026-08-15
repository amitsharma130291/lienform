import { useState } from 'react';
import { generateLienBundle } from './PDFGenerator';

interface FreeDownloadButtonProps {
  state: string;
  formData?: any;
  productName: string;
}

/**
 * Testing-only stand-in for DownloadButton while PAYMENTS_ENABLED is false
 * (src/config/features.ts). Generates the PDF bundle client-side and downloads
 * it directly — no checkout, no Dodo Payments call. Remove this component (and
 * flip the flag back) once QA on the form/PDF is done.
 */
export default function FreeDownloadButton({ state, formData, productName }: FreeDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    if (!formData) return;
    setLoading(true);
    setError('');
    try {
      const blob = await generateLienBundle({ ...formData, state, extras: [] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lien-bundle-${state || 'form'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (e) {
      console.error(e);
      setError('Something went wrong generating the PDF. Check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
        ⚠️ Testing mode — payment is disabled. This button downloads the bundle for free.
      </div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors"
      >
        {loading ? 'Generating PDF...' : `Free Download (Testing) — ${productName}`}
      </button>
      <p className="text-center text-sm text-gray-500">
        No account required · No payment · Instant download
      </p>
      {done && <p className="text-center text-sm text-green-600">✓ Downloaded — check your downloads folder.</p>}
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}
