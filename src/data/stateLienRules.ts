// src/data/stateLienRules.ts
// Single source of truth for per-state mechanics-lien deadline math, statute
// citations, and filing instructions. Consumed by LienFormApp.tsx (live preview),
// PDFGenerator.ts (generated PDF bundle), and FormStepper.tsx (project-type UI).
//
// Previously this logic was duplicated independently in three places and defaulted
// unknown states to a flat 90-day rule — which would have been wrong for Arizona
// (120/60 days) and incomplete for Ohio (60/75 days). Do not reintroduce per-state
// branching in the consuming components; add a new entry here instead.

export type ProjectType = 'residential' | 'commercial';

/**
 * How a state's filing deadline is computed. Four shapes exist:
 * - daysFromLastFurnishing: flat N days after the claimant's last furnishing date.
 * - projectTypeDaysFromLastFurnishing: N days, split by residential/commercial.
 * - texasMonthDay15: Texas's "N months later, on the 15th" rule.
 * - notComputable: the state's real deadline does not run from "last furnishing
 *   date" at all (e.g. Arizona runs from statutory completion or a recorded
 *   Notice of Completion). No countdown should ever be shown for these states —
 *   show `deadlineCaveat` instead.
 */
export type DeadlineRule =
  | { kind: 'daysFromLastFurnishing'; days: number }
  | { kind: 'projectTypeDaysFromLastFurnishing'; residentialDays: number; commercialDays: number }
  | { kind: 'texasMonthDay15'; generalContractorMonths: number; otherMonths: number }
  | { kind: 'notComputable' };

export interface StateLienRule {
  /** Display label, e.g. "Michigan" */
  label: string;
  /** Full citation sentence used verbatim in the PDF header and preview subtext */
  citation: string;
  /** Multi-line filing-instructions body (PDF bundle page 3) */
  filingInstructions: string;
  /** How to compute the deadline date */
  deadlineRule: DeadlineRule;
  /**
   * Neutral message shown INSTEAD of the deadline countdown when a real
   * countdown can't be computed (deadlineRule.kind === 'notComputable').
   */
  deadlineCaveat?: string;

  /** True only for states whose bundle includes a 6th "preliminary notice" PDF page. */
  needsPreliminaryNoticeBundleItem: boolean;
  /** Roles that make the Preview panel's bundle LIST show the preliminary-notice line item. */
  previewPreliminaryNoticeRoles?: string[];
  /**
   * Roles that make PDFGenerator actually RENDER the 6th preliminary-notice page.
   * For california/florida this is intentionally NARROWER than
   * previewPreliminaryNoticeRoles (pre-existing mismatch, preserved intentionally —
   * see LienFormApp.tsx / PDFGenerator.ts comments. Do not silently unify these lists;
   * that changes live PDF output and is a product decision, not a refactor.)
   */
  pdfPreliminaryNoticeRoles?: string[];
  /** Bundle-list label / PDF page title, e.g. "20-Day Preliminary Notice" */
  preliminaryNoticeLabel?: string;
  /** Statute line printed at the top of the preliminary-notice PDF page */
  preliminaryNoticeStatute?: string;

  /**
   * If set, non-general-contractor roles get this document title instead of
   * "Claim of Mechanics Lien". Only Florida uses this today.
   */
  documentTitleForNonGC?: string;
}

const SUB_OR_SUPPLIER_ROLES = ['subcontractor', 'sub-subcontractor', 'material-supplier', 'equipment-rental'];

