import type { LienFormData } from './PDFGenerator';
import { addDays, parseLocalDate } from '../data/stateLienRules';

// Florida's early served notice is a separate instrument from a recorded claim.
// Statutory language: Fla. Stat. 713.06(2)(c), public legislative text.
export async function generateFloridaNotice(data: LienFormData): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  let y = 22;
  const paragraph = (value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    const lines: string[] = doc.splitTextToSize(value, 174);
    for (const line of lines) {
      if (y > 250) { doc.addPage(); y = 22; }
      doc.text(line, 21, y); y += 5;
    }
    y += 4;
  };
  paragraph('NOTICE TO OWNER', true);
  paragraph("WARNING! FLORIDA'S CONSTRUCTION LIEN LAW ALLOWS SOME UNPAID CONTRACTORS, SUBCONTRACTORS, AND MATERIAL SUPPLIERS TO FILE LIENS AGAINST YOUR PROPERTY EVEN IF YOU HAVE MADE PAYMENT IN FULL.", true);
  paragraph('UNDER FLORIDA LAW, YOUR FAILURE TO MAKE SURE THAT WE ARE PAID MAY RESULT IN A LIEN AGAINST YOUR PROPERTY AND YOUR PAYING TWICE. TO AVOID A LIEN AND PAYING TWICE, YOU MUST OBTAIN A WRITTEN RELEASE FROM US EVERY TIME YOU PAY YOUR CONTRACTOR.', true);
  paragraph(`To: ${data.ownerName}\n${data.ownerAddress || '[Complete owner service address before use]'}`);
  paragraph(`The undersigned hereby informs you that he or she has furnished or is furnishing services or materials as follows: ${data.workDescription || '[Describe furnishing]'} for the improvement of the real property identified as ${data.legalDescription || data.propertyAddress} (${data.propertyAddress}) under an order given by ${data.hiringParty || '[Identify ordering party]'}.`);
  paragraph('Florida law prescribes the serving of this notice and restricts your right to make payments under your contract in accordance with Section 713.06, Florida Statutes.');
  paragraph('IMPORTANT INFORMATION FOR YOUR PROTECTION', true);
  paragraph("Under Florida's laws, those who work on your property or provide materials and are not paid have a right to enforce their claim for payment against your property. This claim is known as a construction lien. If your contractor fails to pay subcontractors or material suppliers or neglects to make other legally required payments, the people who are owed money may look to your property for payment, EVEN IF YOU HAVE PAID YOUR CONTRACTOR IN FULL.");
  paragraph('PROTECT YOURSELF:', true);
  paragraph('RECOGNIZE that this Notice to Owner may result in a lien against your property unless all those supplying a Notice to Owner have been paid. LEARN more about the Construction Lien Law, Chapter 713, Part I, Florida Statutes, and the meaning of this notice by contacting an attorney or the Florida Department of Business and Professional Regulation.');
  paragraph(`Lienor's signature: __________________________   Date: __________\nLienor's name: ${data.claimantName || ''}\nLienor's address: ${data.claimantAddress || ''}`);
  paragraph(`Copies to: ${data.gcName || '[Identify principal contractor]'}; ${data.hiringParty || '[Identify hiring party]'}; and other required or designated recipients under section 713.06(2)(a) and (b). Complete service addresses and recipients before use.`);
  const noticePages = doc.getNumberOfPages();
  doc.addPage(); y = 22;
  paragraph('SERVICE PLANNING CHECKLIST - KEEP SEPARATE FROM NOTICE', true);
  const first = parseLocalDate(data.firstFurnishingDate);
  paragraph(`First furnishing entered: ${data.firstFurnishingDate}\n45-day planning limit: ${first ? addDays(first, 45).toLocaleDateString('en-US') : 'Verify the date'}.`);
  paragraph('This date checks only the first-furnishing period. Notice must also precede the applicable final owner disbursement. Verify service timing under section 713.18; preparation or checkout does not serve the notice.');
  paragraph('1. Review eligibility, contract tier, and the Notice of Commencement. Direct owner-contract claimants and laborers have different requirements.\n2. Complete owner and additional recipient addresses. Lower-tier relationships can require additional contractor or subcontractor copies.\n3. Review the notice, sign it, and use a statutory service method.\n4. Preserve the exact notice, recipient list, and mailing or personal-service evidence.\n5. If unpaid later, prepare and record a separate claim of lien within its own period.');
  paragraph('A late required Notice to Owner does not automatically preserve future furnishing. Get Florida legal advice about missed periods or recipient errors. This is a preparation tool, not legal representation or a recorded claim of lien.');
  paragraph('Official sources: Florida Statutes 713.06 and 713.18.\nhttps://www.flsenate.gov/Laws/Statutes/2026/713.06\nhttps://www.flsenate.gov/Laws/Statutes/2026/713.18');
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text(i <= noticePages ? `NOTICE TO OWNER - page ${i} of ${noticePages}` : 'REFERENCE CHECKLIST - DO NOT SERVE AS PART OF NOTICE', 21, 266);
  }
  return doc.output('blob');
}
