interface PDFPreviewProps {
  formData: any;
  state: string;
}

export default function PDFPreview({ formData, state }: PDFPreviewProps) {
  if (!formData) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
        <p className="text-lg font-medium">Your lien document preview will appear here</p>
        <p className="text-sm mt-2">Fill in the form above to generate your free PDF bundle</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Document Preview</div>
      <div className="font-mono text-sm space-y-2 text-gray-700">
        <div className="font-bold text-center text-base mb-4">CLAIM OF MECHANICS LIEN</div>
        <div><span className="font-semibold">Claimant:</span> {formData.ownerName || '—'}</div>
        <div><span className="font-semibold">Property:</span> {formData.propertyAddress || '—'}</div>
        <div><span className="font-semibold">County:</span> {formData.county || '—'}</div>
        <div><span className="font-semibold">Amount:</span> ${formData.contractAmount || '—'}</div>
        <div className="pt-4 text-xs text-gray-400 text-center">Full bundle includes 5–6 pages</div>
      </div>
    </div>
  );
}
