// PDFGenerator.ts — multi-state lien bundle generator
//
// Document architecture matches the customer-approved Michigan reference bundle: the
// PDF is not one continuously-paginated file but a sequence of INDEPENDENT documents
// (Claim of Lien, Deadline Confirmation, Filing Instructions, Affidavit of Service,
// discharge certificate, and — for roles that need one — a preliminary/furnishing
// notice), each with its own "Page X of Y" pagination and footer identity. A recorder
// only needs the Claim's pages; the reference documents explicitly say they are not
// part of the recordable instrument. Do not collapse this back into one global running
// footer — that was the previous design and is not what was approved.

import {
  STATE_LIEN_RULES,
  computeLienDeadline,
  parseLocalDate,
  daysBetween,
  isWeekend,
  previousBusinessDay,
  COUNTY_CONTACTS,
  type StateLienRule,
} from '../data/stateLienRules';

/** "90th", "45th", "1st", "2nd", "3rd" — for deadline labels like "90TH-DAY RECORDING DEADLINE". */
function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export interface LienFormData {
  state: string;
  role: string;
  claimantName?: string;
  claimantAddress?: string;
  email?: string;
  ownerName: string;
  ownerAddress?: string;
  propertyAddress: string;
  legalDescription?: string;
  workDescription?: string;
  contractDate?: string;
  referenceNumber?: string;
  county: string;
  parcelNumber?: string;
  gcName?: string;
  hiringParty?: string;
  projectType?: 'residential' | 'commercial';
  contractAmount: string;
  firstFurnishingDate: string;
  lastFurnishingDate: string;
  deadline?: string;
  extras?: ('lien-waiver' | 'notice-of-intent' | 'lien-release' | 'preliminary-notice')[];
  amountPaid?: string;
  projectCompletionDate?: string;
  internalJobNumber?: string;
  /** Name of the person/firm who prepared the instrument — required on Michigan recordings (MCL 565.201). */
  preparedByName?: string;
  /** Business address of the preparer — also required by MCL 565.201. */
  preparedByAddress?: string;
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[,$]/g, ''));
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function toAmount(value: string | undefined): number {
  const num = parseFloat(String(value ?? '0').replace(/[,$]/g, ''));
  return isNaN(num) ? 0 : num;
}

