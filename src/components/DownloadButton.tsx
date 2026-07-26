import { useState } from 'react';
import { generateLienBundle } from './PDFGenerator';

interface DownloadButtonProps {
  state: string;
  role: string;
  formData: any;
  productName: string;
}

export default function DownloadButton({ state, role, formData, productName }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!formData) return;
    setLoading(true);
    try {
      const blob = await generateLienBundle({ ...formData, state, role, extras: [] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lien-bundle-${state}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleDownload}
        disabled={!formData || loading}
        className="w-full bg-navy-700 hover:bg-navy-800 disabled:bg-gray-300 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors"
      >
        {loading ? 'Generating PDF...' : `Download ${productName} — Free During Beta`}
      </button>
      <p className="text-center text-sm text-gray-500">
        Free during early access · No account required · Instant PDF
      </p>
    </div>
  );
}
