import { useState, useRef, useEffect } from 'react';
import FormStepper from './FormStepper';
import DownloadButton from './DownloadButton';

interface LienFormAppProps {
  defaultState: string;
  documentType?: 'mechanics-lien' | 'notice-to-owner';
  productName: string;
  dateType?: 'last-furnishing' | 'first-furnishing';
}

// Inline preview panel — shows key fields from the submitted form
function PreviewPanel({ formData }: { formData: any }) {
  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount?.replace(/,/g, '') || '0');
    if (isNaN(num)) return `$${amount}`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const toTitleCase = (str: string) =>
    str ? str.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';

  const normaliseCounty = (county: string) => {
    const tc = toTitleCase(county?.trim() || '');
    return tc.replace(/\s+County$/i, '').trim();
  };

  const countyDisplay = `${normaliseCounty(formData.county)} County`;

  const STATE_LABELS: Record<string, string> = {
    michigan: 'Michigan',
    california: 'California',
    texas: 'Texas',
    florida: 'Florida',
  };

  const ROLE_LABELS: Record<string, string> = {
    'general-contractor': 'General Contractor',
    'subcontractor': 'Subcontractor',
    'sub-subcontractor': 'Sub-Subcontractor',
    'material-supplier': 'Material Supplier',
    'equipment-rental': 'Equipment Rental',
  };

  const deadlineMap: Record<string, number> = { michigan: 90, california: 90, florida: 45 };
  const computeDeadline = () => {
    const last = new Date(formData.lastFurnishingDate);
    if (isNaN(last.getTime())) return null;
    if (formData.state === 'texas') {
      const d = new Date(last);
      d.setMonth(d.getMonth() + (formData.role === 'general-contractor' ? 4 : 3), 15);
      return d;
    }
    const days = deadlineMap[formData.state] ?? 90;
    const d = new Date(last);
    d.setDate(d.getDate() + days);
    return d;
  };
  const deadline = computeDeadline();
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
    : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="rounded-t-xl p-4 text-white text-center" style={{ backgroundColor: '#1e2f6e' }}>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Document Preview</p>
        <h3 className="text-lg font-bold">
          {formData.state === 'florida' && formData.role !== 'general-contractor'
            ? 'Notice to Owner'
            : 'Claim of Mechanics Lien'}
        </h3>
        <p className="text-sm opacity-80">{STATE_LABELS[formData.state] || toTitleCase(formData.state)} — {countyDisplay}</p>
      </div>

      {/* Preview content */}
      <div className="flex-1 bg-white border border-t-0 border-slate-200 rounded-b-xl overflow-y-auto p-5 space-y-4 text-sm">

        {/* Deadline banner */}
        {deadline && daysLeft !== null && (
          <div
            className={`rounded-lg px-4 py-3 text-center font-semibold ${
              daysLeft < 0
                ? 'bg-red-100 text-red-700'
                : daysLeft <= 30
                ? 'bg-orange-100 text-orange-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {daysLeft < 0
              ? `⚠ Deadline passed ${Math.abs(daysLeft)} days ago`
              : daysLeft === 0
              ? '⚠ Deadline is TODAY'
              : `✓ File by ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${daysLeft} days remaining`}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-3">
          <Row label="Claimant" value={formData.claimantName} />
          <Row label="Role" value={ROLE_LABELS[formData.role] || formData.role} />
          <Row label="Property Owner" value={formData.ownerName} />
          <Row label="Property Address" value={formData.propertyAddress} />
          <Row label="County" value={countyDisplay} />
          <Row label="Amount Claimed" value={formatCurrency(formData.contractAmount)} highlight />
          <Row label="First Furnishing" value={formData.firstFurnishingDate} />
          <Row label="Last Furnishing" value={formData.lastFurnishingDate} />
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 font-medium mb-2">Bundle includes (6 pages):</p>
          <ul className="space-y-1 text-xs text-slate-600">
            {[
              'Mechanics Lien Claim',
              'Deadline Confirmation',
              'County Filing Instructions',
              'Proof of Service Affidavit',
              'Lien Release Form',
              formData.state === 'california' || formData.state === 'florida'
                ? 'Preliminary Notice / NTO'
                : null,
            ]
              .filter(Boolean)
              .map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> {item}
                </li>
              ))}
          </ul>
        </div>

        <p className="text-xs text-slate-400 italic">
          Not legal advice. Consult a licensed attorney in your state.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-2 py-1.5 border-b border-slate-50">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-right font-medium ${highlight ? 'text-green-700' : 'text-slate-800'}`}>
        {value || '—'}
      </span>
    </div>
  );
}

export default function LienFormApp({
  defaultState,
  documentType = 'mechanics-lien',
  productName,
}: LienFormAppProps) {
  const [formData, setFormData] = useState<any>(null);
  const [role, setRole] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFormComplete = (data: any) => {
    setFormData(data);
    setRole(data.role || '');
  };

  // On mobile: scroll preview into view when form completes
  useEffect(() => {
    if (formData && previewRef.current) {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [formData]);

  return (
    <div className="w-full">
      {/* Side-by-side layout on desktop, stacked on mobile */}
      <div className="grid md:grid-cols-2 gap-6 items-start">

        {/* LEFT: Form */}
        <div>
          <FormStepper
            defaultState={defaultState}
            documentType={documentType}
            onFormComplete={handleFormComplete}
          />
        </div>

        {/* RIGHT: Preview + Download */}
        <div ref={previewRef} className="md:sticky md:top-24">
          {formData ? (
            <div className="space-y-4">
              <PreviewPanel formData={formData} />
              <DownloadButton
                state={defaultState}
                role={role}
                formData={formData}
                productName={productName}
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400 bg-slate-50">
              <div className="text-4xl mb-3">📄</div>
              <p className="font-semibold text-slate-500 mb-1">Your preview will appear here</p>
              <p className="text-sm">Complete the form steps on the left to generate your lien document.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
