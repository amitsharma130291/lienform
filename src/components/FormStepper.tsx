import { useState } from 'react';

export type UserRole =
  | 'general-contractor'
  | 'subcontractor'
  | 'sub-subcontractor'
  | 'material-supplier'
  | 'equipment-rental';

export interface LienFormData {
  state: string;
  role: UserRole;
  claimantName: string;
  claimantAddress: string;
  email: string;
  ownerName: string;
  ownerAddress: string;
  propertyAddress: string;
  legalDescription: string;  // NEW: separate legal description field
  county: string;
  gcName: string;
  hiringParty: string;
  projectType: 'residential' | 'commercial';
  contractAmount: string;
  firstFurnishingDate: string;
  lastFurnishingDate: string;
}

export interface FormStepperProps {
  defaultState?: string;
  documentType?: 'mechanics-lien' | 'notice-to-owner';
  onFormComplete: (data: LienFormData) => void;
}

const US_STATES = [
  { value: 'alabama', label: 'Alabama' }, { value: 'alaska', label: 'Alaska' },
  { value: 'arizona', label: 'Arizona' }, { value: 'arkansas', label: 'Arkansas' },
  { value: 'california', label: 'California' }, { value: 'colorado', label: 'Colorado' },
  { value: 'connecticut', label: 'Connecticut' }, { value: 'delaware', label: 'Delaware' },
  { value: 'florida', label: 'Florida' }, { value: 'georgia', label: 'Georgia' },
  { value: 'hawaii', label: 'Hawaii' }, { value: 'idaho', label: 'Idaho' },
  { value: 'illinois', label: 'Illinois' }, { value: 'indiana', label: 'Indiana' },
  { value: 'iowa', label: 'Iowa' }, { value: 'kansas', label: 'Kansas' },
  { value: 'kentucky', label: 'Kentucky' }, { value: 'louisiana', label: 'Louisiana' },
  { value: 'maine', label: 'Maine' }, { value: 'maryland', label: 'Maryland' },
  { value: 'massachusetts', label: 'Massachusetts' }, { value: 'michigan', label: 'Michigan' },
  { value: 'minnesota', label: 'Minnesota' }, { value: 'mississippi', label: 'Mississippi' },
  { value: 'missouri', label: 'Missouri' }, { value: 'montana', label: 'Montana' },
  { value: 'nebraska', label: 'Nebraska' }, { value: 'nevada', label: 'Nevada' },
  { value: 'new-hampshire', label: 'New Hampshire' }, { value: 'new-jersey', label: 'New Jersey' },
  { value: 'new-mexico', label: 'New Mexico' }, { value: 'new-york', label: 'New York' },
  { value: 'north-carolina', label: 'North Carolina' }, { value: 'north-dakota', label: 'North Dakota' },
  { value: 'ohio', label: 'Ohio' }, { value: 'oklahoma', label: 'Oklahoma' },
  { value: 'oregon', label: 'Oregon' }, { value: 'pennsylvania', label: 'Pennsylvania' },
  { value: 'rhode-island', label: 'Rhode Island' }, { value: 'south-carolina', label: 'South Carolina' },
  { value: 'south-dakota', label: 'South Dakota' }, { value: 'tennessee', label: 'Tennessee' },
  { value: 'texas', label: 'Texas' }, { value: 'utah', label: 'Utah' },
  { value: 'vermont', label: 'Vermont' }, { value: 'virginia', label: 'Virginia' },
  { value: 'washington', label: 'Washington' }, { value: 'west-virginia', label: 'West Virginia' },
  { value: 'wisconsin', label: 'Wisconsin' }, { value: 'wyoming', label: 'Wyoming' },
];

