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
 * Verified real contact details for a specific county recording office. Only add an
 * entry here once the address/phone/hours have been independently confirmed against
 * the county's own site — this is a name+phone+address customers will actually rely
 * on to find where to file, so a wrong or stale entry is worse than the generic
 * "contact the county directly" fallback every other county still gets. Keep county
 * names lowercase with no "county" suffix, matching normaliseCounty()'s output.
 */
export interface CountyContact {
  officeName: string;
  address: string;
  phone: string;
  hours: string;
  website?: string;
  /** Verbatim submission-method note from the county's own page, if they publish one. */
  submissionNote?: string;
  /** Verified accepted payment methods / fee policy, if researched for this county. */
  paymentNote?: string;
}

export const COUNTY_CONTACTS: Record<string, Record<string, CountyContact>> = {
  michigan: {
    huron: {
      officeName: 'Huron County Register of Deeds',
      address: '250 E. Huron Avenue, Room 203, Bad Axe, MI 48413',
      phone: '989-269-9941',
      hours: 'Monday-Friday, 8:30 a.m.-4:30 p.m., except holidays',
      website: 'co.huron.mi.us/register-of-deeds',
      submissionNote: 'Documents may be hand delivered or mailed.',
      paymentNote: 'The county states that correct fees must accompany documents and accepts checks, money orders, cash, and credit cards; checks may be payable to the Register of Deeds. Confirm the current fee and any card charge directly with the office before submission.',
    },
  },
};

/**
 * How a state's filing deadline is computed. Four shapes exist:
 * - daysFromLastFurnishing: flat N days after the claimant's last furnishing date.
 * - projectTypeDaysFromLastFurnishing: N days, split by residential/commercial.
 * - texasMonthDay15: Texas's "N months later, on the 15th" rule. N is keyed by
 *   PROJECT TYPE (residential vs. commercial/nonresidential) under Property Code
 *   §53.052 — for BOTH original contractors and subcontractors. It is not keyed by
 *   role; an earlier version of this rule incorrectly gave every general contractor
 *   4 months and every non-GC 3 months regardless of project type, which was wrong
 *   in both directions (a residential GC got told they had a month they didn't;
 *   a commercial subcontractor got told they had a month less than they actually did).
 * - notComputable: the state's real deadline does not run from "last furnishing
 *   date" at all (e.g. Arizona runs from statutory completion or a recorded
 *   Notice of Completion). No countdown should ever be shown for these states —
 *   show `deadlineCaveat` instead.
 */
export type DeadlineRule =
  | { kind: 'daysFromLastFurnishing'; days: number }
  | { kind: 'projectTypeDaysFromLastFurnishing'; residentialDays: number; commercialDays: number }
  | { kind: 'texasMonthDay15'; residentialMonths: number; commercialMonths: number }
  | { kind: 'notComputable' };

/**
 * Deadline to serve the RECORDED lien on the owner (or statutory designee), which
 * runs from the recording date — not from last furnishing. Missing this is a
 * separate way to lose the lien even when the recording itself was timely, so it
 * is surfaced on its own line in the PDF rather than buried in the instructions.
 */
export interface PostRecordingService {
  /** Days after recording within which service must be completed. */
  days: number;
  /** Permitted methods, verbatim from the statute. Do NOT add "first class mail" unless the statute allows it. */
  methods: string;
  /** Who must be served, including any designee/fallback rule. */
  servedOn: string;
  /** What happens if service is late or omitted. */
  consequence: string;
  /** Statute cite for this specific service duty. */
  statute: string;
}

/**
 * County-recorder formatting requirements for page 1. Recorders reject documents
 * that violate these regardless of whether the lien itself is substantively valid.
 */
