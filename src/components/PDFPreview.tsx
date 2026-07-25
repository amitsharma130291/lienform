import type { LienFormData } from './FormStepper';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PDFPreviewProps {
  formData: LienFormData | null;
  state: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonLine({ width = 'full' }: { width?: string }) {
  return (
    <div
      className={`h-3 bg-slate-200 rounded animate-pulse`}
      style={{ width: width === 'full' ? '100%' : width }}
    />
  );
}

function PlaceholderSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="text-center space-y-2 pb-4 border-b border-slate-100">
        <SkeletonLine width="60%" />
        <SkeletonLine width="40%" />
        <SkeletonLine width="50%" />
      </div>
      <div className="space-y-2">
        <SkeletonLine width="30%" />
        <SkeletonLine />
        <SkeletonLine width="80%" />
      </div>
      <div className="space-y-2">
        <SkeletonLine width="25%" />
        <SkeletonLine />
        <SkeletonLine width="70%" />
      </div>
      <div className="space-y-2">
        <SkeletonLine width="35%" />
        <SkeletonLine />
        <SkeletonLine />
        <SkeletonLine width="90%" />
      </div>
      <div className="flex justify-between">
        <SkeletonLine width="40%" />
        <SkeletonLine width="25%" />
      </div>
    </div>
  );
}

// ─── Document Preview ─────────────────────────────────────────────────────────

function stateCitation(state: string): string {
  const citations: Record<string, string> = {
    michigan: 'Pursuant to MCL 570.1101–570.1305 (Michigan Construction Lien Act, as amended 2023)',
    california: 'Pursuant to California Civil Code §8000–9566 (SB 189, effective July 1, 2012)',
    texas: 'Pursuant to Texas Property Code Chapter 53 (as amended by HB 2237, eff. Jan. 1, 2022)',
    florida: 'Pursuant to Florida Statute §713.06',
  };
  return citations[state] || 'Pursuant to applicable state construction lien statutes';
}

function stateTitle(state: string, role: string): string {
  if (state === 'florida' && role !== 'general-contractor') {
    return 'NOTICE TO OWNER';
  }
  return 'CLAIM OF MECHANICS LIEN';
}

function formatCurrency(amount: string): string {
  const num = parseFloat(amount.replace(/,/g, ''));
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    'general-contractor': 'General Contractor',
    'subcontractor': 'Subcontractor',
    'sub-subcontractor': 'Sub-Subcontractor',
    'material-supplier': 'Material Supplier',
    'equipment-rental': 'Equipment Rental Company',
  };
  return labels[role] || role;
}

function DocumentContent({ formData }: { formData: LienFormData }) {
  return (
    <div className="font-mono text-xs text-slate-800 space-y-4 p-6">
      {/* Header */}
      <div className="text-center space-y-1 pb-4 border-b-2 border-slate-300">
        <p className="text-[10px] text-slate-500 leading-tight">{stateCitation(formData.state)}</p>
        <h2 className="text-sm font-bold tracking-widest mt-2">
          {stateTitle(formData.state, formData.role)}
        </h2>
        <p className="text-[10px] text-slate-500">
          State of {formData.state.charAt(0).toUpperCase() + formData.state.slice(1).replace(/-/g, ' ')} —{' '}
          {formData.county} County
        </p>
      </div>

      {/* Claimant */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Claimant</p>
        <p className="font-semibold">[Your Name / Company Name]</p>
        <p className="text-slate-600">Role: {roleLabel(formData.role)}</p>
        <p className="text-slate-600">Email: {formData.email}</p>
      </div>

      {/* Owner */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Property Owner</p>
        <p className="font-semibold">{formData.ownerName}</p>
      </div>

      {/* Property */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Property Subject to Lien</p>
        <p>{formData.propertyAddress}</p>
        <p className="text-slate-600 mt-0.5">County: {formData.county}</p>
      </div>

      {/* Contract */}
      {formData.gcName && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">General Contractor</p>
          <p>{formData.gcName}</p>
        </div>
      )}

      {/* Amount */}
      <div className="border-t border-slate-200 pt-3">
        <div className="flex justify-between items-center">
          <span className="font-bold">Amount claimed:</span>
          <span className="font-bold text-sm">{formatCurrency(formData.contractAmount)}</span>
        </div>
        <div className="flex justify-between text-slate-500 text-[10px] mt-1">
          <span>First furnishing: {formData.firstFurnishingDate}</span>
          <span>Last furnishing: {formData.lastFurnishingDate}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PDFPreview({ formData, state }: PDFPreviewProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Document Preview</h3>
          <p className="text-xs text-slate-400 mt-0.5">Page 1 of 6</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          PDF
        </div>
      </div>

      {/* Document area */}
      <div className="relative bg-slate-50 min-h-[360px]">
        {/* A4-ish paper */}
        <div className="mx-4 my-4 bg-white border border-slate-200 shadow-sm rounded min-h-[340px] overflow-hidden">
          {!formData ? (
            <div>
              <PlaceholderSkeleton />
            </div>
          ) : (
            <DocumentContent formData={formData} />
          )}
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-5 py-3 shadow-lg text-center pointer-events-auto">
            <p className="text-sm font-semibold text-slate-800">
              🔒 PREVIEW — Purchase to download complete bundle
            </p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              6-page bundle includes filing instructions, affidavit &amp; lien release
            </p>
            <p className="text-lg font-bold text-navy-700 mt-1">$24.99</p>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      {!formData && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-xs text-slate-400">Complete the form above to see your document preview</p>
        </div>
      )}
    </div>
  );
}
