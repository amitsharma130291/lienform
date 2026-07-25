import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'general-contractor'
  | 'subcontractor'
  | 'sub-subcontractor'
  | 'material-supplier'
  | 'equipment-rental';

export interface LienFormData {
  state: string;
  role: UserRole;
  ownerName: string;
  propertyAddress: string;
  gcName: string;
  contractAmount: string;
  firstFurnishingDate: string;
  lastFurnishingDate: string;
  county: string;
  email: string;
}

export interface FormStepperProps {
  defaultState?: string;
  documentType?: 'mechanics-lien' | 'notice-to-owner';
  onFormComplete: (data: LienFormData) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const US_STATES = [
  { value: 'alabama', label: 'Alabama' },
  { value: 'alaska', label: 'Alaska' },
  { value: 'arizona', label: 'Arizona' },
  { value: 'arkansas', label: 'Arkansas' },
  { value: 'california', label: 'California' },
  { value: 'colorado', label: 'Colorado' },
  { value: 'connecticut', label: 'Connecticut' },
  { value: 'delaware', label: 'Delaware' },
  { value: 'florida', label: 'Florida' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'hawaii', label: 'Hawaii' },
  { value: 'idaho', label: 'Idaho' },
  { value: 'illinois', label: 'Illinois' },
  { value: 'indiana', label: 'Indiana' },
  { value: 'iowa', label: 'Iowa' },
  { value: 'kansas', label: 'Kansas' },
  { value: 'kentucky', label: 'Kentucky' },
  { value: 'louisiana', label: 'Louisiana' },
  { value: 'maine', label: 'Maine' },
  { value: 'maryland', label: 'Maryland' },
  { value: 'massachusetts', label: 'Massachusetts' },
  { value: 'michigan', label: 'Michigan' },
  { value: 'minnesota', label: 'Minnesota' },
  { value: 'mississippi', label: 'Mississippi' },
  { value: 'missouri', label: 'Missouri' },
  { value: 'montana', label: 'Montana' },
  { value: 'nebraska', label: 'Nebraska' },
  { value: 'nevada', label: 'Nevada' },
  { value: 'new-hampshire', label: 'New Hampshire' },
  { value: 'new-jersey', label: 'New Jersey' },
  { value: 'new-mexico', label: 'New Mexico' },
  { value: 'new-york', label: 'New York' },
  { value: 'north-carolina', label: 'North Carolina' },
  { value: 'north-dakota', label: 'North Dakota' },
  { value: 'ohio', label: 'Ohio' },
  { value: 'oklahoma', label: 'Oklahoma' },
  { value: 'oregon', label: 'Oregon' },
  { value: 'pennsylvania', label: 'Pennsylvania' },
  { value: 'rhode-island', label: 'Rhode Island' },
  { value: 'south-carolina', label: 'South Carolina' },
  { value: 'south-dakota', label: 'South Dakota' },
  { value: 'tennessee', label: 'Tennessee' },
  { value: 'texas', label: 'Texas' },
  { value: 'utah', label: 'Utah' },
  { value: 'vermont', label: 'Vermont' },
  { value: 'virginia', label: 'Virginia' },
  { value: 'washington', label: 'Washington' },
  { value: 'west-virginia', label: 'West Virginia' },
  { value: 'wisconsin', label: 'Wisconsin' },
  { value: 'wyoming', label: 'Wyoming' },
];

const ROLES: { value: UserRole; label: string; icon: string; description: string }[] = [
  {
    value: 'general-contractor',
    label: 'General Contractor',
    icon: '🏗️',
    description: 'You have a direct contract with the property owner.',
  },
  {
    value: 'subcontractor',
    label: 'Subcontractor',
    icon: '🔧',
    description: 'You have a contract with the general contractor.',
  },
  {
    value: 'sub-subcontractor',
    label: 'Sub-Subcontractor',
    icon: '⚙️',
    description: 'You have a contract with a subcontractor.',
  },
  {
    value: 'material-supplier',
    label: 'Material Supplier',
    icon: '📦',
    description: 'You supplied materials to the project.',
  },
  {
    value: 'equipment-rental',
    label: 'Equipment Rental',
    icon: '🚜',
    description: 'You rented equipment used on the project.',
  },
];

// ─── Step Components ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
              i + 1 < current
                ? 'bg-navy-700 border-navy-700 text-white'
                : i + 1 === current
                ? 'bg-white border-navy-700 text-navy-700'
                : 'bg-white border-slate-300 text-slate-400'
            }`}
          >
            {i + 1 < current ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < total - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 transition-all ${
                i + 1 < current ? 'bg-navy-700' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FormStepper({
  defaultState = '',
  documentType = 'mechanics-lien',
  onFormComplete,
}: FormStepperProps) {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 3;

  const [formData, setFormData] = useState<Partial<LienFormData>>({
    state: defaultState,
    role: undefined,
    ownerName: '',
    propertyAddress: '',
    gcName: '',
    contractAmount: '',
    firstFurnishingDate: '',
    lastFurnishingDate: '',
    county: '',
    email: '',
  });

  const update = (field: keyof LienFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFormComplete(formData as LienFormData);
  };

  // ── Step 1: State Selection ──────────────────────────────────────────────

  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Select your state</h2>
      <p className="text-slate-500 text-sm mb-6">
        Lien laws vary by state. Choose where the project is located.
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Project State <span className="text-red-500">*</span>
        </label>
        <select
          className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-navy-600 text-sm bg-white"
          value={formData.state || ''}
          onChange={(e) => update('state', e.target.value)}
        >
          <option value="" disabled>
            Select a state...
          </option>
          {US_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 p-4 bg-navy-50 rounded-lg border border-navy-100">
        <p className="text-xs text-navy-700 font-medium">
          Document type: <span className="capitalize">{documentType.replace(/-/g, ' ')}</span>
        </p>
        <p className="text-xs text-slate-500 mt-1">
          We'll generate the correct form for your state's requirements.
        </p>
      </div>
    </div>
  );

  // ── Step 2: Role Selection ────────────────────────────────────────────────

  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">What is your role?</h2>
      <p className="text-slate-500 text-sm mb-6">
        Your role determines the specific lien rights and requirements that apply.
      </p>
      <div className="space-y-3">
        {ROLES.map((role) => (
          <label
            key={role.value}
            className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.role === role.value
                ? 'border-navy-600 bg-navy-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="role"
              value={role.value}
              checked={formData.role === role.value}
              onChange={() => update('role', role.value)}
              className="sr-only"
            />
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

  // ── Step 3: Project Details ───────────────────────────────────────────────

  const renderStep3 = () => (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Project details</h2>
      <p className="text-slate-500 text-sm mb-6">
        This information will be filled into your lien document.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Property Owner Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Jane Smith"
              className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
              value={formData.ownerName || ''}
              onChange={(e) => update('ownerName', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              County <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Wayne County"
              className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
              value={formData.county || ''}
              onChange={(e) => update('county', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Property Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="123 Main Street, Detroit, MI 48201"
            className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
            value={formData.propertyAddress || ''}
            onChange={(e) => update('propertyAddress', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            General Contractor Name
            <span className="text-slate-400 text-xs ml-1">(leave blank if you are the GC)</span>
          </label>
          <input
            type="text"
            placeholder="ABC Construction LLC"
            className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
            value={formData.gcName || ''}
            onChange={(e) => update('gcName', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Contract Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="text"
              required
              placeholder="25,000.00"
              className="block w-full pl-7 pr-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
              value={formData.contractAmount || ''}
              onChange={(e) => update('contractAmount', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              First Furnishing Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
              value={formData.firstFurnishingDate || ''}
              onChange={(e) => update('firstFurnishingDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Last Furnishing Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
              value={formData.lastFurnishingDate || ''}
              onChange={(e) => update('lastFurnishingDate', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="you@company.com"
            className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
            value={formData.email || ''}
            onChange={(e) => update('email', e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">Used to deliver your completed document.</p>
        </div>
      </form>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const canProceedStep1 = !!formData.state;
  const canProceedStep2 = !!formData.role;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl w-full mx-auto">
      {/* Progress */}
      <div className="mb-2 text-right">
        <span className="text-xs text-slate-400 font-medium">Step {step} of {TOTAL_STEPS}</span>
      </div>
      <StepIndicator current={step} total={TOTAL_STEPS} />

      {/* Step Content */}
      <div className="min-h-[280px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-navy-700 rounded-lg hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-trust-green rounded-lg hover:bg-green-700 transition-colors"
          >
            Generate Document
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
