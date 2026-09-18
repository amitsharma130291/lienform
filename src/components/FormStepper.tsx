import { useState } from 'react';
import { STATE_LIEN_RULES, parseLocalDate, computeLienDeadline, daysBetween } from '../data/stateLienRules';

/** Parse a currency-ish string ("$1,200.50") to a number; non-numeric input reads as 0. */
function toNumber(value: string | undefined): number {
  const n = parseFloat(String(value ?? '').replace(/[,$\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

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
  legalDescription: string;
  workDescription: string;
  contractDate: string;
  referenceNumber: string;
  county: string;
  parcelNumber: string;
  gcName: string;
  hiringParty: string;
  projectType: 'residential' | 'commercial';
  contractAmount: string;
  firstFurnishingDate: string;
  lastFurnishingDate: string;
  amountPaid: string;
  projectCompletionDate: string;
  internalJobNumber: string;
  preparedByName: string;
  preparedByAddress: string;
}

export interface FormStepperProps {
  defaultState?: string;
  documentType?: 'mechanics-lien' | 'notice-to-owner';
  onFormComplete: (data: LienFormData) => void;
}

/**
 * Only states with a real STATE_LIEN_RULES entry are offered. Selecting a state with
 * no rule silently defaulted to nothing (blank deadline, generic instructions, no
 * legal citations) while looking identical to a supported state in the UI — this
 * list is derived from the rules data itself so it can never drift ahead of what the
 * deadline math and PDF generator actually support.
 */
const US_STATES = Object.entries(STATE_LIEN_RULES)
  .map(([value, rule]) => ({ value, label: rule.label }))
  .sort((a, b) => a.label.localeCompare(b.label));

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
    propertyAddress: '', legalDescription: '', workDescription: '', contractDate: '', referenceNumber: '', county: '',
    parcelNumber: '',
    gcName: '', hiringParty: '',
    projectType: 'residential',
    contractAmount: '', firstFurnishingDate: '', lastFurnishingDate: '',
    amountPaid: '', projectCompletionDate: '', internalJobNumber: '',
    preparedByName: '', preparedByAddress: '',
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
    if (documentType !== 'notice-to-owner' && !formData.lastFurnishingDate?.trim()) e.lastFurnishingDate = 'Required.';
    if (documentType === 'notice-to-owner' && !formData.ownerAddress?.trim()) e.ownerAddress = 'Complete the owner service address.';
    if (!formData.email?.trim()) e.email = 'Required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email.';

    // These two are labelled required and carry a `required` attribute, but the markup
    // has no <form> wrapper and submits via a type="button" handler, so native
    // validation never fired and both could reach the PDF blank. A claim of lien with
    // no legal description or no statement of what was furnished is not recordable.
    if (!formData.legalDescription?.trim()) e.legalDescription = 'Required — a street address alone is not sufficient to record a lien.';
    if (!formData.workDescription?.trim()) e.workDescription = 'Required — describe the labor, materials, or equipment you furnished.';

    // A claim of lien must name the party the claimant contracted with. A general
    // contractor contracts with the owner, so only ask everyone else.
    if (isSubOrSupplier && !formData.hiringParty?.trim()) {
      e.hiringParty = 'Required — your lien must name the party you contracted with.';
    }

    // Date ordering. Wrong-way dates silently produce a wrong filing deadline, which
    // is the single most expensive error this tool can make.
    const first = parseLocalDate(formData.firstFurnishingDate || '');
    const last = parseLocalDate(formData.lastFurnishingDate || '');
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (first && last && first.getTime() > last.getTime()) {
      e.lastFurnishingDate = 'Last furnishing cannot be before first furnishing.';
    }
    if (first && first.getTime() > todayEnd.getTime()) {
      e.firstFurnishingDate = 'First furnishing date cannot be in the future.';
    }
    if (last && last.getTime() > todayEnd.getTime()) {
      e.lastFurnishingDate = 'Last furnishing date cannot be in the future.';
    }
    if (formData.firstFurnishingDate?.trim() && !first) e.firstFurnishingDate = 'Enter a valid date.';
    if (formData.lastFurnishingDate?.trim() && !last) e.lastFurnishingDate = 'Enter a valid date.';

    const contract = parseLocalDate(formData.contractDate || '');
    if (contract && first && contract.getTime() > first.getTime()) {
      e.contractDate = 'Contract date is after your first furnishing date — check both.';
    }

    if (toNumber(formData.amountPaid) > toNumber(formData.contractAmount)) {
      e.amountPaid = 'Amount paid cannot exceed the contract amount.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;
    onFormComplete(formData as LienFormData);
  };

  const stateRule = STATE_LIEN_RULES[formData.state || ''];
  const stateLabel = stateRule?.label ?? formData.state ?? '';
  const isGC = formData.role === 'general-contractor';
  const isSubOrSupplier = ['subcontractor', 'sub-subcontractor', 'material-supplier', 'equipment-rental'].includes(formData.role || '');
  const projectTypeRule = stateRule?.deadlineRule;
  // Texas's "15th day of the Nth month" rule is also keyed by project type (Prop. Code
  // §53.052: 3 months residential, 4 months commercial) for both GCs and subs — not
  // shown before this fix, which meant Texas customers were never asked and got the
  // wrong month count for their actual project type roughly half the time.
  const showsProjectTypeToggle =
    projectTypeRule?.kind === 'projectTypeDaysFromLastFurnishing' || projectTypeRule?.kind === 'texasMonthDay15';

  /**
   * Non-blocking warnings. These describe situations that are legitimate but that an
   * owner contesting the lien will probe, so the claimant should see them before
   * paying rather than discovering them in the finished PDF. Declared after the
   * role/state flags above because this runs during render and would otherwise hit
   * their temporal dead zone.
   */
  const advisories: string[] = (() => {
    const out: string[] = [];
    if (documentType === 'notice-to-owner') {
      const limit = computeLienDeadline(STATE_LIEN_RULES.florida.deadlineRule, { lastFurnishingDate: '', firstFurnishingDate: formData.firstFurnishingDate || '', role: formData.role || '' });
      out.push('The Notice to Owner must also precede the applicable final owner disbursement. Verify recipients and statutory service; this calculator checks only the 45-day first-furnishing period.');
      if (limit && daysBetween(new Date(), limit) <= 7) out.push('Your calculated notice period is close or has passed. Obtain Florida legal advice promptly; late notice does not automatically preserve future work.');
      return out;
    }
    const completion = parseLocalDate(formData.projectCompletionDate || '');
    const last = parseLocalDate(formData.lastFurnishingDate || '');
    if (completion && last && completion.getTime() < last.getTime()) {
      out.push(
        `You listed project completion (${completion.toLocaleDateString('en-US')}) as earlier than last furnishing (${last.toLocaleDateString('en-US')}). Your deadline runs from LAST FURNISHING — be ready to document what was furnished on the later date. Routine warranty or repair work generally does not restart the deadline.`
      );
    }
    if (stateRule?.residentialWrittenContractWarning && isGC && formData.projectType === 'residential') {
      out.push(stateRule.residentialWrittenContractWarning.text);
    }
    // Catch an about-to-lapse or already-lapsed deadline here, before the customer pays
    // and downloads — the PDF itself flags a passed deadline, but by then it's too late
    // to act on the warning.
    const deadlineRule = stateRule?.deadlineRule;
    const deadline = deadlineRule ? computeLienDeadline(deadlineRule, {
      lastFurnishingDate: formData.lastFurnishingDate || '',
      firstFurnishingDate: formData.firstFurnishingDate,
      role: formData.role || '',
      projectType: formData.projectType === 'commercial' ? 'commercial' : 'residential',
    }) : null;
    if (deadline) {
      const daysLeft = daysBetween(new Date(), deadline);
      if (daysLeft < 0) {
        out.push(
          `Your calculated recording deadline (${deadline.toLocaleDateString('en-US')}) has already passed. Recording after the statutory deadline generally cannot create a valid lien — get legal advice before filing.`
        );
      } else if (daysLeft <= 7) {
        out.push(
          `Your calculated recording deadline (${deadline.toLocaleDateString('en-US')}) is only ${daysLeft} day${daysLeft === 1 ? '' : 's'} away. Record as soon as possible — mail delays or office closures could cost you the lien with no time left to correct it.`
        );
      }
    }
    return out;
  })();

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
          {US_STATES.filter(s => documentType === 'notice-to-owner' ? s.value === 'florida' : s.value !== 'florida').map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div className="mt-4 p-4 bg-navy-50 rounded-lg border border-navy-100">
        <p className="text-xs text-navy-700 font-medium">Document type: <span className="capitalize">{documentType.replace(/-/g, ' ')}</span></p>
        <p className="text-xs text-slate-500 mt-1">Preview your details and review the draft against statutory and local requirements before use.</p>
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

      {!!stateRule?.needsPreliminaryNoticeBundleItem && (stateRule.pdfPreliminaryNoticeRoles ?? []).includes(formData.role || '') && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-xs font-semibold text-orange-800 mb-1">⚠ {stateRule.preliminaryNoticeLabel ?? 'Preliminary Notice'} Required</p>
          <p className="text-xs text-orange-700">
            Serve a <strong>{stateRule.preliminaryNoticeLabel ?? 'Preliminary Notice'}</strong>
            {stateRule.preliminaryNoticeDeadlineText ? ` ${stateRule.preliminaryNoticeDeadlineText}` : ''}. Your bundle includes this form on the last page.
          </p>
        </div>
      )}

      {!!stateRule?.swornStatementRequirement && stateRule.swornStatementRequirement.roles.includes(formData.role || '') && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-semibold text-blue-800 mb-1">ℹ {stateLabel} — Sworn Statement Requirement</p>
          <p className="text-xs text-blue-700">{stateLabel} law ({stateRule.swornStatementRequirement.statute}) {stateRule.swornStatementRequirement.note}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Project type — only shown for states whose deadline splits by residential/commercial */}
        {showsProjectTypeToggle && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Project Type <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {(['residential', 'commercial'] as const).map((type) => (
                <label key={type} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.projectType === type ? 'border-navy-600 bg-navy-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="projectType" value={type} checked={formData.projectType === type} onChange={() => update('projectType', type)} className="sr-only" />
                  <span className="font-semibold text-slate-800 text-sm capitalize">{type}</span>
                  <span className="text-xs text-slate-500">
                    {projectTypeRule?.kind === 'texasMonthDay15'
                      ? `${type === 'residential' ? projectTypeRule.residentialMonths : projectTypeRule.commercialMonths}-month`
                      : type === 'residential'
                        ? `${(projectTypeRule as { residentialDays: number }).residentialDays}-day`
                        : `${(projectTypeRule as { commercialDays: number }).commercialDays}-day`}
                  </span>
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Parcel / Tax ID Number <span className="text-slate-400 text-xs">(optional)</span>
            </label>
            <input type="text" placeholder="51-44-601-610" className={fieldClass('parcelNumber')} value={formData.parcelNumber || ''} onChange={(e) => update('parcelNumber', e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">From your deed, tax bill, or the county assessor's site.</p>
          </div>
        </div>

        {/* Legal Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Legal Description of Property <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Lot 14, Block 3, Sunset Subdivision — found on your deed or from county records"
            className={fieldClass('legalDescription')}
            value={formData.legalDescription || ''}
            onChange={(e) => update('legalDescription', e.target.value)}
          />
          {errors.legalDescription
            ? <p className="text-xs text-red-500 mt-1">{errors.legalDescription}</p>
            : <p className="text-xs text-slate-400 mt-1">Required by law. Find this on your deed, title report, or county property records.</p>}
        </div>

        {/* Description of Work */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description of Work/Materials Provided <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            placeholder="Roofing installation including shingles, underlayment, and labor"
            className={fieldClass('workDescription')}
            value={formData.workDescription || ''}
            onChange={(e) => update('workDescription', e.target.value)}
          />
          {errors.workDescription
            ? <p className="text-xs text-red-500 mt-1">{errors.workDescription}</p>
            : <p className="text-xs text-slate-400 mt-1">Briefly describe the work or materials you provided.</p>}
        </div>

        {/* Contract Date + Invoice # */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract Date</label>
            <input
              type="date"
              className={`${fieldClass('contractDate')} h-[42px]`}
              value={formData.contractDate || ''}
              onChange={(e) => update('contractDate', e.target.value)}
            />
            {errors.contractDate && <p className="text-xs text-red-500 mt-1">{errors.contractDate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract/Invoice # <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              type="text"
              placeholder="INV-2024-001"
              className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm h-[42px]"
              value={formData.referenceNumber || ''}
              onChange={(e) => update('referenceNumber', e.target.value)}
            />
          </div>
        </div>

        {/* Project Completion Date + Job Number */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project Completion Date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm h-[42px]"
              value={formData.projectCompletionDate || ''}
              onChange={(e) => update('projectCompletionDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Job/Project # <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="JOB-2024-042"
              className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm h-[42px]"
              value={formData.internalJobNumber || ''}
              onChange={(e) => update('internalJobNumber', e.target.value)}
            />
          </div>
        </div>

        {/* GC name — full width when no hiringParty field, half when hiringParty is shown */}
        {isSubOrSupplier ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">General Contractor Name <span className="text-slate-400 text-xs">(optional)</span></label>
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
                Who Contracted You? <span className="text-red-500">*</span>
              </label>
              <input type="text" placeholder="XYZ Framing LLC" className={fieldClass('hiringParty')} value={formData.hiringParty || ''} onChange={(e) => update('hiringParty', e.target.value)} />
              {errors.hiringParty
                ? <p className="text-xs text-red-500 mt-1">{errors.hiringParty}</p>
                : <p className="text-xs text-slate-400 mt-1">The party who hired you (may differ from GC). Your lien must name this party.</p>}
            </div>
          </div>
        ) : (
          /* Full width when only GC name is shown (no hiring party field) */
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              General Contractor Name
              {isGC
                ? <span className="text-slate-400 text-xs ml-1">(you are the GC — optional)</span>
                : <span className="text-slate-400 text-xs ml-1">(optional)</span>}
            </label>
            <input
              type="text"
              placeholder="ABC Construction LLC"
              className="block w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-600 text-sm"
              value={formData.gcName || ''}
              onChange={(e) => update('gcName', e.target.value)}
            />
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount Owed / Contract Amount <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input type="text" placeholder="25,000.00" className={`block w-full pl-7 pr-4 py-2.5 rounded-lg border text-slate-900 focus:outline-none focus:ring-2 text-sm ${errors.contractAmount ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-navy-600'}`} value={formData.contractAmount || ''} onChange={(e) => update('contractAmount', e.target.value)} />
          </div>
          <FieldError field="contractAmount" />
        </div>

        {/* Amount Paid to Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Amount Paid to Date <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className={`block w-full pl-7 pr-4 py-2.5 rounded-lg border text-slate-900 focus:outline-none focus:ring-2 text-sm ${errors.amountPaid ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-navy-600'}`}
              value={formData.amountPaid || ''}
              onChange={(e) => update('amountPaid', e.target.value)}
            />
          </div>
          {errors.amountPaid
            ? <p className="text-xs text-red-500 mt-1">{errors.amountPaid}</p>
            : <p className="text-xs text-slate-400 mt-1">How much the owner has paid you so far. The lien will be for the remaining balance.</p>}
        </div>

        {/* Amount Remaining Due — read-only calculated */}
        {formData.contractAmount && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount Claimed (Remaining Due)</label>
            <div className="px-4 py-2.5 rounded-lg border border-navy-200 bg-navy-50 text-navy-900 font-semibold text-sm">
              ${Math.max(0, parseFloat(formData.contractAmount || '0') - parseFloat(formData.amountPaid || '0')).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">This is the amount that will appear on your lien claim.</p>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Furnishing Date <span className="text-red-500">*</span></label>
            <input type="date" className={fieldClass('firstFurnishingDate')} value={formData.firstFurnishingDate || ''} onChange={(e) => update('firstFurnishingDate', e.target.value)} />
            <FieldError field="firstFurnishingDate" />
          </div>
          {documentType !== 'notice-to-owner' && <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Furnishing Date <span className="text-red-500">*</span></label>
            <input type="date" className={fieldClass('lastFurnishingDate')} value={formData.lastFurnishingDate || ''} onChange={(e) => update('lastFurnishingDate', e.target.value)} />
            <FieldError field="lastFurnishingDate" />
          </div>}
        </div>

        {/* Prepared By — only needed when someone other than the claimant drafted this document */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Prepared By — Name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Leave blank if you're drafting this yourself"
              className={fieldClass('preparedByName')}
              value={formData.preparedByName || ''}
              onChange={(e) => update('preparedByName', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Prepared By — Business Address <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Leave blank if you're drafting this yourself"
              className={fieldClass('preparedByAddress')}
              value={formData.preparedByAddress || ''}
              onChange={(e) => update('preparedByAddress', e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-400 -mt-2 sm:col-span-2">Only fill this in if someone other than you — an attorney, assistant, or filing service — actually prepared this document. Otherwise we'll use your name and address above.</p>
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

      {/* Non-blocking advisories: legitimate situations an owner contesting the lien
          will probe. Shown before payment, not discovered in the finished PDF. */}
      {step === TOTAL_STEPS && advisories.length > 0 && (
        <div className="mt-6 space-y-2">
          {advisories.map((note, i) => (
            <div key={i} className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <span aria-hidden="true">⚠️</span>
              <p>{note}</p>
            </div>
          ))}
        </div>
      )}

      {step === TOTAL_STEPS && Object.values(errors).some(Boolean) && (
        <p className="mt-4 text-sm text-red-600 font-medium">
          Please fix the highlighted fields above before generating your document.
        </p>
      )}

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