export interface RecordingFormat {
  /** Blank space required at the top of page 1, in inches, for the recording stamp. */
  topMarginInches: number;
  /** Whether a "Drafted by: name + business address" block is required on the instrument. */
  requiresDrafterBlock: boolean;
  statute: string;
}

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
  /** How soon the preliminary notice must be served — drives the intake-form heads-up banner, e.g. "within 20 days after first furnishing". */
  preliminaryNoticeDeadlineText?: string;
  /**
   * A separate sworn-statement / similar pre-payment disclosure duty specific to this
   * state (e.g. Michigan's MCL 570.1110 sworn statement for GCs) — surfaced as an
   * intake-form heads-up banner for the given role(s). Omit for states without one
   * rather than leaving the form to silently say nothing.
   */
  swornStatementRequirement?: { roles: string[]; statute: string; note: string };
  /**
   * True only for states whose preliminary-notice document is Michigan's distinct
   * "Notice of Furnishing" template — addressed to the designee AND general
   * contractor per MCL 570.1109/570.1111, structurally different from the generic
   * owner/direct-contractor preliminary-notice template other states use. Drives
   * PDFGenerator's document-6 branch instead of a hardcoded state-name check.
   */
  usesMichiganNoticeOfFurnishing?: boolean;
  /**
   * True only for states whose generic preliminary-notice page should also print
   * California's Civil Code §8204 statutory language. Drives PDFGenerator instead
   * of a hardcoded state-name check.
   */
  usesCaliforniaPreliminaryNoticeLanguage?: boolean;

  /**
   * If set, non-general-contractor roles get this document title instead of
   * "Claim of Mechanics Lien". Only Florida uses this today.
   */
  documentTitleForNonGC?: string;

  /** Deadline/method for serving the recorded lien. Rendered on the deadline page when present. */
  postRecordingService?: PostRecordingService;

  /** Recorder formatting rules applied to page 1 layout when present. */
  recordingFormat?: RecordingFormat;

  /**
   * Statutory contents the claim of lien must recite. Rendered as a verified
   * recital block on page 1 so the instrument states them in its own voice
   * rather than only as a data table.
   */
  requiresContractingPartyRecital?: boolean;

  /**
   * Warning shown when the claimant is a general contractor on a residential
   * project and the state conditions GC lien rights on a written contract.
   */
  residentialWrittenContractWarning?: { statute: string; text: string };

  /** What the recording office is called, e.g. "Register of Deeds", "County Clerk". */
  recordingOfficeTerm: string;

  /**
   * How to enforce the lien if unpaid. `statute` is only set when a specific
   * subsection is independently verified — otherwise the renderer falls back to
   * citing the state's general `citation` so we never attribute a deadline to a
   * pinpoint cite we haven't checked.
   */
  enforcement?: { deadlineText: string; statute?: string };

  /**
   * Overrides the generic "Release of Construction Lien" / jurat pairing used by
   * default. Only populate this once the state's specific discharge instrument name
   * and notarial act (acknowledgment vs. jurat) have been independently verified —
   * Michigan's MCL 570.1127 certificate requires an ACKNOWLEDGMENT, not a jurat, which
   * is a real difference in the notary's certificate language, not a style choice.
   */
  discharge?: {
    title: string;
    notarialAct: 'acknowledgment' | 'jurat';
    statute?: string;
    /** Shorter form used in prose (Filing Instructions, etc.) instead of the full page-heading title. Falls back to `title` when unset. */
    shortTitle?: string;
    /** Sentence-case, further-shortened form used only in the Document Set Included manifest. Falls back to a lowercased `title` when unset. */
    manifestTitle?: string;
  };
}

const SUB_OR_SUPPLIER_ROLES = ['subcontractor', 'sub-subcontractor', 'material-supplier', 'equipment-rental'];

