// PDFGenerator.ts — Michigan-compliant lien bundle generator

export interface LienFormData {
  state: string;
  role: string;
  claimantName?: string;
  claimantAddress?: string;
  email?: string;
  ownerName: string;
  ownerAddress?: string;
  propertyAddress: string;
  legalDescription?: string;  // Separate legal description field
  county: string;
  gcName?: string;
  hiringParty?: string;
  projectType?: 'residential' | 'commercial';
  contractAmount: string;
  firstFurnishingDate: string;
  lastFurnishingDate: string;
  deadline?: string;
  extras?: ('lien-waiver' | 'notice-of-intent' | 'lien-release' | 'preliminary-notice')[];
}

const STATE_CITATIONS: Record<string, string> = {
  michigan: 'Pursuant to MCL 570.1101–570.1305 (Michigan Construction Lien Act, as amended 2023)',
  california: 'Pursuant to California Civil Code §8000–9566 (SB 189, effective July 1, 2012)',
  texas: 'Pursuant to Texas Property Code Chapter 53 (as amended by HB 2237, eff. Jan. 1, 2022)',
  florida: 'Pursuant to Florida Statute §713.06',
};

const FILING_INSTRUCTIONS: Record<string, string> = {
  michigan: `Michigan Construction Lien Filing Instructions

1. NOTARIZATION REQUIRED: Michigan law (MCL 570.1107) requires the Claim of Lien to be verified under oath. Sign before a notary public before filing.
2. LEGAL DESCRIPTION: A street address alone may not be sufficient. Include the full legal property description from county deed or assessor records.
3. NOTICE OF FURNISHING: Subcontractors and suppliers must serve a Notice of Furnishing within 20 days of first furnishing (MCL 570.1109). See last page of this bundle.
4. SWORN STATEMENT (GCs): General contractors may be required to provide a sworn statement listing all subcontractors and suppliers before receiving payment (MCL 570.1110).
5. FILE WITH: Register of Deeds in the county where the property is located.
6. DEADLINE: 90 days from last furnishing (residential) or 180 days (commercial).
7. After recording, serve a copy on the property owner by certified mail or personal delivery.
8. File an Affidavit of Service with the Register of Deeds after serving the owner.
9. LAWSUIT DEADLINE: File suit to enforce the lien within 1 year of recording.`,

  california: `California Mechanics Lien Filing Instructions

1. A Preliminary Notice (20-Day Notice) must have been served within 20 days of first furnishing.
2. Record the Claim of Mechanics Lien with the County Recorder's Office.
3. After recording, serve the property owner within 20 days via certified mail.
4. A mechanics lien expires 90 days from recording unless a lawsuit is filed to enforce it.`,

  texas: `Texas Mechanic's Lien Filing Instructions

1. File the Affidavit Claiming Mechanic's Lien with the County Clerk.
2. Serve a copy on the property owner by certified mail within 5 days of filing.
3. Monthly notices are required for subcontractors — see Texas Property Code Ch. 53.
4. Liens expire 2 years from filing unless a lawsuit is brought.`,

  florida: `Florida Construction Lien / Notice to Owner Filing Instructions

1. A Notice to Owner (NTO) must be served on the property owner within 45 days of first furnishing.
2. File the lien with the Clerk of the Circuit Court.
3. After filing a lien, a lawsuit to enforce must be filed within 1 year.`,
};

const DEFAULT_FILING_INSTRUCTIONS = `General Mechanics Lien Filing Instructions

1. File the completed Claim of Lien with the County Recorder, Register of Deeds, or Clerk of Court.
2. Pay the applicable recording/filing fee.
3. Serve a copy on the property owner via certified mail.
4. File an Affidavit of Service after serving the owner.
5. Consult a licensed construction attorney in your state for guidance.`;

function getFilingInstructions(state: string): string {
  return FILING_INSTRUCTIONS[state] || DEFAULT_FILING_INSTRUCTIONS;
}

function getStateCitation(state: string): string {
  return STATE_CITATIONS[state] || 'Pursuant to applicable state construction lien statutes';
}

function getDocumentTitle(state: string, role: string): string {
  if (state === 'florida' && role !== 'general-contractor') return 'NOTICE TO OWNER';
  return 'CLAIM OF MECHANICS LIEN';
}

function daysUntilDeadline(deadlineStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineStr);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}