function formatLongDate(value: string | undefined, opts: { weekday?: boolean } = {}): string {
  const date = parseLocalDate(value ?? '');
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    ...(opts.weekday ? { weekday: 'long' as const } : {}),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatLongDateObj(date: Date, opts: { weekday?: boolean } = {}): string {
  return date.toLocaleDateString('en-US', {
    ...(opts.weekday ? { weekday: 'long' as const } : {}),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    'general-contractor': 'Contractor / general contractor',
    'subcontractor': 'Subcontractor',
    'sub-subcontractor': 'Sub-subcontractor',
    'material-supplier': 'Material supplier',
    'equipment-rental': 'Equipment rental company',
  };
  return labels[role] || role;
}

/** Short title-case role name for the Project Information Record's summary field — distinct from roleLabel's longer "Contractor / general contractor" form used on the Claim of Lien's notarized capacity field. */
function roleLabelShort(role: string): string {
  const labels: Record<string, string> = {
    'general-contractor': 'General Contractor',
    'subcontractor': 'Subcontractor',
    'sub-subcontractor': 'Sub-subcontractor',
    'material-supplier': 'Material Supplier',
    'equipment-rental': 'Equipment Rental Company',
  };
  return labels[role] || role;
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      if (/^[A-Z0-9&.]{2,}$/.test(w)) return w; // LLC, INC, USA, 3M
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

function normaliseCounty(county: string): string {
  return (county || '').trim().replace(/\s+county\s*$/i, '').trim();
}

/** A single comma is common in a one-line street address; two or more usually means city/state/ZIP are already present. */
function addressLooksComplete(addr: string | undefined): boolean {
  return (addr ?? '').split(',').length >= 3;
}

function calculateDeadline(lastFurnishingDate: string, state: string, role: string, projectType?: string): Date | null {
  const rule = STATE_LIEN_RULES[state]?.deadlineRule;
  if (!rule || !lastFurnishingDate) return null;
  return computeLienDeadline(rule, {
    lastFurnishingDate,
    role,
    projectType: projectType === 'commercial' ? 'commercial' : 'residential',
  });
}

function getDocumentTitle(stateRule: StateLienRule | undefined, role: string): string {
  if (stateRule?.documentTitleForNonGC && role !== 'general-contractor') return stateRule.documentTitleForNonGC.toUpperCase();
  return 'CLAIM OF LIEN';
}

/** Same as getDocumentTitle but natural case, for prose/manifest contexts instead of the page-heading. */
function getDocumentTitleNaturalCase(stateRule: StateLienRule | undefined, role: string): string {
  if (stateRule?.documentTitleForNonGC && role !== 'general-contractor') return stateRule.documentTitleForNonGC;
  return 'Claim of Lien';
}

/** Plain-language explanation of how the deadline was computed, for the Deadline Confirmation page. */
function explainDeadlineBasis(stateRule: StateLienRule | undefined, stateLabel: string): string {
  const rule = stateRule?.deadlineRule;
  if (!rule) return 'Confirm your state\'s recording deadline with a licensed attorney before relying on any date shown here.';
  switch (rule.kind) {
    case 'daysFromFirstFurnishing':
      return `${stateLabel}'s ${rule.days}-day notice period starts at first furnishing. Verify any earlier final-payment limit and statutory service timing.`;
    case 'daysFromLastFurnishing':
      return `${stateLabel}'s ${rule.days}-day period is measured from the claimant's last furnishing of labor or material for the improvement. The confirmed date above should match the last-furnishing date stated on Claim page 2.`;
    case 'projectTypeDaysFromLastFurnishing':
      return `${stateLabel}'s recording period is measured from the claimant's last furnishing of labor or material — ${rule.residentialDays} days for a residential project, ${rule.commercialDays} days for commercial. Confirm the project-type classification before relying on this date.`;
    case 'texasMonthDay15':
      return `Texas's deadline falls on the 15th day of a later calendar month measured from last furnishing — ${rule.residentialMonths} months forward for a residential project, ${rule.commercialMonths} months forward for commercial/nonresidential. The same rule applies to original contractors and subcontractors alike (Prop. Code §53.052) — it depends on project type, not role. Confirm the project-type classification before relying on this date.`;
    case 'notComputable':
      return stateRule?.deadlineCaveat ?? `${stateLabel}'s deadline cannot be computed from the last-furnishing date alone. Verify the applicable date against county records.`;
  }
}

export async function generateLienBundle(data: LienFormData): Promise<Blob> {
  if (data.state === 'florida') {
    const { generateFloridaNotice } = await import('./FloridaNoticePDF');
    return generateFloridaNotice(data);
  }
  const extras = data.extras ?? [];
  const claimantName = (data.claimantName ?? '').trim();
  const claimantAddress = (data.claimantAddress ?? '').trim();
  const email = (data.email ?? '').trim();
  const gcName = (data.gcName ?? '').trim();
  const ownerAddress = (data.ownerAddress ?? '').trim();
  const legalDescription = (data.legalDescription ?? '').trim();
  const parcelNumber = (data.parcelNumber ?? '').trim();
  const projectType = data.projectType ?? 'residential';

  const countyBase = normaliseCounty(data.county);
  const countyDisplay = countyBase ? `${countyBase} County` : '';
  const stateRule = STATE_LIEN_RULES[data.state];
  const stateLabel = stateRule?.label ?? toTitleCase(data.state);
  const isGC = data.role === 'general-contractor';
  const recordingOffice = stateRule?.recordingOfficeTerm ?? 'County Recorder';
  // Only populated for counties with independently verified contact info (see
  // COUNTY_CONTACTS) — every other county gets the generic "contact directly"
  // wording rather than a guessed or stale address/phone number.
  const countyContact = COUNTY_CONTACTS[data.state]?.[countyBase.toLowerCase()];

  // A claim of lien must name the party the claimant contracted with. A general
  // contractor contracts with the owner, so fall back to the owner rather than
  // leaving the statutory recital blank.
  const contractingParty = (data.hiringParty ?? '').trim() || (isGC ? (data.ownerName ?? '').trim() : '');

  const contractTotal = toAmount(data.contractAmount);
  const paidToDate = toAmount(data.amountPaid);
  const remainingDue = Math.max(0, contractTotal - paidToDate);

  const needsMichiganNoticeOfFurnishing =
    !!stateRule?.usesMichiganNoticeOfFurnishing &&
    !!stateRule?.needsPreliminaryNoticeBundleItem &&
    (stateRule.pdfPreliminaryNoticeRoles ?? []).includes(data.role);

  const needsPreliminaryNotice =
    !stateRule?.usesMichiganNoticeOfFurnishing &&
    !!stateRule?.needsPreliminaryNoticeBundleItem &&
    (stateRule.pdfPreliminaryNoticeRoles ?? []).includes(data.role);

  const noticeLabel = stateRule?.preliminaryNoticeLabel ?? 'Preliminary Notice';

  // Only Michigan's discharge instrument (name + acknowledgment-vs-jurat) has been
  // independently verified so far. Every other state falls back to the generic pairing
  // this generator has always used — do not invent a state-specific name/notarial act
  // without the same verification pass Michigan got.
  const discharge = stateRule?.discharge ?? { title: 'Release of Construction Lien', notarialAct: 'jurat' as const };
  // The document's own title stays full-length ("Certificate Discharging Construction
  // Lien"); reference prose elsewhere uses this shorter, more readable form of the
  // same instrument, matching the approved bundle's own wording.
  const dischargeShortName = discharge.shortTitle ?? discharge.title;

  const docTitle = getDocumentTitle(stateRule, data.role);
  const docTitleNatural = getDocumentTitleNaturalCase(stateRule, data.role);

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  doc.setProperties({
    title: `${docTitle} — ${stateLabel}`,
    subject: `${stateLabel} construction lien bundle`,
    creator: 'MechanicsLienForm.com',
  });

  const MARGIN = 20;
  const PAGE_WIDTH = 215.9;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const BODY_BOTTOM = 271;
  const FOOTER_Y = 273;

  // Blank space the register of deeds needs at the top of a recorded instrument's
  // first page for the recording stamp (Michigan: 2.5in minimum, MCL 565.201).
  const RECORDING_TOP_MARGIN_MM = (stateRule?.recordingFormat?.topMarginInches ?? 2.5) * 25.4;

  let y = MARGIN;
  let currentDocRecordable = false;
  let currentDocLabel = '';
  let firstPageUsed = false;

  const resetY = (top = MARGIN) => { y = top; };

  /** On a recordable page, nothing may render below 10pt (MCL 565.201 and equivalents). */
  const fz = (n: number) => (currentDocRecordable ? Math.max(n, 10) : n);

  const checkPageBreak = (needed = 10) => {
    if (y + needed <= BODY_BOTTOM) return false;
    doc.addPage();
    // Only page 1 of a recordable instrument needs the big recorder's-stamp margin —
    // continuation pages use the ordinary margin (still clears the 0.5in statutory
    // minimum). Resetting to RECORDING_TOP_MARGIN_MM here wasted ~1.8in on every
    // continuation page and nearly doubled the bundle's page count.
    resetY(MARGIN);
    if (currentDocLabel) {
      doc.setFontSize(fz(currentDocRecordable ? 11 : 9.5));
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(`${currentDocLabel} — CONTINUED`, MARGIN, y);
      y += 7;
      doc.setDrawColor(190, 190, 190);
      doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
      y += 6;
      doc.setTextColor(30, 30, 30);
    }
    return true;
  };

  const addLine = (text: string, fontSize = 10, isBold = false, color: [number, number, number] = [30, 30, 30]) => {
    const sz = fz(fontSize);
    doc.setFontSize(sz);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    checkPageBreak(lines.length * (sz * 0.4 + 2));
    doc.setFontSize(sz);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.text(lines, MARGIN, y);
    y += lines.length * (sz * 0.4 + 2);
  };

  const addSpacer = (mm = 5) => { y += mm; };

  const addDivider = () => {
    checkPageBreak(6);
    doc.setDrawColor(180, 180, 180);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
  };

  /** Bold navy section band, matching the approved bundle's "LIEN CLAIMANT" / "FURNISHING AND AMOUNTS" style headers. */
  const addSectionBand = (text: string) => {
    addSpacer(2.5);
    checkPageBreak(13);
    doc.setFillColor(30, 47, 110);
    doc.rect(MARGIN, y - 1, CONTENT_WIDTH, 7, 'F');
    doc.setFontSize(fz(9));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(text.toUpperCase(), MARGIN + 3, y + 4);
    // Measured against real output: the line immediately after a band (a fz(10)
    // value with no label row before it, e.g. Legal Description's value, or an
    // fz(8) label on a recordable page) was overlapping the band's bottom edge by
    // ~1.3mm — the old 8.5mm gap assumed a smaller non-floored font than
    // recordable pages actually force. Verified via glyph bounding-box diff against
    // a rendered PDF, not just the theoretical line-height math. Non-recordable
    // reference pages don't have fz()'s 10pt floor, so the smaller gap that
    // originally applied everywhere is still safe there.
    y += currentDocRecordable ? 11.5 : 9;
    doc.setTextColor(30, 30, 30);
  };

  /** A value block with no label above it (used after a section band that already names the field). */
  const addFieldValue = (value: string) => {
    const sz = fz(10);
    doc.setFontSize(sz);
    const lines = doc.splitTextToSize(value || '—', CONTENT_WIDTH);
    checkPageBreak(lines.length * (sz * 0.42 + 1.4) + 3);
    doc.setFontSize(sz);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(lines, MARGIN, y);
    y += lines.length * (sz * 0.42 + 1.4) + 3;
  };

  /**
   * Label + value as one atomic block. checkPageBreak must run ONCE for the combined
   * height — checking the label and value separately let a page break land between
   * them, orphaning the label at the bottom of one page with its value stranded at the
   * top of the next (found via extraction of a generated bundle: "CONTRACTED WITH"
   * printed alone on page 11, its value "Great Lakes Builders Inc" printed on page 12).
   */
  const addField = (label: string, value: string) => {
    const labelSz = fz(8);
    const valueSz = fz(10);
    const valueLines = doc.splitTextToSize(value || '—', CONTENT_WIDTH);
    const labelH = labelSz * 0.4 + 1.5;
    const valueH = valueLines.length * (valueSz * 0.42 + 1.4) + 3;
    checkPageBreak(labelH + valueH);
    doc.setFontSize(labelSz);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(95, 95, 95);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += labelH;
    doc.setFontSize(valueSz);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(valueLines, MARGIN, y);
    y += valueH;
  };

  /**
   * Tighter field spacing for the Project Information Record — a dense, non-recordable
   * summary sheet with 18+ fields. It isn't a legal instrument, so a smaller, denser
   * layout there doesn't touch recordable-page compliance.
   */
  /** A two-column label/value row — bold sentence-case label on the left, value on the right, matching the approved bundle's Project Information Record table. */
  const addCompactField = (label: string, value: string) => {
    const sz = fz(9.5);
    const labelColW = 62;
    const valueColW = CONTENT_WIDTH - labelColW;
    doc.setFontSize(sz);
    doc.setFont('helvetica', 'bold');
    const labelLines = doc.splitTextToSize(label, labelColW - 3);
    doc.setFont('helvetica', 'normal');
    const valueLines = doc.splitTextToSize(value || '—', valueColW);
    const rowLines = Math.max(labelLines.length, valueLines.length);
    const rowH = rowLines * 4.8 + 2.5;
    checkPageBreak(rowH);
    doc.setFontSize(sz);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(labelLines, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(valueLines, MARGIN + labelColW, y);
    y += rowH;
  };

  /** A labelled blank the claimant fills in by hand — for data this tool doesn't (or can't) collect. */
  const addBlankLine = (label: string) => {
    const sz = fz(8);
    checkPageBreak(9);
    doc.setFontSize(sz);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(95, 95, 95);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 3.5;
    doc.setDrawColor(150, 150, 150);
    doc.line(MARGIN, y + 3, MARGIN + CONTENT_WIDTH, y + 3);
    y += 7.5;
  };

  const addMultiBlank = (label: string, lines = 2) => {
    const sz = fz(8);
    checkPageBreak(lines * 7 + 6);
    doc.setFontSize(sz);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(95, 95, 95);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 3.5;
    for (let i = 0; i < lines; i++) {
      doc.setDrawColor(150, 150, 150);
      doc.line(MARGIN, y + 3, MARGIN + CONTENT_WIDTH, y + 3);
      y += 7;
    }
    y += 0.5;
  };

  const addSignatureLine = (leftCaption: string, rightCaption: string, leftWidth = 80, upper = true) => {
    checkPageBreak(15);
    doc.setFontSize(fz(8));
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    if (leftCaption) doc.text(upper ? leftCaption.toUpperCase() : leftCaption, MARGIN, y);
    if (rightCaption) doc.text(rightCaption.toUpperCase(), PAGE_WIDTH / 2 + 5, y);
    y += 4;
    doc.setDrawColor(60, 60, 60);
    doc.line(MARGIN, y, MARGIN + leftWidth, y);
    if (rightCaption) doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
    y += 9;
    doc.setTextColor(30, 30, 30);
  };

  const addCheckboxOption = (label: string) => {
    checkPageBreak(9);
    doc.setDrawColor(80, 80, 80);
    doc.rect(MARGIN, y - 3.2, 4, 4);
    doc.setFontSize(fz(9));
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(label, CONTENT_WIDTH - 8);
    doc.text(lines, MARGIN + 7, y);
    y += lines.length * 4.4 + 4;
  };

  /** A bold navy step number/title with an indented description below — matches the approved bundle's numbered-instruction style, distinct from a plain wrapped sentence. */
  const addNumberedStep = (num: number, title: string, description: string) => {
    checkPageBreak(14);
    doc.setFontSize(fz(9.5));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 47, 110);
    doc.text(`${num}. ${title}`, MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fz(9));
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(description, CONTENT_WIDTH - 4);
    doc.text(lines, MARGIN + 4, y);
    y += lines.length * 4.4 + 5;
    doc.setTextColor(30, 30, 30);
  };

  /** A tinted, bordered callout box for the single most load-bearing instruction on a filing-instructions page. */
  const addCalloutBox = (heading: string, bodyText: string) => {
    addSpacer(2.5);
    const padding = 5;
    const bodyLines = doc.splitTextToSize(bodyText, CONTENT_WIDTH - padding * 2);
    const boxH = 9 + bodyLines.length * 4.6 + padding * 2;
    checkPageBreak(boxH + 4);
    const boxTop = y;
    doc.setFillColor(233, 238, 247);
    doc.setDrawColor(30, 47, 110);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, boxTop, CONTENT_WIDTH, boxH, 2, 2, 'FD');
    doc.setLineWidth(0.2);
    doc.setFontSize(fz(10));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 47, 110);
    doc.text(heading.toUpperCase(), MARGIN + padding, boxTop + padding + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fz(9.5));
    doc.setTextColor(30, 30, 30);
    doc.text(bodyLines, MARGIN + padding, boxTop + padding + 9);
    y = boxTop + boxH + 3;
    doc.setTextColor(30, 30, 30);
  };

  /** Several short labelled blanks on one row — e.g. "FEE AMOUNT ___ CONFIRMED BY ___ DATE ___". */
  const addInlineBlanks = (labels: string[], blankW = 26, gap = 6) => {
    checkPageBreak(10);
    doc.setFontSize(fz(8));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(95, 95, 95);
    let x = MARGIN;
    labels.forEach((label) => {
      const upper = label.toUpperCase();
      doc.text(upper, x, y);
      const lineStart = x + doc.getTextWidth(upper) + 3;
      doc.setDrawColor(150, 150, 150);
      doc.line(lineStart, y + 1, lineStart + blankW, y + 1);
      x = lineStart + blankW + gap;
    });
    y += 10;
    doc.setTextColor(30, 30, 30);
  };

  /** A real bordered box for the notary's physical seal, not just bracketed text floating in space. */
  const addNotarySealBox = () => {
    const boxW = 42;
    const boxH = 12;
    checkPageBreak(boxH + 3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(MARGIN, y, boxW, boxH);
    doc.setFontSize(fz(6.5));
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(140, 140, 140);
    doc.text('NOTARY SEAL / STAMP', MARGIN + boxW / 2, y + boxH / 2 + 1, { align: 'center' });
    y += boxH + 3.5;
    doc.setTextColor(30, 30, 30);
  };

  const addJuratBlock = (heading = 'VERIFICATION / JURAT', prefillCounty = true) => {
    checkPageBreak(46);
    addSpacer(1.5);
    addDivider();
    doc.setFontSize(fz(9.5));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(heading, MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fz(9));
    doc.setTextColor(50, 50, 50);
    doc.text(`State of ${stateLabel}`, MARGIN, y);
    y += 5;
    doc.text(`County of ${prefillCounty ? (countyBase || '______________________') : '______________________________'}`, MARGIN, y);
    y += 5;
    doc.setFontSize(fz(9));
    const lines = doc.splitTextToSize(
      'Subscribed and sworn to before me on ________________________, 20____, by ________________________________________________.',
      CONTENT_WIDTH
    );
    doc.text(lines, MARGIN, y);
    y += lines.length * 4.6 + 5;
    addSignatureLine('Notary Public Signature', 'Printed / Stamped Commissioned Name');
    addSignatureLine('County of Commission', 'My Commission Expires');
    addSignatureLine('Acting in the County of (if applicable)', '');
    addNotarySealBox();
  };

  /** MCL 570.1127 (and any state's equivalent) requires an ACKNOWLEDGMENT here, not a jurat — different certificate language. */
  const addAcknowledgmentBlock = (entityName: string, prefillCounty = true) => {
    checkPageBreak(50);
    addSpacer(1.5);
    addDivider();
    doc.setFontSize(fz(9.5));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('ACKNOWLEDGMENT', MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fz(9));
    doc.setTextColor(50, 50, 50);
    doc.text(`State of ${stateLabel}`, MARGIN, y);
    y += 5;
    doc.text(`County of ${prefillCounty ? (countyBase || '______________________') : '______________________________'}`, MARGIN, y);
    y += 7;
    doc.setFontSize(fz(9));
    const txt = `This instrument was acknowledged before me on ________________________, 20____, by ________________________________________________, as __________________________________ of ${entityName || '________________________________'}.`;
    const lines = doc.splitTextToSize(txt, CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4.6 + 7;
    addSignatureLine('Notary Public Signature', 'Printed / Stamped Commissioned Name');
    addSignatureLine('County of Commission', 'My Commission Expires');
    addSignatureLine('Acting in the County of (if applicable)', '');
    addNotarySealBox();
  };

  /** "Actual drafter" + "when recorded return to" block required by MCL 565.201 and similar recording-format statutes. */
  const addDrafterAndReturnBlock = () => {
    checkPageBreak(30);
    addSpacer(2);
    doc.setFontSize(fz(8));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(95, 95, 95);
    const heading = doc.splitTextToSize('MANDATORY DRAFTER INFORMATION — COMPLETE BEFORE RECORDING', CONTENT_WIDTH);
    doc.text(heading, MARGIN, y);
    y += heading.length * 4 + 3;

    const drafterName = (data.preparedByName ?? '').trim();
    const drafterAddress = (data.preparedByAddress ?? '').trim();
    if (drafterName) addField("Actual Drafter's Name", drafterName);
    else addBlankLine("Actual Drafter's Name");
    if (drafterAddress) addField("Actual Drafter's Business Address", drafterAddress);
    else addBlankLine("Actual Drafter's Business Address");

    addSpacer(1);
    const returnAddr = [claimantName, claimantAddress].filter(Boolean).join(', ');
    const retLines = doc.splitTextToSize(
      addressLooksComplete(claimantAddress)
        ? `After recording return to: ${returnAddr}.`
        : `After recording return to: ${returnAddr || '________________________________'}; add city, state and ZIP above before filing.`,
      CONTENT_WIDTH
    );
    doc.setFontSize(fz(8.5));
    checkPageBreak(retLines.length * 4 + 4);
    doc.setFontSize(fz(8.5));
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(retLines, MARGIN, y);
    y += retLines.length * 4 + 3;
    doc.setTextColor(30, 30, 30);
  };

  // ── Document tracking ────────────────────────────────────────────────────────
  // Each logical document (Claim, Deadline Confirmation, Filing Instructions, ...) is
  // paginated independently. footerLeft is a function of the document's own final page
  // count so "RECORD ALL N PAGES TOGETHER" stays accurate even if content overflows the
  // planned page count.
  interface DocEntry { footerLeft: (total: number) => string; startPage: number; endPage: number; recordable: boolean; }
  const docEntries: DocEntry[] = [];
  let docStartPage = 0;
  let docFooterLeft: (total: number) => string = () => '';
  let docRecordable = false;

  const beginDocument = (opts: {
    label: string;
    recordable: boolean;
    footerLeft: (total: number) => string;
    titleText: string;
    subtitleText?: string;
  }) => {
    if (firstPageUsed) doc.addPage();
    firstPageUsed = true;
    currentDocRecordable = opts.recordable;
    currentDocLabel = opts.label;
    docFooterLeft = opts.footerLeft;
    docRecordable = opts.recordable;
    docStartPage = doc.getNumberOfPages();
    resetY(opts.recordable ? RECORDING_TOP_MARGIN_MM : MARGIN);

    doc.setFontSize(opts.recordable ? 17 : 16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 47, 110);
    doc.text(opts.titleText, MARGIN, y);
    const titleEndX = MARGIN + doc.getTextWidth(opts.titleText);
    if (opts.subtitleText) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const subtitleStartX = PAGE_WIDTH - MARGIN - doc.getTextWidth(opts.subtitleText);
      // A long title (e.g. "CERTIFICATE DISCHARGING CONSTRUCTION LIEN") can run right into
      // a right-aligned subtitle on the same row — drop the subtitle to its own line
      // whenever there isn't at least a small gap between them.
      if (subtitleStartX - titleEndX < 6) {
        y += 6;
        doc.text(opts.subtitleText, MARGIN, y);
      } else {
        doc.text(opts.subtitleText, PAGE_WIDTH - MARGIN, y, { align: 'right' });
      }
    }
    y += 9;
    doc.setTextColor(30, 30, 30);
    doc.setDrawColor(180, 180, 180);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 7;
  };

  /** Forces a page break WITHIN a recordable multi-page instrument, banner reads "— CONTINUED". */
  const continuePage = () => {
    doc.addPage();
    resetY(MARGIN); // only page 1 needs the big recorder's-stamp margin
    doc.setFontSize(fz(currentDocRecordable ? 12 : 11));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 47, 110);
    doc.text(`${currentDocLabel} — CONTINUED`, MARGIN, y);
    y += 8;
    doc.setDrawColor(190, 190, 190);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
    doc.setTextColor(30, 30, 30);
  };

  /** Forces a page break for a multi-page REFERENCE document, repeating the title with a new subtitle. */
  const nextRefPage = (title: string, subtitle: string) => {
    doc.addPage();
    resetY(MARGIN);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 47, 110);
    doc.text(title, MARGIN, y);
    const titleEndX = MARGIN + doc.getTextWidth(title);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    const subtitleStartX = PAGE_WIDTH - MARGIN - doc.getTextWidth(subtitle);
    if (subtitleStartX - titleEndX < 6) {
      y += 5;
      doc.text(subtitle, MARGIN, y);
    } else {
      doc.text(subtitle, PAGE_WIDTH - MARGIN, y, { align: 'right' });
    }
    y += 7;
    doc.setTextColor(30, 30, 30);
    doc.setDrawColor(190, 190, 190);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
  };

  const endDocument = () => {
    docEntries.push({ footerLeft: docFooterLeft, startPage: docStartPage, endPage: doc.getNumberOfPages(), recordable: docRecordable });
  };

  // ═══ DOCUMENT 1: CLAIM OF LIEN (recordable, target 3 pages) ═════════════════

  beginDocument({
    label: docTitle,
    recordable: true,
    footerLeft: (n) => `${docTitle} | RECORD ALL ${n} PAGES TOGETHER`,
    titleText: docTitle,
    subtitleText: [countyDisplay, stateLabel].filter(Boolean).join(', '),
  });

  addLine(
    `Notice is hereby given that on ${formatLongDate(data.firstFurnishingDate) || '____________________'}, the claimant identified below first provided labor or material for an improvement to the real property described below.`,
    10,
    false,
    [40, 40, 40]
  );
  addSpacer(3);

  addSectionBand('Lien Claimant');
  addField('Name', claimantName || '—');
  addField('Business Address', claimantAddress || '—');
  if (!addressLooksComplete(claimantAddress)) addBlankLine('City, State and ZIP — complete before signing');
  addField('Capacity', roleLabel(data.role));
  if (!isGC && contractingParty) addField('Contracted With', contractingParty);
  else if (!isGC) addBlankLine('Contracted With (required — the party who hired you)');

  addSectionBand('Improved Real Property');
  addField('Common Address', data.propertyAddress || '—');
  addField('County and State', [countyDisplay, stateLabel].filter(Boolean).join(', ') || '—');

  continuePage();

  addSectionBand('Legal Description');
  if (legalDescription) addFieldValue(legalDescription);
  else addMultiBlank('Legal description of the property (required before recording — a street address alone is not sufficient)', 3);
  if (parcelNumber) addField('Parcel Identification / Account Number', parcelNumber);
  else addBlankLine('Parcel Identification / Account Number (if known)');

  addSectionBand('Owner or Lessee');
  addField('Name', data.ownerName || '—');
  addField('Mailing Address', ownerAddress || '—');

  addSectionBand('Furnishing and Amounts');
  addField('First Day Labor or Material Was Provided', formatLongDate(data.firstFurnishingDate) || '—');
  addField('Last Day Labor or Material Was Provided', formatLongDate(data.lastFurnishingDate) || '—');
  addField('Contract Amount, Including Extras', formatCurrency(contractTotal));
  addField('Payments Received on the Contract', formatCurrency(paidToDate));
  addField('Unpaid Contract Balance', formatCurrency(remainingDue));
  addField('Amount Due and Construction Lien Claimed', formatCurrency(remainingDue));

  continuePage();

  addSectionBand('Labor and Materials Furnished');
  addFieldValue(data.workDescription || 'Labor, materials, and/or equipment furnished for the improvement of the above-described property.');
  addSpacer(2);
  addLine(`The claimant claims a construction lien upon the above-described real property in the amount of ${formatCurrency(remainingDue)}.`, 10, true, [30, 30, 30]);
  addSpacer(4);
  addDivider();

  checkPageBreak(15);
  doc.setFontSize(fz(10));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`${(claimantName || 'CLAIMANT').toUpperCase()}, BY`, MARGIN, y);
  doc.setFontSize(fz(8));
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text('DATE', PAGE_WIDTH / 2 + 5, y);
  y += 4;
  doc.text('Original signature of claimant, authorized agent, or attorney', MARGIN, y);
  y += 4;
  doc.setDrawColor(60, 60, 60);
  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
  y += 9;
  doc.setTextColor(30, 30, 30);
  addSignatureLine('Printed Name and Title', 'Telephone');

  addJuratBlock();
  addDrafterAndReturnBlock();
  endDocument();

  // ═══ DOCUMENT 2: DEADLINE CONFIRMATION (reference, 1 page) ══════════════════

  beginDocument({
    label: 'DEADLINE CONFIRMATION',
    recordable: false,
    footerLeft: () => 'DEADLINE CONFIRMATION - non-recordable reference',
    titleText: 'DEADLINE CONFIRMATION',
    subtitleText: claimantName || undefined,
  });

  addSectionBand('Customer-Supplied Project Dates');
  addField('First Furnishing Date', formatLongDate(data.firstFurnishingDate) || '—');
  if (data.projectCompletionDate) addField('Project Completion Date', formatLongDate(data.projectCompletionDate));
  addField('Last Furnishing Date', formatLongDate(data.lastFurnishingDate) || '—');

  addSectionBand('Reported Deadline Calculation');
  addField('Reported Last Furnishing Date', formatLongDate(data.lastFurnishingDate) || '—');

  const deadlineDate = calculateDeadline(data.lastFurnishingDate, data.state, data.role, projectType);
  const deadlineValueText = deadlineDate
    ? formatLongDateObj(deadlineDate, { weekday: true })
    : stateRule?.deadlineCaveat
      ? 'Cannot be auto-calculated for this state — see note below'
      : 'Unable to calculate — verify your last furnishing date';
  // "90th-Day Recording Deadline" reads more precisely than a generic label when
  // there's a single flat day-count to name — only for rule kinds where that's true.
  const deadlineLabel = (() => {
    const rule = stateRule?.deadlineRule;
    if (!rule) return 'Recording Deadline';
    if (rule.kind === 'daysFromLastFurnishing') return `${ordinal(rule.days)}-Day Recording Deadline`;
    if (rule.kind === 'projectTypeDaysFromLastFurnishing') {
      return `${ordinal(projectType === 'commercial' ? rule.commercialDays : rule.residentialDays)}-Day Recording Deadline`;
    }
    return 'Recording Deadline';
  })();
  addField(deadlineLabel, deadlineValueText);

  if (deadlineDate) {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysLeft = daysBetween(todayMidnight, deadlineDate);
    if (daysLeft < 0) {
      addField(
        'Deadline Has Passed',
        `Do not treat this packet as timely or filing-ready. Recording after the statutory deadline generally cannot create a valid lien. Get ${stateLabel} legal advice before taking further action.`
      );
    }
    if (isWeekend(deadlineDate)) {
      addField(
        'Weekend Note',
        `${formatLongDateObj(deadlineDate)} falls on a weekend and the recording office will be closed. Record on or before ${formatLongDateObj(previousBusinessDay(deadlineDate))}.`
      );
    }
  } else if (stateRule?.deadlineCaveat) {
    addField('Note', stateRule.deadlineCaveat);
  }

  addSectionBand('Confirmed Filing Record');
  addBlankLine('Verified Last Lienable Furnishing Date');
  addBlankLine(`Confirmed ${deadlineLabel}`);
  addBlankLine('Supporting Record Location');
  addBlankLine('Confirmed By / Date');

  addSpacer(2);
  addDivider();
  checkPageBreak(10);
  doc.setFontSize(fz(8));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(95, 95, 95);
  doc.text('CALCULATION BASIS', MARGIN, y);
  y += 5;
  doc.setTextColor(30, 30, 30);
  addLine(explainDeadlineBasis(stateRule, stateLabel), 8.5, false, [90, 90, 90]);
  endDocument();

  // ═══ DOCUMENT 3: FILING INSTRUCTIONS (reference, 2 pages) ═══════════════════

  const filingTitle = `${(countyDisplay || stateLabel).toUpperCase()} FILING INSTRUCTIONS`;
  beginDocument({
    label: 'FILING INSTRUCTIONS',
    recordable: false,
    footerLeft: (n) => `${filingTitle}${n > 1 ? '' : ''}`,
    titleText: filingTitle,
    subtitleText: `${stateLabel} ${docTitle === 'CLAIM OF LIEN' ? 'Claim of Lien' : toTitleCase(docTitle)}`,
  });

  if (countyContact) {
    addCalloutBox(
      'Where to Record',
      `${countyContact.officeName}, ${countyContact.address}. Phone: ${countyContact.phone}. Office hours listed by the county: ${countyContact.hours}.${countyContact.submissionNote ? ` ${countyContact.submissionNote}` : ''}`
    );
  } else {
    addCalloutBox(
      'Where to Record',
      `Contact the ${countyDisplay || 'county'} ${recordingOffice} directly for the current recording fee, accepted payment methods, submission requirements (in person, mail, or e-recording), and office hours before filing.`
    );
  }

  addSectionBand('Before Submission');
  const eligibilityClauseItems = [
    'ownership',
    `exact deed${stateRule?.recordingFormat ? ' or Notice-of-Commencement' : ''} legal description`,
    stateRule?.residentialWrittenContractWarning && projectType === 'residential' ? 'residential written contract and amendments' : null,
    'required licensing',
    'amount paid',
    'unpaid balance',
  ].filter((s): s is string => !!s);
  const eligibilityClause = eligibilityClauseItems.length > 1
    ? `${eligibilityClauseItems.slice(0, -1).join(', ')}, and ${eligibilityClauseItems[eligibilityClauseItems.length - 1]}`
    : eligibilityClauseItems.join('');
  const beforeSubmission: [string, string][] = [
    ['Complete the deadline record.', 'Enter the verified last lienable furnishing date and resulting recording deadline on the separate Deadline Confirmation.'],
    ['Complete the Claim.', `Add ${addressLooksComplete(claimantAddress) ? '' : "the claimant's city/state/ZIP, "}signer name/title/phone, actual drafter name/business address, and all notarial fields.`],
    ['Confirm eligibility.', `Verify ${eligibilityClause}.`],
    ['Sign under oath.', 'The claimant or authorized agent/attorney signs before the notary. The notary completes the jurat, commissioned name, county, expiration, acting county if applicable, and seal/stamp.'],
    ['Submit all three pages.', 'Record the complete three-page Claim as one instrument. Do not submit only the signature page.'],
  ];
  beforeSubmission.forEach(([title, desc], i) => addNumberedStep(i + 1, title, desc));

  if (stateRule?.recordingFormat) {
    // Only list checks that depend on what the customer actually entered. The 2.5"
    // top margin, 10-point recordable text, and printed-name-beneath-signature layout
    // are all guaranteed unconditionally by this generator (RECORDING_TOP_MARGIN_MM,
    // fz(), and addSignatureLine) — asking the customer to "verify" something they
    // have no control over and can't get wrong is just noise, not a real check.
    addSectionBand('Format Check');
    [
      "Actual drafter's name and business address appear on the instrument.",
      'Complete legal description is included; a street address or tax/parcel summary alone is not enough.',
    ].forEach((item) => addCheckboxOption(item));
  }

  nextRefPage(filingTitle, 'Service and document control');

  addSectionBand('Payment and Delivery');
  addLine(
    `${countyContact?.paymentNote ?? `Confirm the current recording fee, accepted payment methods, and any card-processing charge directly with the ${recordingOffice} before submission.`} Include a return envelope when mailing if requested.`,
    9,
    false,
    [50, 50, 50]
  );
  addSpacer(3);
  addInlineBlanks(['Fee Amount', 'Confirmed By', 'Date']);

  addSectionBand('Separate Execution');
  addLine(
    `The Claim of Lien, Proof of Service Affidavit, and ${dischargeShortName} are separate documents used at different stages. Each must be completed, signed, and notarized independently when it is used.`,
    9,
    false,
    [50, 50, 50]
  );

  if (stateRule?.postRecordingService) {
    const svc = stateRule.postRecordingService;
    addSectionBand(`After Recording — Serve Within ${svc.days} Days`);
    const afterRecordingSteps: [string, string][] = [
      ['Obtain the recorded copy.', 'Keep the recording receipt and complete recorded instrument.'],
      ['Identify the proper recipient.', `Serve ${svc.servedOn}.`],
      ['Use an authorized method.', `Serve ${svc.methods}.`],
      ['Serve the required documents.', 'Serve the recorded Claim and any proof of Notice-of-Furnishing service recorded with it.'],
      ['Preserve proof.', 'Complete the separate Proof of Service Affidavit and retain the served copy, certified-mail receipt, tracking history, return receipt, and recording receipt.'],
    ];
    afterRecordingSteps.forEach(([title, desc], i) => addNumberedStep(i + 1, title, desc));
  }

  addSectionBand('Enforcement and Discharge');
  const enforcementText = stateRule?.enforcement
    ? `A proceeding to enforce the lien generally must begin ${stateRule.enforcement.deadlineText}.`
    : "Consult a licensed attorney regarding this state's lien-enforcement deadline.";
  addLine(
    `${enforcementText} Recording alone does not produce a money judgment. After full payment or satisfaction, use the separate ${dischargeShortName} and confirm current recording requirements.`,
    9,
    false,
    [50, 50, 50]
  );

  addSectionBand('Official County Contact');
  if (countyContact) {
    addLine(`${countyContact.officeName}${countyContact.website ? ` | ${countyContact.website}` : ''} | ${countyContact.phone}`, 9, false, [50, 50, 50]);
  } else {
    addLine(`${countyDisplay || 'The county'} ${recordingOffice} — contact directly for current office hours, phone number, and submission options.`, 9, false, [50, 50, 50]);
  }

  addSectionBand('Primary Legal References');
  // Lists only the specific sections that matter for filing THIS claim — not a broad
  // Act-range citation. postRecordingService.statute is unqualified to the whole
  // section (covers recording and service together) rather than pinpointed to the
  // service-only subsection, matching the approved bundle's own reference list.
  const legalRefs = [
    stateRule?.postRecordingService && `${stateRule.postRecordingService.statute.replace(/\(\d+\)$/, '')}: recording and post-recording service.`,
    stateRule?.residentialWrittenContractWarning && `${stateRule.residentialWrittenContractWarning.statute}: residential contractor conditions.`,
    stateRule?.enforcement?.statute && `${stateRule.enforcement.statute}: enforcement period.`,
    stateRule?.recordingFormat && `${stateRule.recordingFormat.statute}: recording format and drafter information.`,
  ].filter((s): s is string => !!s);
  addLine(legalRefs.join(' '), 8.5, false, [70, 70, 70]);
  endDocument();

  // ═══ DOCUMENT 4: AFFIDAVIT / PROOF OF SERVICE (reference, 2 pages) ══════════

  const svcSubtitle = 'Service of recorded Claim of Lien';

  const laterUseBanner = () => {
    checkPageBreak(8);
    doc.setFontSize(fz(8));
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 60, 0);
    doc.text('LATER-USE DOCUMENT — NOT PART OF CLAIM', PAGE_WIDTH / 2, y, { align: 'center' });
    y += 7;
    doc.setTextColor(30, 30, 30);
  };

  beginDocument({
    label: 'AFFIDAVIT / PROOF OF SERVICE',
    recordable: false,
    footerLeft: () => 'PROOF OF SERVICE - complete after recording and service',
    titleText: 'AFFIDAVIT / PROOF OF SERVICE',
    subtitleText: svcSubtitle,
  });
  laterUseBanner();

  addLine(
    'Complete only after recording and timely service. Preserve it with the mailing or delivery evidence and the exact documents served.',
    8.5,
    false,
    [70, 70, 70]
  );
  addSpacer(2);

  doc.setFontSize(fz(9));
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`State of ${stateLabel}`, MARGIN, y);
  y += 5;
  doc.text('County of ______________________________', MARGIN, y);
  y += 8;
  doc.setTextColor(30, 30, 30);
  addBlankLine('Affiant Name');
  addMultiBlank('Affiant Address', 2);

  addSectionBand('Recorded Claim');
  addField('Claimant', claimantName || '—');
  addField('Owner / Lessee', data.ownerName || '—');
  addField('Property', data.propertyAddress || '—');
  addBlankLine('Recording / Instrument Number');
  addBlankLine('Date Recorded');

  addSectionBand('Service');
  addBlankLine('Person Served and Capacity');
  addBlankLine('Address Used');
  addLine('METHOD - CHECK EXACTLY ONE', 9, true, [50, 50, 50]);
  addSpacer(1);
  addCheckboxOption('Personal service');
  addCheckboxOption('Certified mail, return receipt requested');
  addBlankLine('Date Personally Served or Deposited in Certified Mail');
  addBlankLine('Certified-Mail Tracking Number (if mailed)');

  nextRefPage('AFFIDAVIT / PROOF OF SERVICE — CONTINUED', 'Jurat and retention');
  laterUseBanner();

  addLine(
    'I served a true copy of the recorded Claim of Lien and a copy of any proof of service recorded in connection with it upon the person identified on the preceding page. Attached are copies of the documents served and the available proof of personal delivery or certified mailing.',
    9,
    false,
    [50, 50, 50]
  );
  addSpacer(4);
  addSignatureLine('Affiant Signature', 'Date Signed');
  addSignatureLine('Affiant Printed Name and Capacity', '');

  addJuratBlock('JURAT', false);

  addSectionBand('Retention');
  addLine(
    'Keep this affidavit, the complete served copy, certified-mail receipt, tracking history, return receipt, and recording receipt together. Attach proof of service to any complaint, cross-claim, or counterclaim filed to enforce the lien.',
    9,
    false,
    [50, 50, 50]
  );
  endDocument();

  // ═══ DOCUMENT 5: DISCHARGE CERTIFICATE (recordable, 2 pages) ════════════════

  const dischargeTitleUpper = discharge.title.toUpperCase();
  // Footer text renders at 10pt on recordable pages (MCL 565.201's floor) — the full
  // title plus "RECORD BOTH PAGES TOGETHER" no longer fits on one line at that size and
  // was wrapping into the page's bottom margin. The on-page title stays full-length;
  // only this compact footer variant drops "CONSTRUCTION".
  const dischargeFooterLabel = dischargeTitleUpper.replace(/\bCONSTRUCTION\s+/, '');
  beginDocument({
    label: dischargeFooterLabel,
    recordable: true,
    footerLeft: (n) => `${dischargeShortName.toUpperCase()} - record ${n === 2 ? 'both' : `all ${n}`} pages together`,
    titleText: dischargeTitleUpper,
    subtitleText: [countyDisplay, stateLabel].filter(Boolean).join(', '),
  });

  addLine(
    'The undersigned lien claimant certifies that the construction lien identified below has been fully paid or otherwise satisfied and is discharged.',
    10,
    false,
    [40, 40, 40]
  );
  addSpacer(3);

  addSectionBand('Lien Claimant and Property');
  addField('Claimant', claimantName || '—');
  addField('Claimant Address', claimantAddress || '—');
  if (!addressLooksComplete(claimantAddress)) addBlankLine('City, State and ZIP — complete before signing');
  addField('Property', data.propertyAddress || '—');
  if (legalDescription) addField('Legal Description', legalDescription);
  else addMultiBlank('Legal Description', 2);
  if (parcelNumber) addField('Parcel Identification / Account Number', parcelNumber);

  addSectionBand('Original Lien');
  addBlankLine('Recording / Instrument Number');
  addBlankLine('Date Original Lien Was Recorded');

  continuePage();

  addSectionBand('Amount Discharged');
  addLine('Use only for a full discharge after full payment or satisfaction', 8.5, false, [90, 90, 90]);

  addSpacer(1);
  addLine(
    'The undersigned certifies that the above-described construction lien has been fully paid or otherwise satisfied and is discharged.',
    9.5,
    false,
    [40, 40, 40]
  );
  addSpacer(2);

  checkPageBreak(8);
  doc.setFontSize(fz(10));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`${(claimantName || 'CLAIMANT').toUpperCase()}, BY`, MARGIN, y);
  y += 7;
  addSignatureLine('', 'Date');
  addSignatureLine('Printed Name and Title', '');

  if (discharge.notarialAct === 'acknowledgment') addAcknowledgmentBlock(claimantName, false);
  else addJuratBlock(undefined, false);

  addDrafterAndReturnBlock();
  endDocument();

  // ═══ DOCUMENT 6 (CONDITIONAL): PRELIMINARY / FURNISHING NOTICE (serve-only, 1 page) ═══

  if (needsMichiganNoticeOfFurnishing) {
    beginDocument({
      label: 'NOTICE OF FURNISHING',
      recordable: false,
      footerLeft: () => `NOTICE OF FURNISHING (${stateRule?.preliminaryNoticeStatute ?? 'MCL 570.1109'}) - serve only, not recorded`,
      titleText: 'NOTICE OF FURNISHING',
      subtitleText: stateRule?.preliminaryNoticeStatute,
    });

    addLine(
      'Serve on the designee and general contractor named in the Notice of Commencement, at the address shown in that notice, personally or by certified mail, within 20 days after first furnishing. If no designee is named, or the designee has died, serve the owner or lessee named in the Notice of Commencement. Late service does not destroy lien rights but limits the lien to labor and material furnished in the 20 days before service and afterward.',
      9,
      false,
      [50, 50, 50]
    );

    addSectionBand('To: Designee and General Contractor');
    addField('Property Owner / Lessee', data.ownerName || '—');
    if (ownerAddress) addField('Owner Address', ownerAddress);
    addField('General Contractor', gcName || '—');
    addBlankLine('Designee Named in the Notice of Commencement (and address)');

    addSectionBand('Labor, Material, or Equipment Furnished');
    addFieldValue(data.workDescription || '—');
    addField('Property Address', [data.propertyAddress, countyDisplay].filter(Boolean).join(', ') || '—');
    if (legalDescription) addField('Legal Description', legalDescription);

    addSectionBand('Claimant');
    addField('Date First Furnished', formatLongDate(data.firstFurnishingDate) || '—');
    addField('Claimant (Furnisher)', claimantName || '—');
    if (claimantAddress) addField('Claimant Address', claimantAddress);
    addField('Role', roleLabel(data.role));
    addField('Contracted With', contractingParty || '—');

    addSpacer(1.5);
    addLine(
      "Retain proof of service. A subcontractor's or supplier's claim of lien must have the proof of service of this Notice of Furnishing attached to it when recorded (MCL 570.1111).",
      8,
      false,
      [70, 70, 70]
    );
    addSpacer(1.5);
    addSignatureLine('Signature of Furnisher', 'Date');
    endDocument();
  } else if (needsPreliminaryNotice || extras.includes('preliminary-notice')) {
    const isPrelimCA = !!stateRule?.usesCaliforniaPreliminaryNoticeLanguage;
    beginDocument({
      label: noticeLabel.toUpperCase(),
      recordable: false,
      footerLeft: () => `${noticeLabel.toUpperCase()} - serve only, not recorded`,
      titleText: noticeLabel.toUpperCase(),
      subtitleText: stateRule?.preliminaryNoticeStatute,
    });

    if (isPrelimCA) {
      addLine('TO: Property Owner and/or Direct Contractor', 10, true, [50, 50, 50]);
      addSpacer(1);
      addLine('PURSUANT TO CALIFORNIA CIVIL CODE §8204, THIS IS TO ADVISE YOU THAT:', 9, true, [50, 50, 50]);
      addSpacer(2);
      addFieldValue(data.workDescription || '—');
      addField('Property Address', data.propertyAddress || '—');
      addField('Estimated Value', formatCurrency(contractTotal));
      addField('Contracting Party', contractingParty || gcName || '—');
    } else {
      addLine('TO: Property Owner and/or General Contractor', 10, true, [50, 50, 50]);
      addSpacer(1);
      addLine(
        'FLORIDA LAW PRESCRIBES THE SERVING OF THIS NOTICE AND RESTRICTS YOUR RIGHT TO MAKE PAYMENTS UNDER YOUR CONTRACT IN ACCORDANCE WITH SECTION 713.06, FLORIDA STATUTES.',
        9,
        true,
        [50, 50, 50]
      );
      addSpacer(2);
      addFieldValue(data.workDescription || '—');
      addField('Property Address', data.propertyAddress || '—');
      addField('County', countyDisplay || '—');
      addField('Contracting Party', contractingParty || gcName || '—');
      addField('Estimated Value', formatCurrency(contractTotal));
    }

    addSpacer(3);
    addSignatureLine('Claimant Signature', 'Date');
    endDocument();
  }

  // ═══ FINAL DOCUMENT: PROJECT INFORMATION RECORD (reference, 1 page) ════════
  // Built last so its "Document Set Included" manifest can list every prior document's
  // real page count — not a guess made before those documents were laid out.

  beginDocument({
    label: 'PROJECT INFORMATION RECORD',
    recordable: false,
    footerLeft: () => 'PROJECT INFORMATION RECORD - non-recordable reference',
    titleText: 'PROJECT INFORMATION RECORD',
    subtitleText: 'Customer-supplied data',
  });

  addSectionBand('Customer and Project');
  addCompactField('Claimant', claimantName || '—');
  addCompactField('Entered claimant address', claimantAddress || '—');
  if (email) addCompactField('Contact email', email);
  addCompactField('Entered role / capacity', roleLabelShort(data.role));
  // The approved format restates the claimant's own name under "General contractor"
  // whenever they're filing as the GC — in addition to the (different) case where a
  // sub/supplier names the separate GC they're not.
  if (isGC) addCompactField('General contractor', claimantName || '—');
  else if (gcName) addCompactField('General contractor', gcName);
  addCompactField('Owner', data.ownerName || '—');
  if (ownerAddress) addCompactField('Owner mailing address', ownerAddress);
  addCompactField('Property', data.propertyAddress || '—');
  addCompactField('County / state', [countyDisplay, stateLabel].filter(Boolean).join(', ') || '—');
  if (parcelNumber) addCompactField('Parcel / account number', parcelNumber);

  addSectionBand('Contract and Source Dates');
  if (data.contractDate) addCompactField('Contract date', formatLongDate(data.contractDate));
  if (data.referenceNumber) addCompactField('Contract / invoice #', data.referenceNumber);
  addCompactField('First furnishing date', formatLongDate(data.firstFurnishingDate) || '—');
  if (data.projectCompletionDate) addCompactField('Reported project completion', formatLongDate(data.projectCompletionDate));
  addCompactField('Reported last furnishing date', formatLongDate(data.lastFurnishingDate) || '—');
  if (data.internalJobNumber) addCompactField('Job / project #', data.internalJobNumber);
  addCompactField('Entered project type', toTitleCase(projectType));
  addCompactField('Contract amount including extras', formatCurrency(contractTotal));
  addCompactField('Payments received', formatCurrency(paidToDate));
  addCompactField('Unpaid contract balance', formatCurrency(remainingDue));
  addCompactField('Reported amount due / lien claimed', formatCurrency(remainingDue));

  // Internal keys used only to line up with docEntries / filter which ones appear in
  // the manifest below — NOT what's actually printed (see documentManifestNames).
  const documentNames = [
    docTitle,
    'Deadline Confirmation',
    'Filing Instructions',
    'Affidavit / Proof of Service',
    dischargeTitleUpper,
    ...(needsMichiganNoticeOfFurnishing ? ['Notice of Furnishing'] : needsPreliminaryNotice || extras.includes('preliminary-notice') ? [noticeLabel] : []),
  ];
  // Sentence-case, human-readable names for the manifest — matches the approved
  // bundle's own wording, which differs from both the all-caps page headings and the
  // shorter "Certificate of Discharge" used in Filing Instructions prose.
  const dischargeManifestName = discharge.manifestTitle ?? discharge.title.toLowerCase();
  const documentManifestNames = [
    `Recordable ${docTitleNatural}`,
    'Deadline Confirmation',
    'Filing Instructions',
    'Affidavit / Proof of Service',
    dischargeManifestName,
    ...(needsMichiganNoticeOfFurnishing ? ['Notice of Furnishing'] : needsPreliminaryNotice || extras.includes('preliminary-notice') ? [noticeLabel] : []),
  ];
  addSectionBand('Document Set Included');
  // Only the documents the customer actually records or serves belong in this
  // manifest — Deadline Confirmation and Filing Instructions are reference sheets
  // about the bundle, not something filed anywhere themselves.
  const manifestSkip = new Set(['Deadline Confirmation', 'Filing Instructions']);
  docEntries.forEach((entry, i) => {
    const key = documentNames[i] ?? `Document ${i + 1}`;
    if (manifestSkip.has(key)) return;
    const displayName = documentManifestNames[i] ?? key;
    const n = entry.endPage - entry.startPage + 1;
    addCompactField(displayName, `${n} page${n === 1 ? '' : 's'}`);
  });

  addSpacer(1);
  addLine(`Reference record only — not part of the ${docTitleNatural}, Proof of Service, or ${dischargeShortName}.`, 8, false, [110, 110, 110]);
  endDocument();

  // ── Stamp per-document footers now that every document knows its own page count ──
  docEntries.forEach((entry) => {
    const total = entry.endPage - entry.startPage + 1;
    // MCL 565.201 sets a 10-point floor for recordable instrument text; this footer
    // was hardcoded to 8pt regardless of page type, so the Claim's and Discharge
    // certificate's own footers were themselves out of compliance.
    const footerSz = entry.recordable ? 10 : 8;
    for (let p = entry.startPage; p <= entry.endPage; p++) {
      doc.setPage(p);
      doc.setFontSize(footerSz);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(130, 130, 130);
      const left = doc.splitTextToSize(entry.footerLeft(total), CONTENT_WIDTH - 32);
      doc.text(left, MARGIN, FOOTER_Y);
      doc.text(`Page ${p - entry.startPage + 1} of ${total}`, PAGE_WIDTH - MARGIN, FOOTER_Y, { align: 'right' });
    }
  });

  return doc.output('blob');
}
