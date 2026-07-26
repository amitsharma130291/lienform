// PDFGenerator.ts
// Generates multi-page lien document bundles using jsPDF.
// Imported dynamically on the client (jsPDF is browser-only).

export interface LienFormData {
  state: string;
  role: string;
  ownerName: string;
  propertyAddress: string;
  gcName: string;
  contractAmount: string;
  firstFurnishingDate: string;
  lastFurnishingDate: string;
  claimantName?: string;
  county: string;
  deadline: string; // pre-calculated ISO date string
  extras: ('lien-waiver' | 'notice-of-intent' | 'lien-release' | 'preliminary-notice')[];
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const STATE_CITATIONS: Record<string, string> = {
  michigan:
    'Pursuant to MCL 570.1101–570.1305 (Michigan Construction Lien Act, as amended 2023)',
  california:
    'Pursuant to California Civil Code §8000–9566 (SB 189, effective July 1, 2012)',
  texas:
    'Pursuant to Texas Property Code Chapter 53 (as amended by HB 2237, eff. Jan. 1, 2022)',
  florida: 'Pursuant to Florida Statute §713.06',
};

const FILING_INSTRUCTIONS: Record<string, string> = {
  michigan: `Michigan Construction Lien Filing Instructions

1. The Claim of Lien must be filed with the Register of Deeds in the county where the property is located.
2. Filing fee is typically $30–$60 depending on the county.
3. The lien must be filed within the statutory deadline (90 days from last furnishing for residential; 180 days for commercial).
4. After recording, serve a copy on the property owner via certified mail or personal delivery.
5. A copy of the notice of furnishing (if required) must be filed BEFORE filing the lien claim.
6. Contact the county Register of Deeds for current fee schedules and accepted formats.`,

  california: `California Mechanics Lien Filing Instructions

1. Record the Claim of Mechanics Lien with the County Recorder's Office in the county where the property is located.
2. Filing fees are set by the county (typically $15–$25 for the first page plus $3 per additional page).
3. After recording, serve the property owner within 20 days via certified mail.
4. A Preliminary Notice (20-Day Notice) must have been served within 20 days of first furnishing materials/labor.
5. A mechanics lien expires 90 days from recording unless a lawsuit is filed to enforce it.
6. Go to your county recorder's website for current hours, fees, and e-recording options.`,

  texas: `Texas Mechanic's Lien Filing Instructions

1. File the Affidavit Claiming Mechanic's Lien with the County Clerk in the county where the property is located.
2. Filing fees are set by the county (approximately $15–$30 for the first page).
3. Serve a copy on the property owner by certified mail within 5 days of filing.
4. Monthly notices (in addition to the lien claim) are required for subcontractors — consult the Texas Property Code Chapter 53 for details.
5. Retain proof of service and all correspondence related to the lien.
6. Liens expire 2 years from filing unless a lawsuit is brought.`,

  florida: `Florida Construction Lien / Notice to Owner Filing Instructions

1. A Notice to Owner (NTO) must be served on the property owner within 45 days of first furnishing services or materials.
2. The lien itself must be filed with the Clerk of the Circuit Court in the county where the property is located.
3. Service: send the NTO via certified mail, return receipt requested; retain proof of service.
4. Filing fee is typically $10 per page.
5. After filing a lien, a lawsuit to enforce must be filed within 1 year.
6. Florida requires strict compliance — consult the Florida Lien Law (F.S. Chapter 713) for your specific situation.`,
};

const DEFAULT_FILING_INSTRUCTIONS = `General Mechanics Lien Filing Instructions

1. File the completed Claim of Lien with the appropriate county recording office (typically County Recorder, Register of Deeds, or Clerk of Court) in the county where the property is located.
2. Pay the applicable recording/filing fee (varies by county and state, typically $15–$50).
3. Serve a copy of the recorded lien on the property owner via certified mail with return receipt.
4. Retain all documentation: contracts, invoices, daily logs, and proof of service.
5. Be aware of your state's statute of limitations for enforcing the lien through litigation.
6. Consult a licensed construction attorney in your state for guidance specific to your situation.`;

function getFilingInstructions(state: string): string {
  return FILING_INSTRUCTIONS[state] || DEFAULT_FILING_INSTRUCTIONS;
}

function getStateCitation(state: string): string {
  return STATE_CITATIONS[state] || 'Pursuant to applicable state construction lien statutes';
}

function getDocumentTitle(state: string, role: string): string {
  if (state === 'florida' && role !== 'general-contractor') {
    return 'NOTICE TO OWNER';
  }
  return 'CLAIM OF MECHANICS LIEN';
}

function daysUntilDeadline(deadlineStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineStr);
  const diff = deadline.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

function calculateDeadline(lastFurnishingDate: string, state: string, role: string): string {
  if (!lastFurnishingDate) return '';
  const last = new Date(lastFurnishingDate);
  if (isNaN(last.getTime())) return '';

  if (state === 'texas') {
    const d = new Date(last);
    if (role === 'general-contractor') {
      d.setMonth(d.getMonth() + 4, 15);
    } else {
      d.setMonth(d.getMonth() + 3, 15);
    }
    return d.toISOString().split('T')[0];
  }

  const daysMap: Record<string, number> = {
    michigan: 90,
    california: 90,
    florida: 45,
  };
  const days = daysMap[state] ?? 90;
  const deadline = new Date(last);
  deadline.setDate(deadline.getDate() + days);
  return deadline.toISOString().split('T')[0];
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

export async function generateLienBundle(data: LienFormData): Promise<Blob> {
  // Dynamic import — jsPDF is browser-only
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  const MARGIN = 20;
  const PAGE_WIDTH = 215.9;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  let y = MARGIN;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetY = () => { y = MARGIN; };

  const checkPageBreak = (needed: number = 10) => {
    if (y + needed > 270) {
      doc.addPage();
      resetY();
    }
  };

  const addLine = (text: string, fontSize: number = 10, isBold: boolean = false, color: [number, number, number] = [30, 30, 30]) => {
    checkPageBreak(fontSize * 0.5 + 4);
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * (fontSize * 0.4 + 2);
  };

  const addSpacer = (mm: number = 5) => { y += mm; };

  const addDivider = () => {
    checkPageBreak(6);
    doc.setDrawColor(180, 180, 180);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
  };

  const addSectionHeader = (text: string) => {
    addSpacer(4);
    checkPageBreak(12);
    doc.setFillColor(30, 47, 110); // navy-800
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

  const addBlankField = (label: string, lines: number = 1) => {
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

  const addPageNumber = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH / 2, 285, { align: 'center' });
    doc.text('LienForm.com', MARGIN, 285);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1: Mechanics Lien Claim
  // ═══════════════════════════════════════════════════════════════════════════

  const docTitle = getDocumentTitle(data.state, data.role);
  const citation = getStateCitation(data.state);

  // Citation
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const citLines = doc.splitTextToSize(citation, CONTENT_WIDTH);
  doc.text(citLines, MARGIN, y);
  y += citLines.length * 4 + 4;

  // Document title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 47, 110); // navy-800
  doc.text(docTitle, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;

  // Jurisdiction
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(
    `State of ${toTitleCase(data.state)} — ${data.county} County`,
    PAGE_WIDTH / 2,
    y,
    { align: 'center' }
  );
  y += 8;

  addDivider();

  // Claimant
  addSectionHeader('Claimant Information');
  addLabelValue('Claimant Name', data.claimantName || '');
  addLabelValue('Role / Capacity', roleLabel(data.role));
  addLabelValue('Contact Email', data.email);

  // Owner
  addSectionHeader('Property Owner');
  addLabelValue('Owner Name', data.ownerName);

  // Property
  addSectionHeader('Property Subject to Lien');
  addLabelValue('Property Address', data.propertyAddress);
  addLabelValue('County', data.county);
  addLabelValue('State', toTitleCase(data.state));

  // Contractor (if applicable)
  if (data.gcName) {
    addSectionHeader('General Contractor');
    addLabelValue('General Contractor Name', data.gcName);
  }

  // Claim
  addSectionHeader('Claim Details');
  addLabelValue('Amount Claimed', formatCurrency(data.contractAmount));
  addLabelValue('First Furnishing Date', data.firstFurnishingDate);
  addLabelValue('Last Furnishing Date', data.lastFurnishingDate);
  addLabelValue('Nature of Claim', 'Labor, materials, and/or equipment furnished to the above-described project.');

  // Statement
  addSpacer(6);
  checkPageBreak(30);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const statement = `The undersigned claimant hereby claims a lien upon the above-described property for the sum of ${formatCurrency(data.contractAmount)}, being the amount due and unpaid for labor, services, materials, and/or equipment furnished to the project, all as more fully described herein. This lien is claimed pursuant to the above-referenced statute.`;
  const stmtLines = doc.splitTextToSize(statement, CONTENT_WIDTH);
  doc.text(stmtLines, MARGIN, y);
  y += stmtLines.length * 5 + 8;

  // Signature block
  checkPageBreak(40);
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
  doc.text('Title / Capacity', PAGE_WIDTH / 2 + 5, y + 4);

  addPageNumber(1, 6);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2: Deadline Confirmation
  // ═══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  resetY();

  const computedDeadline = calculateDeadline(data.lastFurnishingDate, data.state, data.role);
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

  const daysColor: [number, number, number] =
    daysLeft < 7 ? [185, 28, 28] : daysLeft <= 30 ? [180, 100, 0] : [22, 163, 74];

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...daysColor);
  if (daysLeft < 0) {
    doc.text(`⚠ DEADLINE PASSED ${Math.abs(daysLeft)} DAYS AGO`, PAGE_WIDTH / 2, y, { align: 'center' });
  } else if (daysLeft === 0) {
    doc.text('⚠ YOUR DEADLINE IS TODAY', PAGE_WIDTH / 2, y, { align: 'center' });
  } else {
    doc.text(`As of today, you have ${daysLeft} days remaining.`, PAGE_WIDTH / 2, y, { align: 'center' });
  }
  y += 10;

  if (daysLeft > 0 && daysLeft <= 30) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    const urgentLines = doc.splitTextToSize(
      'URGENT: Your filing deadline is approaching. File your lien immediately to preserve your lien rights.',
      CONTENT_WIDTH
    );
    doc.text(urgentLines, PAGE_WIDTH / 2, y, { align: 'center' });
    y += urgentLines.length * 7 + 6;
  }

  addSpacer(4);
  addDivider();

  addLine('What happens after I file?', 11, true);
  addSpacer(2);
  const afterFiling = [
    '1. File this Claim of Lien with the County Recorder/Clerk within the deadline shown above.',
    '2. Serve a copy on the property owner via certified mail within the time required by your state.',
    '3. Retain proof of service, the recorded lien copy, and all supporting documentation.',
    '4. If payment is not received, consult an attorney to enforce the lien through litigation.',
    `5. Be aware of the statute of limitations to file suit: varies by state, typically 1–2 years from filing.`,
  ];
  afterFiling.forEach((item) => {
    addLine(item, 9, false, [60, 60, 60]);
    addSpacer(2);
  });

  addSpacer(4);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text(
    'This deadline confirmation is for informational purposes only. Verify with a licensed attorney in your state.',
    PAGE_WIDTH / 2,
    270,
    { align: 'center', maxWidth: CONTENT_WIDTH }
  );

  addPageNumber(2, 6);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3: County Recorder / Clerk Filing Instructions
  // ═══════════════════════════════════════════════════════════════════════════

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
  doc.text(`${toTitleCase(data.state)} — ${data.county} County`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;

  addDivider();

  const instructions = getFilingInstructions(data.state);
  const instrLines = instructions.split('\n');
  instrLines.forEach((line) => {
    const isBold = line.includes('Instructions') || /^\d+\./.test(line.trim()) === false && line.trim() !== '';
    addLine(line, line.match(/^\d+\./) ? 9 : 10, line === instrLines[0], [50, 50, 50]);
    if (line.trim() === '') addSpacer(2);
  });

  addSpacer(8);
  addDivider();

  addLine('Documents Required for Filing:', 10, true);
  addSpacer(3);
  const docs = [
    '☐  Original signed Claim of Lien (this document)',
    '☐  Copy of the Notice of Furnishing (if required by your state)',
    '☐  Photo ID (in some counties)',
    '☐  Recording fee (cash, check, or credit card depending on county)',
    '☐  Self-addressed stamped envelope (for return of recorded document)',
  ];
  docs.forEach((d) => {
    addLine(d, 9, false, [50, 50, 50]);
    addSpacer(3);
  });

  addPageNumber(3, 6);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4: Proof of Service Affidavit
  // ═══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  resetY();

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 47, 110);
  doc.text('AFFIDAVIT OF SERVICE', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 12;
  addDivider();

  const affidavitIntro = `State of ${toTitleCase(data.state)}\nCounty of ${data.county}\n\nThe undersigned, being duly sworn, states the following:`;
  addLine(affidavitIntro, 10, false, [50, 50, 50]);
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
  const methods = [
    '☐  Personal Delivery',
    '☐  Certified Mail — Tracking #: _______________________________',
    '☐  First Class Mail',
    '☐  Other (describe): _________________________________________',
  ];
  methods.forEach((m) => {
    addLine(m, 9, false, [50, 50, 50]);
    addSpacer(4);
  });

  addBlankField('Date of Service', 1);
  addSpacer(8);
  addDivider();

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(60, 60, 60);
  const oath = 'I declare under penalty of perjury under the laws of the State of ' +
    toTitleCase(data.state) + ' that the foregoing is true and correct.';
  const oathLines = doc.splitTextToSize(oath, CONTENT_WIDTH);
  doc.text(oathLines, MARGIN, y);
  y += oathLines.length * 5 + 10;

  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Affiant Signature', MARGIN, y + 4);
  doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
  doc.text('Date Signed', PAGE_WIDTH / 2 + 5, y + 4);
  y += 16;

  addLine('NOTARY PUBLIC (if required by your state):', 9, true);
  addSpacer(4);
  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.text('Notary Signature', MARGIN, y + 4);
  doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
  doc.text('Commission Expires', PAGE_WIDTH / 2 + 5, y + 4);

  addPageNumber(4, 6);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 5: Lien Release Form
  // ═══════════════════════════════════════════════════════════════════════════

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
  doc.text(
    'Complete this form upon receiving full payment to release the recorded lien.',
    PAGE_WIDTH / 2,
    y,
    { align: 'center' }
  );
  y += 10;
  addDivider();

  addLine(
    'KNOW ALL PERSONS BY THESE PRESENTS, that the undersigned claimant, for and in consideration of the full payment of the sum described below, does hereby release, discharge, and waive any and all mechanics lien rights or claims of lien upon the property described herein.',
    9, false, [50, 50, 50]
  );
  addSpacer(6);

  addBlankField('Claimant Name', 1);
  addBlankField('Address of Claimant', 2);
  addSpacer(4);

  addLine('Property from which the lien is released:', 10, true);
  addSpacer(2);
  addLabelValue('Property Address', data.propertyAddress);
  addLabelValue('County', data.county);
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
  const releaseOath =
    'I declare under penalty of perjury that I have received full payment and that the mechanics lien described above is hereby fully and unconditionally released and discharged.';
  const relOathLines = doc.splitTextToSize(releaseOath, CONTENT_WIDTH);
  doc.text(relOathLines, MARGIN, y);
  y += relOathLines.length * 5 + 10;

  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Claimant Signature', MARGIN, y + 4);
  doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
  doc.text('Date', PAGE_WIDTH / 2 + 5, y + 4);
  y += 16;

  doc.line(MARGIN, y, MARGIN + 80, y);
  doc.text('Printed Name', MARGIN, y + 4);
  doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
  doc.text('Title', PAGE_WIDTH / 2 + 5, y + 4);

  addPageNumber(5, 6);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 6 (CONDITIONAL): Preliminary Notice
  // Include for CA or FL when role = subcontractor or material-supplier
  // ═══════════════════════════════════════════════════════════════════════════

  const needsPreliminaryNotice =
    (data.state === 'california' || data.state === 'florida') &&
    (data.role === 'subcontractor' || data.role === 'material-supplier');

  if (needsPreliminaryNotice || data.extras.includes('preliminary-notice')) {
    doc.addPage();
    resetY();

    const isPrelimCA = data.state === 'california';
    const noticeTitle = isPrelimCA ? '20-DAY PRELIMINARY NOTICE' : 'NOTICE TO OWNER';
    const noticeStatute = isPrelimCA
      ? 'Pursuant to California Civil Code §8204 (20-Day Preliminary Notice)'
      : 'Pursuant to Florida Statute §713.06(2) (Notice to Owner)';

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
      addLine(
        'TO: Property Owner and/or Direct Contractor\n\nPURSUANT TO CALIFORNIA CIVIL CODE §8204, THIS IS TO ADVISE YOU THAT:',
        10, true, [50, 50, 50]
      );
      addSpacer(4);
      addLine(
        'The undersigned has furnished or will furnish labor, services, equipment, or materials of the following general description:',
        9, false, [50, 50, 50]
      );
      addBlankField('Description of Labor / Materials', 3);
      addLine('To the jobsite located at:', 9, false, [50, 50, 50]);
      addLabelValue('Property Address', data.propertyAddress);
      addLine('An estimate of the total price of the labor, services, equipment, or materials:', 9, false, [50, 50, 50]);
      addLabelValue('Estimated Value', formatCurrency(data.contractAmount));
      addLine('The name of the person or firm who contracted for the purchase of such labor, services, equipment, or materials:', 9, false, [50, 50, 50]);
      addLabelValue('Contracting Party', data.gcName || '[Property Owner / General Contractor]');
    } else {
      // Florida NTO preamble
      addLine(
        'TO: Property Owner and/or General Contractor\n\nNOTICE TO OWNER\n\nFLORIDA LAW PRESCRIBES THE SERVING OF THIS NOTICE AND RESTRICTS YOUR RIGHT TO MAKE PAYMENTS UNDER YOUR CONTRACT IN ACCORDANCE WITH SECTION 713.06, FLORIDA STATUTES.',
        10, true, [50, 50, 50]
      );
      addSpacer(4);
      addLine('This notice is to advise you that the undersigned is providing services or materials of the following nature:', 9, false, [50, 50, 50]);
      addBlankField('Description of Services / Materials', 3);
      addLine('To the project located at:', 9, false, [50, 50, 50]);
      addLabelValue('Property Address', data.propertyAddress);
      addLabelValue('County', data.county);
      addLine('Under a contract with:', 9, false, [50, 50, 50]);
      addLabelValue('Contracting Party', data.gcName || '[General Contractor / Owner]');
      addLine('Estimated value of services / materials:', 9, false, [50, 50, 50]);
      addLabelValue('Estimated Value', formatCurrency(data.contractAmount));
    }

    addSpacer(6);
    addDivider();

    doc.line(MARGIN, y, MARGIN + 80, y);
    doc.text('Claimant Signature', MARGIN, y + 4);
    doc.line(PAGE_WIDTH / 2 + 5, y, PAGE_WIDTH - MARGIN, y);
    doc.text('Date', PAGE_WIDTH / 2 + 5, y + 4);

    addPageNumber(6, 6);
  }

  return doc.output('blob');
}