const ROLES: { value: UserRole; label: string; icon: string; description: string }[] = [
  { value: 'general-contractor', label: 'General Contractor', icon: '🏗️', description: 'You have a direct contract with the property owner.' },
  { value: 'subcontractor', label: 'Subcontractor', icon: '🔧', description: 'You have a contract with the general contractor.' },
  { value: 'sub-subcontractor', label: 'Sub-Subcontractor', icon: '⚙️', description: 'You have a contract with a subcontractor.' },
  { value: 'material-supplier', label: 'Material Supplier', icon: '📦', description: 'You supplied materials to the project.' },
  { value: 'equipment-rental', label: 'Equipment Rental', icon: '🚜', description: 'You rented equipment used on the project.' },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${i + 1 < current ? 'bg-navy-700 border-navy-700 text-white' : i + 1 === current ? 'bg-white border-navy-700 text-navy-700' : 'bg-white border-slate-300 text-slate-400'}`}>
            {i + 1 < current ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : i + 1}
          </div>
          {i < total - 1 && <div className={`flex-1 h-0.5 mx-2 transition-all ${i + 1 < current ? 'bg-navy-700' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function FormStepper({ defaultState = '', documentType = 'mechanics-lien', onFormComplete }: FormStepperProps) {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 3;

  const [formData, setFormData] = useState<Partial<LienFormData>>({
    state: defaultState, role: undefined,
    claimantName: '', claimantAddress: '', email: '',
    ownerName: '', ownerAddress: '',
    propertyAddress: '', legalDescription: '', county: '',
    gcName: '', hiringParty: '',
    projectType: 'residential',
    contractAmount: '', firstFurnishingDate: '', lastFurnishingDate: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LienFormData, string>>>({});

  const update = (field: keyof LienFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateStep3 = (): boolean => {
    const e: Partial<Record<keyof LienFormData, string>> = {};
    if (!formData.claimantName?.trim()) e.claimantName = 'Required.';
    if (!formData.claimantAddress?.trim()) e.claimantAddress = 'Required.';
    if (!formData.ownerName?.trim()) e.ownerName = 'Required.';
    if (!formData.propertyAddress?.trim()) e.propertyAddress = 'Required.';
    if (!formData.county?.trim()) e.county = 'Required.';
    if (!formData.contractAmount?.trim()) e.contractAmount = 'Required.';
    if (!formData.firstFurnishingDate?.trim()) e.firstFurnishingDate = 'Required.';
    if (!formData.lastFurnishingDate?.trim()) e.lastFurnishingDate = 'Required.';
    if (!formData.email?.trim()) e.email = 'Required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;
    onFormComplete(formData as LienFormData);
  };

  const isMichigan = formData.state === 'michigan';
  const isGC = formData.role === 'general-contractor';
  const isSubOrSupplier = ['subcontractor', 'sub-subcontractor', 'material-supplier', 'equipment-rental'].includes(formData.role || '');

  const fieldClass = (field: keyof LienFormData) =>
    `block w-full px-4 py-2.5 rounded-lg border text-slate-900 focus:outline-none focus:ring-2 text-sm ${errors[field] ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-navy-600'}`;

  const FieldError = ({ field }: { field: keyof LienFormData }) =>
    errors[field] ? <p className="text-red-500 text-xs mt-1">{errors[field]}</p> : null;

  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Select your state</h2>
      <p className="text-slate-500 text-sm mb-6">Lien laws vary by state. Choose where the project is located.</p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Project State <span className="text-red-500">*</span></label>
        <select className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm bg-white" value={formData.state || ''} onChange={(e) => update('state', e.target.value)}>
          <option value="" disabled>Select a state...</option>
          {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="mt-4 p-4 bg-navy-50 rounded-lg border border-navy-100">
        <p className="text-xs text-navy-700 font-medium">Document type: <span className="capitalize">{documentType.replace(/-/g, ' ')}</span></p>
        <p className="text-xs text-slate-500 mt-1">We'll generate the correct form for your state's requirements.</p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">What is your role?</h2>
      <p className="text-slate-500 text-sm mb-6">Your role determines the specific lien rights and requirements that apply.</p>
      <div className="space-y-3">
        {ROLES.map((role) => (
          <label key={role.value} className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.role === role.value ? 'border-navy-600 bg-navy-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
            <input type="radio" name="role" value={role.value} checked={formData.role === role.value} onChange={() => update('role', role.value)} className="sr-only" />
            <span className="text-2xl">{role.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">{role.label}</p>
              <p className="text-slate-500 text-xs mt-0.5">{role.description}</p>
            </div>
            {formData.role === role.value && (
              <div className="w-5 h-5 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Project details</h2>
      <p className="text-slate-500 text-sm mb-5">This information will be filled into your lien document.</p>

      {/* Michigan Notice of Furnishing warning for subs */}
      {isMichigan && isSubOrSupplier && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-xs font-semibold text-orange-800 mb-1">⚠ Michigan Notice of Furnishing Required</p>
          <p className="text-xs text-orange-700">Serve a <strong>Notice of Furnishing within 20 days</strong> of first furnishing (MCL 570.1109). Your bundle includes this form on the last page.</p>
        </div>
      )}

      {/* Michigan GC sworn statement */}
      {isMichigan && isGC && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-semibold text-blue-800 mb-1">ℹ Michigan GC — Sworn Statement Requirement</p>
          <p className="text-xs text-blue-700">Michigan law (MCL 570.1110) may require a <strong>sworn statement</strong> listing subcontractors before payment is due. Consult an attorney.</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Michigan project type */}
        {isMichigan && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Project Type <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {(['residential', 'commercial'] as const).map((type) => (
                <label key={type} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.projectType === type ? 'border-navy-600 bg-navy-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="projectType" value={type} checked={formData.projectType === type} onChange={() => update('projectType', type)} className="sr-only" />
                  <span className="font-semibold text-slate-800 text-sm capitalize">{type}</span>
                  <span className="text-xs text-slate-500">{type === 'residential' ? '90-day' : '180-day'}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Claimant */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your Name or Company Name <span className="text-red-500">*</span></label>
          <input type="text" placeholder="ABC Roofing LLC or John Smith" className={fieldClass('claimantName')} value={formData.claimantName || ''} onChange={(e) => update('claimantName', e.target.value)} />
          <FieldError field="claimantName" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your Business Address <span className="text-red-500">*</span></label>
          <input type="text" placeholder="456 Contractor Blvd, Detroit, MI 48201" className={fieldClass('claimantAddress')} value={formData.claimantAddress || ''} onChange={(e) => update('claimantAddress', e.target.value)} />
          <FieldError field="claimantAddress" />
          {!errors.claimantAddress && <p className="text-xs text-slate-400 mt-1">Required on recorded liens.</p>}
        </div>

        {/* Owner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Property Owner Name <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Jane Smith" className={fieldClass('ownerName')} value={formData.ownerName || ''} onChange={(e) => update('ownerName', e.target.value)} />
            <FieldError field="ownerName" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Owner Mailing Address</label>
            <input type="text" placeholder="789 Oak Ave, Ann Arbor, MI 48104" className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm" value={formData.ownerAddress || ''} onChange={(e) => update('ownerAddress', e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">Used for service of process.</p>
          </div>
        </div>

        {/* Property */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Property Address <span className="text-red-500">*</span></label>
            <input type="text" placeholder="123 Main Street, Detroit, MI 48201" className={fieldClass('propertyAddress')} value={formData.propertyAddress || ''} onChange={(e) => update('propertyAddress', e.target.value)} />
            <FieldError field="propertyAddress" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">County <span className="text-red-500">*</span></label>
            <input type="text" placeholder="Wayne" className={fieldClass('county')} value={formData.county || ''} onChange={(e) => update('county', e.target.value)} />
            <FieldError field="county" />
          </div>
        </div>

        {/* Legal description — recommended for Michigan */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Legal Property Description
            {isMichigan
              ? <span className="text-orange-600 text-xs ml-1">⚠ Recommended for Michigan</span>
              : <span className="text-slate-400 text-xs ml-1">(optional)</span>}
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Lot 14, Block 3, Wayne County Plat No. 47, as recorded in Liber 212 Page 84..."
            className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm resize-none"
            value={formData.legalDescription || ''}
            onChange={(e) => update('legalDescription', e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">Find this on your deed or from the county assessor / Register of Deeds.</p>
        </div>

        {/* GC / Hiring party */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              General Contractor Name
              {isGC
                ? <span className="text-slate-400 text-xs ml-1">(you are the GC — optional)</span>
                : <span className="text-slate-400 text-xs ml-1">(optional)</span>}
            </label>
            {/* GC field is always editable — even if you ARE the GC you may want to note another GC managed the site */}
            <input
              type="text"
              placeholder="ABC Construction LLC"
              className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
              value={formData.gcName || ''}
              onChange={(e) => update('gcName', e.target.value)}
            />
          </div>
          {isSubOrSupplier && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Who Contracted You?</label>
              <input type="text" placeholder="XYZ Framing LLC" className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm" value={formData.hiringParty || ''} onChange={(e) => update('hiringParty', e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">The party who hired you (may differ from GC).</p>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount Owed / Contract Amount <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input type="text" placeholder="25,000.00" className={`block w-full pl-7 pr-4 py-2.5 rounded-lg border text-slate-900 focus:outline-none focus:ring-2 text-sm ${errors.contractAmount ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-navy-600'}`} value={formData.contractAmount || ''} onChange={(e) => update('contractAmount', e.target.value)} />
          </div>
          <FieldError field="contractAmount" />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Furnishing Date <span className="text-red-500">*</span></label>
            <input type="date" className={fieldClass('firstFurnishingDate')} value={formData.firstFurnishingDate || ''} onChange={(e) => update('firstFurnishingDate', e.target.value)} />
            <FieldError field="firstFurnishingDate" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Furnishing Date <span className="text-red-500">*</span></label>
            <input type="date" className={fieldClass('lastFurnishingDate')} value={formData.lastFurnishingDate || ''} onChange={(e) => update('lastFurnishingDate', e.target.value)} />
            <FieldError field="lastFurnishingDate" />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
          <input type="email" placeholder="you@company.com" className={fieldClass('email')} value={formData.email || ''} onChange={(e) => update('email', e.target.value)} />
          <FieldError field="email" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl w-full mx-auto">
      <div className="mb-2 text-right">
        <span className="text-xs text-slate-400 font-medium">Step {step} of {TOTAL_STEPS}</span>
      </div>
      <StepIndicator current={step} total={TOTAL_STEPS} />
      <div className="min-h-[280px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
        <button type="button" onClick={() => step > 1 && setStep((s) => s - 1)} disabled={step === 1} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        {step < TOTAL_STEPS ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} disabled={step === 1 ? !formData.state : !formData.role} className="inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} className="inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors" style={{ backgroundColor: '#16a34a' }}>
            Generate Document
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