export const STATE_LIEN_RULES: Record<string, StateLienRule> = {
  michigan: {
    label: 'Michigan',
    citation: 'Pursuant to MCL 570.1101–570.1305 (Michigan Construction Lien Act, as amended 2023)',
    filingInstructions: `Michigan Construction Lien Filing Instructions

1. NOTARIZATION REQUIRED: Michigan law (MCL 570.1107) requires the Claim of Lien to be verified under oath. Sign before a notary public before filing.
2. LEGAL DESCRIPTION: A street address alone may not be sufficient. Include the full legal property description from county deed or assessor records.
3. NOTICE OF FURNISHING: Subcontractors and suppliers must serve a Notice of Furnishing within 20 days of first furnishing (MCL 570.1109). See last page of this bundle.
4. SWORN STATEMENT (GCs): General contractors may be required to provide a sworn statement listing all subcontractors and suppliers before receiving payment (MCL 570.1110).
5. FILE WITH: Register of Deeds in the county where the property is located.
6. DEADLINE: 90 days from last furnishing (residential) or 180 days (commercial).
7. After recording, serve a copy on the property owner by certified mail or personal delivery.
8. File an Affidavit of Service with the Register of Deeds after serving the owner.
9. LAWSUIT DEADLINE: File suit to enforce the lien within 1 year of recording.`,
    deadlineRule: { kind: 'projectTypeDaysFromLastFurnishing', residentialDays: 90, commercialDays: 180 },
    needsPreliminaryNoticeBundleItem: true,
    previewPreliminaryNoticeRoles: SUB_OR_SUPPLIER_ROLES,
    pdfPreliminaryNoticeRoles: SUB_OR_SUPPLIER_ROLES,
    preliminaryNoticeLabel: 'Notice of Furnishing (MCL 570.1109)',
    preliminaryNoticeStatute: 'Pursuant to MCL 570.1109 (Michigan Construction Lien Act)',
  },

  california: {
    label: 'California',
    citation: 'Pursuant to California Civil Code §8000–9566 (SB 189, effective July 1, 2012)',
    filingInstructions: `California Mechanics Lien Filing Instructions

1. A Preliminary Notice (20-Day Notice) must have been served within 20 days of first furnishing.
2. Record the Claim of Mechanics Lien with the County Recorder's Office.
3. After recording, serve the property owner within 20 days via certified mail.
4. A mechanics lien expires 90 days from recording unless a lawsuit is filed to enforce it.`,
    deadlineRule: { kind: 'daysFromLastFurnishing', days: 90 },
    needsPreliminaryNoticeBundleItem: true,
    previewPreliminaryNoticeRoles: SUB_OR_SUPPLIER_ROLES,
    pdfPreliminaryNoticeRoles: ['subcontractor', 'material-supplier'],
    preliminaryNoticeLabel: '20-Day Preliminary Notice',
    preliminaryNoticeStatute: 'Pursuant to California Civil Code §8204',
  },

  texas: {
    label: 'Texas',
    citation: "Pursuant to Texas Property Code Chapter 53 (as amended by HB 2237, eff. Jan. 1, 2022)",
    filingInstructions: `Texas Mechanic's Lien Filing Instructions

1. File the Affidavit Claiming Mechanic's Lien with the County Clerk.
2. Serve a copy on the property owner by certified mail within 5 days of filing.
3. Monthly notices are required for subcontractors — see Texas Property Code Ch. 53.
4. Liens expire 2 years from filing unless a lawsuit is brought.`,
    deadlineRule: { kind: 'texasMonthDay15', generalContractorMonths: 4, otherMonths: 3 },
    needsPreliminaryNoticeBundleItem: false,
  },

  florida: {
    label: 'Florida',
    citation: 'Pursuant to Florida Statute §713.06',
    filingInstructions: `Florida Construction Lien / Notice to Owner Filing Instructions

1. A Notice to Owner (NTO) must be served on the property owner within 45 days of first furnishing.
2. File the lien with the Clerk of the Circuit Court.
3. After filing a lien, a lawsuit to enforce must be filed within 1 year.`,
    deadlineRule: { kind: 'daysFromLastFurnishing', days: 45 },
    needsPreliminaryNoticeBundleItem: true,
    previewPreliminaryNoticeRoles: SUB_OR_SUPPLIER_ROLES,
    pdfPreliminaryNoticeRoles: ['subcontractor', 'material-supplier'],
    preliminaryNoticeLabel: 'Notice to Owner',
    preliminaryNoticeStatute: 'Pursuant to Florida Statute §713.06(2)',
    documentTitleForNonGC: 'Notice to Owner',
  },

  arizona: {
    label: 'Arizona',
    citation: 'Pursuant to Arizona Revised Statutes § 33-993 (Notice and Claim of Lien)',
    filingInstructions: `Arizona Notice and Claim of Lien Filing Instructions

1. DEADLINE DOES NOT RUN FROM LAST FURNISHING: Arizona's recording deadline is 120 days after statutory completion of the improvement (A.R.S. § 33-993), or 60 days after an owner records a Notice of Completion — whichever applies. Verify the applicable date against county records before filing; do not rely on your last furnishing date alone.
2. PRELIMINARY 20-DAY NOTICE: With limited exceptions, lien rights depend on having served a preliminary 20-day notice near the start of furnishing (A.R.S. § 33-992.01). A late notice generally protects only furnishing within the 20 days before service and afterward.
3. SUPPLEMENTAL NOTICE: If your estimated total price later exceeds a prior notice by 30% or more, A.R.S. § 33-992.01(H) requires a supplemental notice.
4. RECORD WITH: The county recorder in the Arizona county where the property is located.
5. SERVE THE OWNER: Serve a copy of the recorded lien on the owner within a reasonable time — do not treat "reasonable" as a reason to delay.
6. FORECLOSURE DEADLINE: Generally 6 months after recording (A.R.S. § 33-998). Filing the lien does not pause this deadline while parties negotiate.
7. OWNER-OCCUPIED DWELLINGS: Arizona limits lien rights against certain owner-occupied dwellings for claimants with no direct contract with the owner — confirm this threshold issue before recording.`,
    deadlineRule: { kind: 'notComputable' },
    deadlineCaveat:
      "Arizona's deadline runs from statutory completion of the improvement or a recorded Notice of Completion — not your last furnishing date. Verify the applicable date against county records before relying on any deadline.",
    needsPreliminaryNoticeBundleItem: false,
  },

  georgia: {
    label: 'Georgia',
    citation: "Pursuant to O.C.G.A. § 44-14-361.1 (Georgia mechanics and materialmen's lien law)",
    filingInstructions: `Georgia Mechanics and Materialmen's Lien Filing Instructions

1. DEADLINE: Record the Claim of Lien with the Clerk of Superior Court in the county where the property is located within 90 days after your last furnishing of labor, services, or materials (O.C.G.A. § 44-14-361.1).
2. SEND THE RECORDED CLAIM: No later than 2 business days after filing, send a copy of the recorded claim by registered/certified mail or statutory overnight delivery to the owner (and to the contractor, if a Notice of Commencement was filed).
3. NOTICE TO CONTRACTOR: If a valid Notice of Commencement was filed for the project, subcontractors and suppliers without a direct contract with the owner generally must serve a Notice to Contractor by the later of 30 days after the Notice of Commencement is filed or 30 days after first furnishing.
4. ENFORCEMENT: Commence an action to recover the debt within 365 days after recording, and file a notice of that action in the county lien records within 30 days after commencing it. A properly served Notice of Contest of Lien can shorten this to 60 days after receipt — treat any contest notice as urgent.
5. OWNER-PAYMENT LIMIT: Georgia's lien framework can limit recovery to the contract price still owed by the owner to the general contractor at the time of filing — a paid owner may have a defense even if the general contractor did not pass funds downstream.`,
    deadlineRule: { kind: 'daysFromLastFurnishing', days: 90 },
    needsPreliminaryNoticeBundleItem: false,
  },

  ohio: {
    // NOTE (deliberate simplification): Ohio's real 60-day test is whether the property
    // is a one- or two-family dwelling or residential condominium unit — not a generic
    // residential/commercial toggle. We reuse the existing projectType field as an
    // approximation and disclose that below. We do not attempt to detect Ohio's narrow
    // 120-day oil-and-gas carve-out (ORC § 1311.021) — out of scope for this consumer tool.
    label: 'Ohio',
    citation: "Pursuant to Ohio Revised Code § 1311.06 (Ohio Mechanics' Lien Law)",
    filingInstructions: `Ohio Mechanics' Lien Filing Instructions

1. FILE WITH: The county recorder where the property is located, using the sworn Affidavit for Mechanic's Lien (ORC § 1311.06).
2. DEADLINE — RESIDENTIAL: For a one- or two-family dwelling or residential condominium unit, file within 60 days after your last labor, work, or materials furnished.
3. DEADLINE — OTHER: For other covered private improvements, file within 75 days after your last furnishing.
4. This tool uses the residential/commercial project type you selected as a proxy for Ohio's "one- or two-family dwelling or residential condominium unit" test. If your project is multi-family residential, mixed-use, or otherwise unclear, confirm the correct deadline with an attorney before relying on it.
5. OIL AND GAS: Ohio has a separate 120-day deadline for a narrow oil-and-gas lien carve-out (ORC § 1311.021) that this tool does not attempt to detect.
6. NOTICE OF FURNISHING: If you did not contract directly with the owner, you generally protect your rights by serving a Notice of Furnishing within 21 days of first furnishing.
7. SERVE THE OWNER: Generally required within 30 days after filing.
8. DURATION: A recorded lien generally continues for six years under ORC § 1311.13 unless released or otherwise terminated — this long outside period is not a reason to delay filing or enforcement.`,
    deadlineRule: { kind: 'projectTypeDaysFromLastFurnishing', residentialDays: 60, commercialDays: 75 },
    needsPreliminaryNoticeBundleItem: false,
  },

  washington: {
    label: 'Washington',
    citation: 'Pursuant to RCW 60.04.091 (Washington construction lien law)',
    filingInstructions: `Washington Construction Lien Filing Instructions

1. DEADLINE: Record the Claim of Lien with the county recorder/auditor where the property is located within 90 days after you ceased furnishing labor, professional services, materials, or equipment (RCW 60.04.091).
2. SERVE THE OWNER: Give the owner a copy of the recorded claim by certified or registered mail or personal service within 14 days after recording. Missing this can forfeit your right to recover attorney fees and costs from the owner even if the lien itself remains valid.
3. PRECLAIM NOTICE: Coverage varies by property and claimant type (RCW 60.04.031) — commercial and new residential work generally has a 60-day notice lookback, new single-family residence work generally has a 10-day lookback, and labor-only claims do not require preclaim notice.
4. ENFORCEMENT: File a foreclosure action within 8 calendar months after recording (RCW 60.04.141), then serve the owner within 90 days after filing. If the recorded claim states credit terms, the 8-month period instead runs from expiration of that credit.`,
    deadlineRule: { kind: 'daysFromLastFurnishing', days: 90 },
    needsPreliminaryNoticeBundleItem: false,
  },
};

/**
 * Compute the filing deadline for a given state's rule, or null when a
 * deadline cannot be derived (bad input date, or deadlineRule.kind === 'notComputable').
 */
export function computeLienDeadline(
  rule: DeadlineRule,
  params: { lastFurnishingDate: string; role: string; projectType?: ProjectType }
): Date | null {
  const { lastFurnishingDate, role, projectType = 'residential' } = params;
  if (rule.kind === 'notComputable') return null;

  const last = new Date(lastFurnishingDate);
  if (isNaN(last.getTime())) return null;

  switch (rule.kind) {
    case 'daysFromLastFurnishing': {
      const d = new Date(last);
      d.setDate(d.getDate() + rule.days);
      return d;
    }
    case 'projectTypeDaysFromLastFurnishing': {
      const days = projectType === 'commercial' ? rule.commercialDays : rule.residentialDays;
      const d = new Date(last);
      d.setDate(d.getDate() + days);
      return d;
    }
    case 'texasMonthDay15': {
      const months = role === 'general-contractor' ? rule.generalContractorMonths : rule.otherMonths;
      const d = new Date(last);
      d.setMonth(d.getMonth() + months, 15);
      return d;
    }
  }
}