export const STATE_LIEN_RULES: Record<string, StateLienRule> = {
  michigan: {
    // DEADLINE CORRECTION: Michigan is a FLAT 90 days from last furnishing for every
    // claimant and every project type (MCL 570.1111(1)). This entry previously encoded a
    // 90-day residential / 180-day commercial split, which does not exist in the statute
    // and would have told commercial claimants they had twice the time they actually had.
    // Do not reintroduce a project-type split here.
    label: 'Michigan',
    citation: 'Pursuant to the Michigan Construction Lien Act, 1980 PA 497, MCL 570.1101–570.1305',
    filingInstructions: `Michigan Construction Lien Filing Instructions

1. DEADLINE — 90 DAYS: Record the Claim of Lien with the Register of Deeds for the county where the property is located within 90 days after your last furnishing of labor or material (MCL 570.1111(1)). This is a flat 90 days — Michigan does NOT give commercial projects a longer period. The right to a lien ceases to exist if you miss it.
2. SERVE WITHIN 15 DAYS AFTER RECORDING: Within 15 days after recording, serve a copy of the recorded Claim of Lien — together with a copy of any recorded proof of service of your Notice of Furnishing — on the designee named in the Notice of Commencement, personally or by certified mail, return receipt requested (MCL 570.1111(5)). If no designee is named, or the designee has died, serve the owner or lessee named in the Notice of Commencement. Service by certified mail is complete on mailing. Missing this 15-day window can render the lien unenforceable, so calendar it the day you record.
3. FIRST-CLASS MAIL IS NOT SUFFICIENT for serving the recorded claim of lien. Use personal service or certified mail, return receipt requested, and keep the receipt.
4. NOTARIZATION REQUIRED: The Claim of Lien must be verified (sworn) by the claimant or the claimant's authorized agent or attorney. Sign before a notary public before recording.
5. RECORDING FORMAT (MCL 565.201): Leave at least 2-1/2 inches of blank space at the top of the first page for the recorder's stamp, and at least 1/2 inch on the remaining margins. Print the name of each signer beneath the signature, print the notary's name beneath the notary signature, and include the name and business address of the person who drafted the document. Recorders reject documents that fail these formatting rules even when the lien itself is valid.
6. LEGAL DESCRIPTION: A street address alone is not sufficient. Include the full legal property description from the county deed or assessor records.
7. NAME THE PARTY YOU CONTRACTED WITH: A Michigan claim of lien must state the name of the person with whom you contracted, along with your first and last furnishing dates, the owner's name, the property description, and the contract and payment amounts.
8. NOTICE OF FURNISHING (subcontractors, suppliers, laborers): Serve a Notice of Furnishing on the designee and the general contractor named in the Notice of Commencement, personally or by certified mail, within 20 days after first furnishing (MCL 570.1109). Late service does not destroy your lien, but it limits the lien to labor and material furnished in the 20 days before service and afterward. A subcontractor's or supplier's claim of lien must have the proof of service of the Notice of Furnishing attached to it.
9. RESIDENTIAL WRITTEN CONTRACT (MCL 570.1114): A contractor has a lien on an owner's or lessee's interest in a RESIDENTIAL structure only if the improvement was provided under a written contract with that owner or lessee, with any amendments or additions also in writing. An oral residential contract can defeat the lien entirely.
10. SWORN STATEMENT (GCs): General contractors may be required to provide a sworn statement listing all subcontractors and suppliers before receiving payment (MCL 570.1110).
11. LAWSUIT DEADLINE: Bring proceedings to enforce the lien through foreclosure no later than 1 year after the date the claim of lien was recorded (MCL 570.1117), and record a notice of lis pendens when you commence the action.`,
    deadlineRule: { kind: 'daysFromLastFurnishing', days: 90 },
    postRecordingService: {
      days: 15,
      methods: 'personally or by certified mail, return receipt requested. Certified-mail service is complete upon mailing',
      servedOn:
        'the designee named in the recorded Notice of Commencement; if none was named or the designee has died, serve the owner or lessee named there',
      consequence: 'Failure to serve within 15 days after recording can render the lien unenforceable.',
      // NOT MCL 570.1114 — that section is the residential written-contract requirement.
      // §1111's own title says "...serving copy of claim of lien and recorded proof of
      // service on designee, owner, or lessee" — confirmed against the Michigan
      // Legislature's official section titles for both 1111 and 1114 before fixing this.
      statute: 'MCL 570.1111(5)',
    },
    recordingFormat: {
      topMarginInches: 2.5,
      requiresDrafterBlock: true,
      statute: 'MCL 565.201',
    },
    requiresContractingPartyRecital: true,
    residentialWrittenContractWarning: {
      statute: 'MCL 570.1114',
      text: 'MCL 570.1114: a contractor has a construction lien on a residential structure only if the improvement was provided under a WRITTEN contract with the owner or lessee, including any amendments or additions. Confirm you have a written contract before recording.',
    },
    recordingOfficeTerm: 'Register of Deeds',
    enforcement: { deadlineText: 'within 1 year after the Claim was recorded', statute: 'MCL 570.1117' },
    discharge: {
      title: 'Certificate Discharging Construction Lien',
      notarialAct: 'acknowledgment',
      statute: 'MCL 570.1127',
      shortTitle: 'Certificate of Discharge',
      manifestTitle: 'Certificate discharging lien',
    },
    needsPreliminaryNoticeBundleItem: true,
    previewPreliminaryNoticeRoles: SUB_OR_SUPPLIER_ROLES,
    pdfPreliminaryNoticeRoles: SUB_OR_SUPPLIER_ROLES,
    preliminaryNoticeLabel: 'Notice of Furnishing (MCL 570.1109)',
    preliminaryNoticeStatute: 'Pursuant to MCL 570.1109 (Michigan Construction Lien Act)',
    preliminaryNoticeDeadlineText: 'within 20 days after first furnishing',
    usesMichiganNoticeOfFurnishing: true,
    swornStatementRequirement: {
      roles: ['general-contractor'],
      statute: 'MCL 570.1110',
      note: 'may require a sworn statement listing subcontractors before payment is due. Consult an attorney.',
    },
  },

  california: {
    // DEADLINE CORRECTION: California's recording deadline does NOT run from the
    // claimant's own last-furnishing date the way this entry previously modeled it
    // (`daysFromLastFurnishing`, flat 90 days). Under Civ. Code §8412, a direct
    // contractor must record before the EARLIER of (a) 90 days after completion of
    // the WHOLE work of improvement (a project-level date, not the claimant's own
    // last day of work), or (b) 60 days after the owner records a Notice of
    // Completion/Cessation and properly serves it. A subcontractor/supplier gets the
    // same 90-day-after-completion default, but a properly served Notice of
    // Completion shortens it to 30 days. This tool only collects the claimant's own
    // last-furnishing date, not project completion or Notice of Completion status, so
    // it cannot safely compute this deadline — same treatment as Arizona.
    label: 'California',
    citation: 'Pursuant to California Civil Code §8000–9566 (SB 189, effective July 1, 2012)',
    filingInstructions: `California Mechanics Lien Filing Instructions

1. DEADLINE DOES NOT RUN FROM YOUR LAST FURNISHING DATE: California's recording deadline runs from completion of the WHOLE work of improvement, or from a recorded Notice of Completion/Cessation — not from your own last day of work (Civ. Code §8412). Verify the applicable date against county records before filing; do not rely on your last furnishing date alone.
2. DIRECT CONTRACTOR DEADLINE: Record before the EARLIER of 90 days after completion of the whole work of improvement, or 60 days after the owner records a Notice of Completion/Cessation and properly serves a copy on you.
3. SUBCONTRACTOR / SUPPLIER DEADLINE: Record within 90 days after completion of the whole work of improvement — shortened to 30 days after the owner records a Notice of Completion/Cessation and properly serves a copy on you.
4. PRELIMINARY NOTICE: With limited exceptions, lien rights depend on having served a Preliminary Notice within 20 days of first furnishing (Civ. Code §8204). A late notice generally protects only work performed in the 20 days before service and afterward.
5. RECORD WITH: The County Recorder's Office in the county where the property is located.
6. SERVE THE OWNER: A copy of the claim of mechanics lien must be served on the owner (or, if the owner cannot be served, the construction lender or original contractor) no later than the time you record it — not a fixed number of days afterward (Civ. Code §8416). Serve personally, or by registered/certified/first-class mail with a certificate of mailing. Failing to serve as required makes the lien unenforceable.
7. ENFORCEMENT DEADLINE: An action to enforce the lien must generally be commenced within 90 days after recording, or the lien expires (Civ. Code §8460).`,
    deadlineRule: { kind: 'notComputable' },
    deadlineCaveat:
      "California's deadline runs from completion of the whole work of improvement or a recorded Notice of Completion/Cessation — not your last furnishing date. Direct contractors: the earlier of 90 days after completion or 60 days after a properly served Notice of Completion. Subcontractors/suppliers: 90 days after completion, or 30 days after a properly served Notice of Completion. Verify the applicable date against county records before relying on any deadline.",
    recordingOfficeTerm: 'County Recorder',
    enforcement: { deadlineText: 'within 90 days after recording unless a lawsuit is filed to enforce the lien', statute: 'Civ. Code §8460' },
    needsPreliminaryNoticeBundleItem: true,
    previewPreliminaryNoticeRoles: SUB_OR_SUPPLIER_ROLES,
    pdfPreliminaryNoticeRoles: ['subcontractor', 'material-supplier'],
    preliminaryNoticeLabel: '20-Day Preliminary Notice',
    preliminaryNoticeStatute: 'Pursuant to California Civil Code §8204',
    preliminaryNoticeDeadlineText: 'within 20 days of first furnishing',
    usesCaliforniaPreliminaryNoticeLanguage: true,
  },

  texas: {
    // DEADLINE CORRECTION: the "15th day of the Nth month after last furnishing" rule
    // (Prop. Code §53.052) is keyed by PROJECT TYPE — 3 months for residential, 4 months
    // for commercial/nonresidential — for BOTH original contractors and subcontractors.
    // This previously keyed the month count off ROLE instead, which was wrong for a
    // residential GC (told 4 months, actually only has 3) and a commercial subcontractor
    // (told 3 months, actually has 4).
    label: 'Texas',
    citation: "Pursuant to Texas Property Code Chapter 53 (as amended by HB 2237, eff. Jan. 1, 2022)",
    filingInstructions: `Texas Mechanic's Lien Filing Instructions

1. DEADLINE: File the Affidavit Claiming Mechanic's Lien with the County Clerk no later than the 15th day of the 3rd month after last furnishing (residential) or the 15th day of the 4th month after last furnishing (commercial/nonresidential) — Property Code §53.052. This applies to both original contractors and subcontractors; it is not based on your role.
2. Serve a copy on the property owner by certified mail within 5 days of filing.
3. Monthly notices are required for subcontractors without a direct contract with the owner — see Property Code §53.056.
4. LAWSUIT DEADLINE: For contracts entered on or after January 1, 2022 (HB 2237), suit to foreclose the lien must generally be brought within 1 year after the last day the lien affidavit could have been timely filed under §53.052 — not necessarily 1 year from the date you actually filed (Property Code §53.158). Older contracts may still be on the prior 2-year rule; confirm your contract date before relying on this deadline.`,
    deadlineRule: { kind: 'texasMonthDay15', residentialMonths: 3, commercialMonths: 4 },
    recordingOfficeTerm: 'County Clerk',
    // 1 year, not 2 — HB 2237 shortened this for contracts entered on/after Jan 1, 2022.
    // The period runs from the LAST DAY THE AFFIDAVIT COULD HAVE BEEN TIMELY FILED under
    // §53.052, not from the actual filing date (Prop. Code §53.158).
    enforcement: {
      deadlineText: 'generally within 1 year after the last day the lien affidavit could have been timely filed (not necessarily 1 year from your actual filing date) — for contracts entered on or after January 1, 2022',
      statute: 'Tex. Prop. Code §53.158',
    },
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
    recordingOfficeTerm: 'Clerk of the Circuit Court',
    enforcement: { deadlineText: 'within 1 year after recording the lien' },
    needsPreliminaryNoticeBundleItem: true,
    previewPreliminaryNoticeRoles: SUB_OR_SUPPLIER_ROLES,
    pdfPreliminaryNoticeRoles: ['subcontractor', 'material-supplier'],
    preliminaryNoticeLabel: 'Notice to Owner',
    preliminaryNoticeStatute: 'Pursuant to Florida Statute §713.06(2)',
    preliminaryNoticeDeadlineText: 'within 45 days of first furnishing',
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
    recordingOfficeTerm: 'County Recorder',
    enforcement: { deadlineText: 'generally within 6 months after recording', statute: 'A.R.S. § 33-998' },
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
    recordingOfficeTerm: 'Clerk of Superior Court',
    enforcement: { deadlineText: 'within 365 days after recording (and file notice of that action in the county lien records within 30 days after commencing it)' },
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
    recordingOfficeTerm: 'County Recorder',
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
    recordingOfficeTerm: 'County Recorder/Auditor',
    enforcement: { deadlineText: 'within 8 calendar months after recording (or after expiration of stated credit terms)', statute: 'RCW 60.04.141' },
    needsPreliminaryNoticeBundleItem: false,
  },
};

