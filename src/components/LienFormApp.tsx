import { useState, useRef, useEffect } from 'react';
import FormStepper from './FormStepper';
import DownloadButton from './DownloadButton';

interface LienFormAppProps {
  defaultState: string;
  documentType?: 'mechanics-lien' | 'notice-to-owner';
  productName: string;
  dateType?: 'last-furnishing' | 'first-furnishing';
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-2 py-1.5 border-b border-slate-50">
      <span className="text-slate-500 text-xs shrink-0">{label}</span>
      <span className={`text-right text-xs font-medium ${highlight ? 'text-green-700' : 'text-slate-800'}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function PreviewPanel({ formData }: { formData: any }) {
  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount?.replace(/,/g, '') || '0');
    if (isNaN(num)) return `$${amount}`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const toTitleCase = (str: string) =>
    str ? str.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';

  const normaliseCounty = (county: string) =>
    toTitleCase(county?.trim() || '').replace(/\s+County$/i, '').trim();

  const countyDisplay = `${normaliseCounty(formData.county)} County`;

  const STATE_LABELS: Record<string, string> = { michigan: 'Michigan', california: 'California', texas: 'Texas', florida: 'Florida' };
  const ROLE_LABELS: Record<string, string> = {
    'general-contractor': 'General Contractor', 'subcontractor': 'Subcontractor',
    'sub-subcontractor': 'Sub-Subcontractor', 'material-supplier': 'Material Supplier',
    'equipment-rental': 'Equipment Rental',
  };

  const projectType = formData.projectType ?? 'residential';
  const computeDeadline = () => {
    const last = new Date(formData.lastFurnishingDate);
    if (isNaN(last.getTime())) return null;
    if (formData.state === 'texas') {
      const d = new Date(last);
      d.setMonth(d.getMonth() + (formData.role === 'general-contractor' ? 4 : 3), 15);
      return d;
    }
    let days = formData.state === 'michigan' && projectType === 'commercial' ? 180 : 90;
    if (formData.state === 'florida') days = 45;
    const d = new Date(last);
    d.setDate(d.getDate() + days);
    return d;
  };
  const deadline = computeDeadline();
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
    : null;

  const isMichigan = formData.state === 'michigan';
  const isSubOrSupplier = ['subcontractor', 'sub-subcontractor', 'material-supplier', 'equipment-rental'].includes(formData.role);

  const bundleItems = [
    'Page 1: Mechanics Lien Claim + Notarization',
    'Page 2: Deadline Confirmation',
    'Page 3: County Filing Instructions',
    'Page 4: Proof of Service Affidavit',
    'Page 5: Lien Release Form',
    isMichigan && isSubOrSupplier ? 'Page 6: Notice of Furnishing (MCL 570.1109)' : null,
    !isMichigan && (formData.state === 'california' || formData.state === 'florida') && isSubOrSupplier
      ? `Page 6: ${formData.state === 'california' ? '20-Day Preliminary Notice' : 'Notice to Owner'}`
      : null,
  ].filter(Boolean);

  return (
    <div className="h-full flex flex-col">
      <div className="rounded-t-xl p-4 text-white text-center" style={{ backgroundColor: '#1e2f6e' }}>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Document Preview</p>
        <h3 className="text-lg font-bold">
          {formData.state === 'florida' && formData.role !== 'general-contractor' ? 'Notice to Owner' : 'Claim of Mechanics Lien'}
        </h3>
        <p className="text-sm opacity-80">{STATE_LABELS[formData.state] || toTitleCase(formData.state)} — {countyDisplay}</p>
      </div>

      <div className="flex-1 bg-white border border-t-0 border-slate-200 rounded-b-xl overflow-y-auto p-5 space-y-4 text-sm">
        {deadline && daysLeft !== null && (
          <div className={`rounded-lg px-4 py-3 text-center font-semibold text-sm ${daysLeft < 0 ? 'bg-red-100 text-red-700' : daysLeft <= 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
            {daysLeft < 0
              ? `⚠ Deadline passed ${Math.abs(daysLeft)} days ago`
              : daysLeft === 0 ? '⚠ Deadline is TODAY'
              : `✓ File by ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${daysLeft} days`}
          </div>
        )}

        <div className="space-y-1">
          <Row label="Claimant" value={formData.claimantName} />
          {formData.claimantAddress && <Row label="Address" value={formData.claimantAddress} />}
          <Row label="Role" value={ROLE_LABELS[formData.role] || formData.role} />
          <Row label="Property Owner" value={formData.ownerName} />
          <Row label="Property" value={formData.propertyAddress} />
          <Row label="County" value={countyDisplay} />
          {formData.state === 'michigan' && <Row label="Project Type" value={`${toTitleCase(projectType)} (${projectType === 'commercial' ? '180' : '90'}-day deadline)`} />}
          <Row label="Amount Claimed" value={formatCurrency(formData.contractAmount)} highlight />
          <Row label="Last Furnishing" value={formData.lastFurnishingDate} />
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 font-medium mb-2">Bundle ({bundleItems.length} pages):</p>
          <ul className="space-y-1">
            {bundleItems.map((item) => (
              <li key={item as string} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="text-green-500 shrink-0">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-400 italic">Not legal advice. Sign before a notary before filing. Consult a licensed attorney for your specific situation.</p>
      </div>
    </div>
  );
}

export default function LienFormApp({ defaultState, documentType = 'mechanics-lien', productName }: LienFormAppProps) {
  const [formData, setFormData] = useState<any>(null);
  const [role, setRole] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFormComplete = (data: any) => {
    setFormData(data);
    setRole(data.role || '');
  };

  useEffect(() => {
    if (formData && previewRef.current && window.innerWidth < 768) {
      previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [formData]);

  return (
    <div className="w-full">
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div>
          <FormStepper defaultState={defaultState} documentType={documentType} onFormComplete={handleFormComplete} />
        </div>
        <div ref={previewRef} className="md:sticky md:top-24">
          {formData ? (
            <div className="space-y-4">
              <PreviewPanel formData={formData} />
              <DownloadButton state={defaultState} role={role} formData={formData} productName={productName} />
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