function formatCurrency(amount: string): string {
  const num = parseFloat(amount.replace(/,/g, ''));
  if (isNaN(num)) return `$${amount}`;
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

function toTitleCase(str: string): string {
  if (!str) return '';
  return str.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').replace(/-/g, ' ');
}

function normaliseCounty(county: string): string {
  return toTitleCase(county.trim()).replace(/\s+County$/i, '').trim();
}

function calculateDeadline(lastFurnishingDate: string, state: string, role: string, projectType?: string): string {
  if (!lastFurnishingDate) return '';
  const last = new Date(lastFurnishingDate);
  if (isNaN(last.getTime())) return '';

  if (state === 'texas') {
    const d = new Date(last);
    d.setMonth(d.getMonth() + (role === 'general-contractor' ? 4 : 3), 15);
    return d.toISOString().split('T')[0];
  }

  let days = state === 'michigan' && projectType === 'commercial' ? 180 : 90;
  if (state === 'florida') days = 45;

  const deadline = new Date(last);
  deadline.setDate(deadline.getDate() + days);
  return deadline.toISOString().split('T')[0];
}

export async function generateLienBundle(data: LienFormData): Promise<Blob> {
  const extras = data.extras ?? [];
  const claimantName = data.claimantName ?? '';
  const claimantAddress = data.claimantAddress ?? '';
  const email = data.email ?? '';
  const gcName = data.gcName ?? '';
  const hiringParty = data.hiringParty ?? '';
  const ownerAddress = data.ownerAddress ?? '';
  const legalDescription = data.legalDescription ?? '';
  const projectType = data.projectType ?? 'residential';

  const countyBase = normaliseCounty(data.county);
  const countyDisplay = `${countyBase} County`;

  const needsMichiganNoticeOfFurnishing =
    data.state === 'michigan' &&
    ['subcontractor', 'sub-subcontractor', 'material-supplier', 'equipment-rental'].includes(data.role);

  const needsPreliminaryNotice =
    (data.state === 'california' || data.state === 'florida') &&
    (data.role === 'subcontractor' || data.role === 'material-supplier');

  const hasExtraPage = needsMichiganNoticeOfFurnishing || needsPreliminaryNotice || extras.includes('preliminary-notice');
  const totalPages = hasExtraPage ? 6 : 5;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  const MARGIN = 20;
  const PAGE_WIDTH = 215.9;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  let y = MARGIN;

  const resetY = () => { y = MARGIN; };
  const checkPageBreak = (needed = 10) => { if (y + needed > 270) { doc.addPage(); resetY(); } };

  const addLine = (text: string, fontSize = 10, isBold = false, color: [number, number, number] = [30, 30, 30]) => {
    checkPageBreak(fontSize * 0.5 + 4);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * (fontSize * 0.4 + 2);
  };

  const addSpacer = (mm = 5) => { y += mm; };

  const addDivider = () => {
    checkPageBreak(6);
    doc.setDrawColor(180, 180, 180);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
  };

  const addSectionHeader = (text: string) => {
    addSpacer(4);
    checkPageBreak(12);
    doc.setFillColor(30, 47, 110);
    doc.rect(MARGIN, y - 1, CONTENT_WIDTH, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(text.toUpperCase(), MARGIN + 3, y + 4.5);
    y += 10;
    doc.setTextColor(30, 30, 30);
  };

  const addLabelValue = (label: string, value: string) => {
    checkPageBreak(10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 4;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(value || '—', CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 3;
  };

  const addBlankField = (label: string, lines = 1) => {
    checkPageBreak(lines * 8 + 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label.toUpperCase() + ':', MARGIN, y);
    y += 4;
    for (let i = 0; i < lines; i++) {
      doc.setDrawColor(150, 150, 150);
      doc.line(MARGIN, y + 4, MARGIN + CONTENT_WIDTH, y + 4);
      y += 8;
    }
    y += 2;
  };

  const addNotaryBlock = () => {
    checkPageBreak(50);
    addSpacer(6);
    addDivider();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('NOTARIZATION', MARGIN, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const notaryText = `State of ${toTitleCase(data.state)}\nCounty of ${countyDisplay}\n\nSubscribed and sworn to before me this _______ day of __________________, 20____`;
    const notaryLines = doc.splitTextToSize(notaryText, CONTENT_WIDTH);
    doc.text(notaryLines, MARGIN, y);
    y += notaryLines.length * 4.5 + 6;
    doc.line(MARGIN, y, MARGIN + 80, y);
    doc.text('Notary Public Signature', MARGIN, y + 4);
    doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
    doc.text('Commission Expires', PAGE_WIDTH / 2 + 5, y + 4);
    y += 14;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('[NOTARY SEAL]', MARGIN, y);
    y += 6;
  };

  const addPageNumber = (pageNum: number, total: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNum} of ${total}`, PAGE_WIDTH / 2, 285, { align: 'center' });
    doc.text('MechanicsLienForm.com', MARGIN, 285);
  };

  // ═══ PAGE 1: Mechanics Lien Claim ═══════════════════════════════════════════

  const docTitle = getDocumentTitle(data.state, data.role);
  const citation = getStateCitation(data.state);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const citLines = doc.splitTextToSize(citation, CONTENT_WIDTH);
  doc.text(citLines, MARGIN, y);
  y += citLines.length * 4 + 4;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 47, 110);
  doc.text(docTitle, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`State of ${toTitleCase(data.state)} — ${countyDisplay}`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;

  addDivider();

  addSectionHeader('Claimant Information');
  addLabelValue('Claimant Name', claimantName);
  addLabelValue('Claimant Address', claimantAddress);
  addLabelValue('Role / Capacity', roleLabel(data.role));
  if (email) addLabelValue('Contact Email', email);

  addSectionHeader('Property Owner');
  addLabelValue('Owner Name', data.ownerName);
  if (ownerAddress) addLabelValue('Owner Mailing Address', ownerAddress);

  addSectionHeader('Property Subject to Lien');
  addLabelValue('Property Address', data.propertyAddress);

  // Legal description — shown if provided, otherwise blank field
  if (legalDescription) {
    addLabelValue('Legal Description', legalDescription);
  } else {
    addBlankField('Legal Property Description (from deed records)', 3);
    if (data.state === 'michigan') {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 80, 0);
      const miNote = doc.splitTextToSize('IMPORTANT (Michigan): Include the full legal property description. A street address alone may be insufficient under MCL 570.1107.', CONTENT_WIDTH);
      doc.text(miNote, MARGIN, y);
      y += miNote.length * 3.5 + 4;
      doc.setTextColor(30, 30, 30);
    }
  }

  addLabelValue('County', countyDisplay);
  addLabelValue('State', toTitleCase(data.state));

  if (gcName) {
    addSectionHeader('General Contractor');
    addLabelValue('General Contractor Name', gcName);
  }

  if (hiringParty) {
    addSectionHeader('Contracting / Hiring Party');
    addLabelValue('Party Who Contracted Claimant', hiringParty);
  }

  addSectionHeader('Claim Details');
  addLabelValue('Amount Claimed', formatCurrency(data.contractAmount));
  addLabelValue('First Furnishing Date', data.firstFurnishingDate);
  addLabelValue('Last Furnishing Date', data.lastFurnishingDate);
  if (data.state === 'michigan') addLabelValue('Project Type', projectType === 'commercial' ? 'Commercial (180-day deadline)' : 'Residential (90-day deadline)');
  addLabelValue('Nature of Claim', 'Labor, materials, and/or equipment furnished to the above-described project.');

  addSpacer(6);
  checkPageBreak(30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const statement = `The undersigned claimant hereby claims a lien upon the above-described property for the sum of ${formatCurrency(data.contractAmount)}, being the amount due and unpaid for labor, services, materials, and/or equipment furnished to the project, all as more fully described herein. This lien is claimed pursuant to the above-referenced statute.`;
  const stmtLines = doc.splitTextToSize(statement, CONTENT_WIDTH);
  doc.text(stmtLines, MARGIN, y);
  y += stmtLines.length * 5 + 8;

  checkPageBreak(70);
  addDivider();
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CLAIMANT SIGNATURE:', MARGIN, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.text('Signature', MARGIN, y + 4);
  doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
  doc.text('Date', PAGE_WIDTH / 2 + 5, y + 4);
  y += 14;
  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.text('Printed Name', MARGIN, y + 4);
  doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
  doc.text('Company / Title', PAGE_WIDTH / 2 + 5, y + 4);
  y += 14;
  doc.line(MARGIN, y, MARGIN + 100, y);
  doc.text('Business Address', MARGIN, y + 4);
  doc.line(PAGE_WIDTH / 2 + 20, y, PAGE_WIDTH - MARGIN, y);
  doc.text('Phone', PAGE_WIDTH / 2 + 20, y + 4);
  y += 14;

  addNotaryBlock();
  addPageNumber(1, totalPages);

  // ═══ PAGE 2: Deadline Confirmation ══════════════════════════════════════════

  doc.addPage();
  resetY();

  const computedDeadline = calculateDeadline(data.lastFurnishingDate, data.state, data.role, projectType);
  const daysLeft = daysUntilDeadline(computedDeadline);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 47, 110);
  doc.text('DEADLINE CONFIRMATION', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;

  addDivider();
  addSpacer(4);
  addLine('Your lien must be filed by:', 10, false, [80, 80, 80]);

  const deadlineDate = new Date(computedDeadline);
  const deadlineFmt = !isNaN(deadlineDate.getTime())
    ? deadlineDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unable to calculate — verify your last furnishing date';
  addLine(deadlineFmt, 16, true, [30, 47, 110]);

  addSpacer(6);

  const daysColor: [number, number, number] = daysLeft < 7 ? [185, 28, 28] : daysLeft <= 30 ? [180, 100, 0] : [22, 163, 74];
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...daysColor);
  if (daysLeft < 0) doc.text(`WARNING: DEADLINE PASSED ${Math.abs(daysLeft)} DAYS AGO`, PAGE_WIDTH / 2, y, { align: 'center' });
  else if (daysLeft === 0) doc.text('WARNING: YOUR DEADLINE IS TODAY', PAGE_WIDTH / 2, y, { align: 'center' });
  else doc.text(`As of today, you have ${daysLeft} days remaining to file.`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;

  if (data.state === 'michigan') {
    addSpacer(4);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 47, 110);
    doc.text(`Michigan ${toTitleCase(projectType)} project: ${projectType === 'commercial' ? '180' : '90'}-day statutory deadline from last furnishing.`, PAGE_WIDTH / 2, y, { align: 'center' });
    y += 8;
    doc.setTextColor(30, 30, 30);
  }

  if (daysLeft > 0 && daysLeft <= 30) {
    addSpacer(4);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    const urgentLines = doc.splitTextToSize('URGENT: Your filing deadline is approaching. File your lien immediately.', CONTENT_WIDTH);
    doc.text(urgentLines, PAGE_WIDTH / 2, y, { align: 'center' });
    y += urgentLines.length * 7 + 6;
  }

  addSpacer(4);
  addDivider();
  addLine('Steps after receiving this bundle:', 11, true);
  addSpacer(2);
  [
    '1. Complete any blank fields (legal description, etc.) on Page 1.',
    '2. Sign Page 1 before a notary public (required in Michigan).',
    '3. File the notarized lien with the County Register of Deeds / Recorder.',
    '4. Serve a copy on the property owner via certified mail.',
    '5. Complete and file the Affidavit of Service (Page 4) with the Register of Deeds.',
    '6. If unpaid, file suit to enforce the lien within 1 year of recording.',
  ].forEach((item) => { addLine(item, 9, false, [60, 60, 60]); addSpacer(2); });

  addSpacer(4);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('For informational purposes only. Verify with a licensed attorney in your state.', PAGE_WIDTH / 2, 270, { align: 'center', maxWidth: CONTENT_WIDTH });

  addPageNumber(2, totalPages);

  // ═══ PAGE 3: Filing Instructions ════════════════════════════════════════════

  doc.addPage();
  resetY();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 47, 110);
  doc.text('FILING INSTRUCTIONS', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`${toTitleCase(data.state)} — ${countyDisplay}`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;

  addDivider();

  const instructions = getFilingInstructions(data.state);
  instructions.split('\n').forEach((line) => {
    addLine(line, line.match(/^\d+\./) ? 9 : 10, line === instructions.split('\n')[0], [50, 50, 50]);
    if (line.trim() === '') addSpacer(2);
  });

  addSpacer(8);
  addDivider();
  addLine('Documents Required for Filing:', 10, true);
  addSpacer(3);
  [
    data.state === 'michigan' ? '[ ]  Notarized Claim of Lien (sign before a notary BEFORE filing)' : '[ ]  Original signed Claim of Lien (this document)',
    '[ ]  Notice of Furnishing (subcontractors/suppliers — see last page)',
    '[ ]  Photo ID (in some counties)',
    '[ ]  Recording fee',
    '[ ]  Self-addressed stamped envelope (for return of recorded document)',
  ].forEach((d) => { addLine(d, 9, false, [50, 50, 50]); addSpacer(3); });

  addPageNumber(3, totalPages);

  // ═══ PAGE 4: Proof of Service Affidavit ════════════════════════════════════

  doc.addPage();
  resetY();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 47, 110);
  doc.text('AFFIDAVIT OF SERVICE', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text('Complete AFTER recording and serving the owner. File with Register of Deeds.', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;
  addDivider();

  addLine(`State of ${toTitleCase(data.state)}\nCounty of ${countyDisplay}\n\nThe undersigned, being duly sworn, states the following:`, 10, false, [50, 50, 50]);
  addSpacer(6);

  addBlankField('Affiant Name (Print)', 1);
  addBlankField('Address of Affiant', 2);
  addSpacer(4);
  addLine('I served a copy of the Claim of Mechanics Lien upon:', 10, false, [50, 50, 50]);
  addSpacer(4);
  addBlankField('Name of Person Served', 1);
  addBlankField('Address Where Served', 2);
  addSpacer(4);

  addLine('Method of Service:', 10, false, [50, 50, 50]);
  addSpacer(2);
  ['[ ]  Personal Delivery', '[ ]  Certified Mail — Tracking #: _______________________________', '[ ]  First Class Mail'].forEach((m) => { addLine(m, 9, false, [50, 50, 50]); addSpacer(4); });

  addBlankField('Date of Service', 1);
  addSpacer(6);
  addDivider();

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(60, 60, 60);
  const oathLines = doc.splitTextToSize(`I declare under penalty of perjury under the laws of the State of ${toTitleCase(data.state)} that the foregoing is true and correct.`, CONTENT_WIDTH);
  doc.text(oathLines, MARGIN, y);
  y += oathLines.length * 5 + 10;

  checkPageBreak(20);
  doc.setFont('helvetica', 'normal');
  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.text('Affiant Signature', MARGIN, y + 4);
  doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
  doc.text('Date Signed', PAGE_WIDTH / 2 + 5, y + 4);
  y += 14;

  addNotaryBlock();
  addPageNumber(4, totalPages);

  // ═══ PAGE 5: Lien Release Form ══════════════════════════════════════════════

  doc.addPage();
  resetY();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 47, 110);
  doc.text('RELEASE OF MECHANICS LIEN', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Complete upon receiving full payment to release the recorded lien.', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;
  addDivider();

  addLine('KNOW ALL PERSONS BY THESE PRESENTS, that the undersigned claimant, for and in consideration of the full payment of the sum described below, does hereby release, discharge, and waive any and all mechanics lien rights or claims of lien upon the property described herein.', 9, false, [50, 50, 50]);
  addSpacer(6);

  addBlankField('Claimant Name', 1);
  addBlankField('Address of Claimant', 2);
  addSpacer(4);

  addLine('Property from which the lien is released:', 10, true);
  addSpacer(2);
  addLabelValue('Property Address', data.propertyAddress);
  if (legalDescription) addLabelValue('Legal Description', legalDescription);
  addLabelValue('County', countyDisplay);
  addLabelValue('State', toTitleCase(data.state));
  addSpacer(4);

  addLine('Original lien information:', 10, true);
  addSpacer(2);
  addBlankField('Recording Number / Instrument Number', 1);
  addBlankField('Date of Original Lien Recording', 1);
  addBlankField('Amount for which lien is released', 1);
  addSpacer(6);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(60, 60, 60);
  const relOathLines = doc.splitTextToSize('I declare under penalty of perjury that I have received full payment and that the mechanics lien described above is hereby fully and unconditionally released and discharged.', CONTENT_WIDTH);
  doc.text(relOathLines, MARGIN, y);
  y += relOathLines.length * 5 + 10;

  doc.setFont('helvetica', 'normal');
  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.text('Claimant Signature', MARGIN, y + 4);
  doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
  doc.text('Date', PAGE_WIDTH / 2 + 5, y + 4);
  y += 14;
  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.text('Printed Name', MARGIN, y + 4);
  doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
  doc.text('Title', PAGE_WIDTH / 2 + 5, y + 4);
  y += 14;

  addNotaryBlock();
  addPageNumber(5, totalPages);

  // ═══ PAGE 6 (CONDITIONAL) ═══════════════════════════════════════════════════

  if (needsMichiganNoticeOfFurnishing) {
    doc.addPage();
    resetY();

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Pursuant to MCL 570.1109 (Michigan Construction Lien Act)', PAGE_WIDTH / 2, y, { align: 'center' });
    y += 6;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 47, 110);
    doc.text('NOTICE OF FURNISHING', PAGE_WIDTH / 2, y, { align: 'center' });
    y += 12;

    addDivider();

    addLine('IMPORTANT: Serve on the property owner AND general contractor within 20 days of first furnishing. Failure to do so may limit your lien rights (MCL 570.1109).', 9, true, [150, 60, 0]);
    addSpacer(6);

    addLine('TO: Property Owner / General Contractor', 10, true);
    addSpacer(4);
    addLabelValue('Property Owner', data.ownerName);
    if (ownerAddress) addLabelValue('Owner Address', ownerAddress);
    addLabelValue('General Contractor', gcName || '[General Contractor Name]');
    addSpacer(4);

    addLine('PLEASE TAKE NOTICE that the undersigned is furnishing or will furnish the following labor, material, or equipment:', 9, false, [50, 50, 50]);
    addSpacer(4);
    addBlankField('Description of Labor / Materials / Equipment', 3);

    addLine('To the project located at:', 9, false, [50, 50, 50]);
    addLabelValue('Property Address', data.propertyAddress);
    addLabelValue('County', countyDisplay);
    addSpacer(4);

    addLabelValue('Date First Furnished', data.firstFurnishingDate);
    addLabelValue('Claimant (Furnisher)', claimantName);
    if (claimantAddress) addLabelValue('Claimant Address', claimantAddress);
    addLabelValue('Role', roleLabel(data.role));
    if (hiringParty) addLabelValue('Contracted By (Hiring Party)', hiringParty);
    addSpacer(6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 60);
    const miNote2 = doc.splitTextToSize('Serve by personal delivery or first-class mail with certificate of mailing. Retain proof of service. This notice must be served before filing a Claim of Lien.', CONTENT_WIDTH);
    doc.text(miNote2, MARGIN, y);
    y += miNote2.length * 4 + 8;

    checkPageBreak(25);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.line(MARGIN, y, MARGIN + 80, y);
    doc.text('Signature of Furnisher', MARGIN, y + 4);
    doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
    doc.text('Date', PAGE_WIDTH / 2 + 5, y + 4);

    addPageNumber(6, totalPages);

  } else if (needsPreliminaryNotice || extras.includes('preliminary-notice')) {
    doc.addPage();
    resetY();

    const isPrelimCA = data.state === 'california';
    const noticeTitle = isPrelimCA ? '20-DAY PRELIMINARY NOTICE' : 'NOTICE TO OWNER';
    const noticeStatute = isPrelimCA ? 'Pursuant to California Civil Code §8204' : 'Pursuant to Florida Statute §713.06(2)';

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(noticeStatute, PAGE_WIDTH / 2, y, { align: 'center' });
    y += 6;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 47, 110);
    doc.text(noticeTitle, PAGE_WIDTH / 2, y, { align: 'center' });
    y += 12;

    addDivider();

    if (isPrelimCA) {
      addLine('TO: Property Owner and/or Direct Contractor\n\nPURSUANT TO CALIFORNIA CIVIL CODE §8204, THIS IS TO ADVISE YOU THAT:', 10, true, [50, 50, 50]);
      addSpacer(4);
      addBlankField('Description of Labor / Materials', 3);
      addLabelValue('Property Address', data.propertyAddress);
      addLabelValue('Estimated Value', formatCurrency(data.contractAmount));
      addLabelValue('Contracting Party', gcName || hiringParty || '[Property Owner / General Contractor]');
    } else {
      addLine('TO: Property Owner and/or General Contractor\n\nNOTICE TO OWNER\n\nFLORIDA LAW PRESCRIBES THE SERVING OF THIS NOTICE AND RESTRICTS YOUR RIGHT TO MAKE PAYMENTS UNDER YOUR CONTRACT IN ACCORDANCE WITH SECTION 713.06, FLORIDA STATUTES.', 10, true, [50, 50, 50]);
      addSpacer(4);
      addBlankField('Description of Services / Materials', 3);
      addLabelValue('Property Address', data.propertyAddress);
      addLabelValue('County', countyDisplay);
      addLabelValue('Contracting Party', gcName || hiringParty || '[General Contractor / Owner]');
      addLabelValue('Estimated Value', formatCurrency(data.contractAmount));
    }

    addSpacer(6);
    addDivider();
    doc.setFont('helvetica', 'normal');
    doc.line(MARGIN, y, MARGIN + 80, y);
    doc.text('Claimant Signature', MARGIN, y + 4);
    doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
    doc.text('Date', PAGE_WIDTH / 2 + 5, y + 4);

    addPageNumber(6, totalPages);
  }

  return doc.output('blob');
}