/**
 * Parse a date-only string ("YYYY-MM-DD", as produced by <input type="date">) as
 * LOCAL midnight.
 *
 * `new Date('2026-07-28')` is specified to parse as UTC midnight, which is the
 * PREVIOUS calendar day everywhere west of Greenwich. Every subsequent getDate()/
 * setDate() call then operates on that shifted day, so deadlines came out one day
 * early for all US users — e.g. 90 days after 2026-07-28 rendered as Sunday
 * Oct 25 2026 instead of the correct Monday Oct 26 2026. Always route date-only
 * strings through this helper; never hand them to `new Date()` directly, and never
 * round-trip a computed deadline through toISOString().
 */
export function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(value);
  if (isNaN(fallback.getTime())) return null;
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

/** Format a Date as "YYYY-MM-DD" using local fields (toISOString would shift the day). */
export function toLocalISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whole days between two dates, both normalised to local midnight. */
export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Last weekday on or before `date`. Used to warn when a statutory deadline lands on
 * a weekend: recording offices are closed, so the safe instruction is to record
 * EARLIER. We deliberately do not roll the deadline forward — court rules that extend
 * periods falling on weekends are not something a filing tool should assume for the
 * claimant, and advising the earlier date is never wrong.
 */
export function previousBusinessDay(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  while (isWeekend(d)) d.setDate(d.getDate() - 1);
  return d;
}

/** Add days to a date, staying in local time. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

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

  const last = parseLocalDate(lastFurnishingDate);
  if (!last) return null;

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
      const months = projectType === 'commercial' ? rule.commercialMonths : rule.residentialMonths;
      const d = new Date(last);
      d.setMonth(d.getMonth() + months, 15);
      return d;
    }
  }
}
