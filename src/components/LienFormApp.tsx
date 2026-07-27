import { useState, useRef, useEffect } from 'react';
import FormStepper from './FormStepper';
import DownloadButton from './DownloadButton';

interface LienFormAppProps {
  defaultState: string;
  documentType?: 'mechanics-lien' | 'notice-to-owner';
  productName: string;
  dateType?: 'last-furnishing' | 'first-furnishing';
}

function Row({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-2 py-1.5 border-b border-slate-50">
      <span className="text-slate-500 text-xs shrink-0">{label}</span>
      <span className={`text-right text-xs font-medium ${highlight ? 'text-green-700' : warn ? 'text-orange-600' : 'text-slate-800'}`}>
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
  const hasLegalDesc = !!formData.legalDescription?.trim();

  const bundleItems = [
    'Mechanics Lien Claim + Notarization',
    'Deadline Confirmation',
    'County Filing Instructions',
    'Proof of Service Affidavit',
    'Lien Release Form',
    isMichigan && isSubOrSupplier ? 'Notice of Furnishing (MCL 570.1109)' : null,
    !isMichigan && (formData.state === 'california' || formData.state === 'florida') && isSubOrSupplier
      ? (formData.state === 'california' ? '20-Day Preliminary Notice' : 'Notice to Owner')
      : null,
  ].filter(Boolean);

  // Readiness checklist
  const readiness = [
    { label: 'Claimant info', ok: !!formData.claimantName && !!formData.claimantAddress },
    { label: 'Owner info', ok: !!formData.ownerName },
    { label: 'Property address', ok: !!formData.propertyAddress },
    { label: 'Legal description', ok: hasLegalDesc, warn: !hasLegalDesc && isMichigan },
    { label: 'Deadline calculated', ok: !!deadline },
    { label: 'Amount entered', ok: !!formData.contractAmount },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="rounded-t-xl p-4 text-white text-center" style={{ backgroundColor: '#1e2f6e' }}>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Document Preview</p>
        <h3 className="text-lg font-bold">
          {formData.state === 'florida' && formData.role !== 'general-contractor' ? 'Notice to Owner' : 'Claim of Mechanics Lien'}
        </h3>
        <p className="text-sm opacity-80">{STATE_LABELS[formData.state] || toTitleCase(formData.state)} — {countyDisplay}</p>
        <p className="text-xs opacity-60 mt-1">MCL 570.1101–570.1305</p>
      </div>

      <div className="flex-1 bg-white border border-t-0 border-slate-200 rounded-b-xl overflow-y-auto p-5 space-y-4">
        {/* Deadline banner */}
        {deadline && daysLeft !== null && (
          <div className={`rounded-lg px-4 py-3 text-center font-semibold text-sm ${daysLeft < 0 ? 'bg-red-100 text-red-700' : daysLeft <= 30 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
            {daysLeft < 0
              ? `⚠ Deadline passed ${Math.abs(daysLeft)} days ago`
              : daysLeft === 0 ? '⚠ Deadline is TODAY'
              : `✓ File by ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — ${daysLeft} days`}
          </div>
        )}

        {/* Fields */}
        <div className="space-y-1">
          <Row label="Claimant" value={formData.claimantName} />
          {formData.claimantAddress && <Row label="Claimant Address" value={formData.claimantAddress} />}
          <Row label="Role" value={ROLE_LABELS[formData.role] || formData.role} />
          <Row label="Property Owner" value={formData.ownerName} />
          {formData.ownerAddress && <Row label="Owner Address" value={formData.ownerAddress} />}
          <Row label="Property" value={formData.propertyAddress} />
          <Row label="Legal Description" value={hasLegalDesc ? '✓ Provided' : isMichigan ? '⚠ Not entered' : 'Not entered'} warn={!hasLegalDesc && isMichigan} />
          <Row label="County" value={countyDisplay} />
          {isMichigan && <Row label="Project Type" value={`${toTitleCase(projectType)} (${projectType === 'commercial' ? '180' : '90'}-day deadline)`} />}
          <Row label="Amount Claimed" value={formatCurrency(formData.contractAmount)} highlight />
          <Row label="Last Furnishing" value={formData.lastFurnishingDate} />
        </div>

        {/* Readiness checklist */}
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 font-medium mb-2">Document readiness:</p>
          <ul className="space-y-1">
            {readiness.map((item) => (
              <li key={item.label} className={`flex items-center gap-2 text-xs ${item.warn ? 'text-orange-600' : item.ok ? 'text-green-700' : 'text-slate-400'}`}>
                <span>{item.warn ? '⚠' : item.ok ? '✓' : '○'}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Bundle */}
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500 font-medium mb-2">Bundle ({bundleItems.length} documents):</p>
          <ul className="space-y-1">
            {bundleItems.map((item) => (
              <li key={item as string} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="text-green-500 shrink-0">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-400 italic">Sign before a notary before filing. Not legal advice — consult an attorney.</p>
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
