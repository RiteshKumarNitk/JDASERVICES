/* =====================================================================
   JDA Property Services — pdf.js
   "Download PDF" on the Final Submission success screen. Builds a proper
   A4 government-style application copy directly from the same flow-store
   data the Review / Final Submission screen already shows — no separate
   Review page, no screenshot, no hardcoded sample data.
   Loaded only by final-submission.html, after jsPDF + jspdf-autotable.
   ===================================================================== */
'use strict';

// JDA brand colours as RGB (matches --blue-700 / --blue-900 / --line / --ink-2)
const PDF_BLUE = [47, 106, 168];
const PDF_BLUE_DARK = [31, 69, 114];
const PDF_LINE = [219, 227, 238];
const PDF_INK = [51, 65, 85];
const PDF_MUTED = [100, 116, 139];

function pdfClean(v) {
  return (v == null || v === '') ? '—' : String(v);
}

// Same rule the on-screen Review/summary already applies: Aadhaar mode and
// number stay inside the editable forms, never in a review/print/PDF copy.
function pdfIsAadhaarRow(label) {
  return /aadhaar/i.test(label || '');
}

function pdfSectionRows(section) {
  return (section.rows || [])
    .filter((r) => !r.group && !pdfIsAadhaarRow(r.label))
    .map((r) => [r.label, pdfClean(r.value)]);
}

// The Payment & Affidavit table stays on the page (just hidden) after
// submission, so read its informational text straight from the DOM —
// skips buttons/selects, so the PDF can never drift from what's shown.
function pdfPaymentRows() {
  const rows = [];
  $$('.fs-tbl tbody tr').forEach((tr) => {
    $$('td', tr).forEach((td) => {
      const bits = $$('.fs-cell-title, .fs-amount, .req-badge', td)
        .map((el) => el.textContent.trim())
        .filter(Boolean);
      if (bits.length) rows.push([bits[0], bits.slice(1).join(' — ')]);
    });
  });
  return rows;
}

function pdfDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// One bordered, blue-headed 2-column "label / value" table — the PDF
// equivalent of a .summary-card. Returns the Y position to continue from.
function addPdfSection(doc, y, title, rows, pageWidth, margin) {
  if (!rows.length) return y;
  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin, bottom: 46 },
    tableWidth: pageWidth - margin * 2,
    head: [[{ content: title, colSpan: 2 }]],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 5, textColor: PDF_INK, lineColor: PDF_LINE, lineWidth: 0.4, overflow: 'linebreak' },
    headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 10, halign: 'left' },
    columnStyles: {
      0: { cellWidth: (pageWidth - margin * 2) * 0.36, fontStyle: 'bold', textColor: PDF_INK },
      1: { cellWidth: 'auto' }
    },
    showHead: 'everyPage'
  });
  return doc.lastAutoTable.finalY + 12;
}

function buildApplicationPdf() {
  const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFCtor) {
    toast('PDF generator could not load — check your connection and try again.');
    return;
  }

  const flow = getFlow();
  const doc = new jsPDFCtor({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 46;

  // ---- JDA application header -----------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...PDF_BLUE_DARK);
  doc.text('Jaipur Development Authority', pageWidth / 2, y, { align: 'center' });
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_INK);
  doc.text('Property Services Portal — Application Copy', pageWidth / 2, y, { align: 'center' });
  y += 15;

  const serviceName = [flow.service, flow.subService].filter(Boolean).join(' — ');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PDF_BLUE);
  doc.text(serviceName || 'Property Service Application', pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setDrawColor(...PDF_BLUE);
  doc.setLineWidth(1.1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_INK);
  doc.text('Application Number: ' + pdfClean(flow.applicationNo), margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Submitted On: ' + pdfDateTime(flow.submittedAt), pageWidth - margin, y, { align: 'right' });
  y += 20;

  // ---- Service & Applicant ---------------------------------------------
  y = addPdfSection(doc, y, 'SERVICE & APPLICANT', [
    ['Service', pdfClean(flow.service)],
    ['Sub Service', pdfClean(flow.subService)],
    ['Based On', pdfClean(flow.basedOn)],
    ['Applicant Type', pdfClean(TYPE_LABELS[flow.applicantType])]
  ], pageWidth, margin);

  // ---- Applicant Details (only the sections actually filled) -----------
  // flow.formSections already holds exactly the selected applicant-type
  // sub-forms (Self / POA / Minor+Guardian / Company / Company+POA) plus
  // Witness — never an empty/unselected section, by construction.
  const sections = flow.formSections || [];
  const applicantSecs = sections.filter((s) => !/witness/i.test(s.title || ''));
  const witnessSecs = sections.filter((s) => /witness/i.test(s.title || ''));

  applicantSecs.forEach((s) => {
    const rows = pdfSectionRows(s);
    if (rows.length) y = addPdfSection(doc, y, String(s.title || 'Applicant Details').toUpperCase(), rows, pageWidth, margin);
  });

  // ---- Witness Profile (only if it exists) ------------------------------
  witnessSecs.forEach((s) => {
    const rows = pdfSectionRows(s);
    if (rows.length) y = addPdfSection(doc, y, String(s.title || 'Witness Details').toUpperCase(), rows, pageWidth, margin);
  });

  // ---- Property Profile --------------------------------------------------
  const props = flow.propertyRecords || [];
  props.forEach((p, i) => {
    const title = props.length > 1 ? 'PROPERTY PROFILE ' + (i + 1) : 'PROPERTY PROFILE';
    y = addPdfSection(doc, y, title, [
      ['Property ID', pdfClean(p.id)],
      ['Zone', pdfClean(p.zone)],
      ['Scheme', pdfClean(p.scheme)],
      ['Sector & Plot No', pdfClean(p.sectorPlot)],
      ['Area', pdfClean(p.area)],
      ['Area Unit', pdfClean(p.unit)],
      ['Owner Name', pdfClean(p.owner)]
    ], pageWidth, margin);
  });

  // ---- Documents (uploaded files only, real filenames) -------------------
  const docNames = flow.uploadedDocNames || [];
  if (docNames.length) {
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin, bottom: 46 },
      tableWidth: pageWidth - margin * 2,
      head: [[{ content: 'DOCUMENTS', colSpan: 3 }], ['S.No', 'Document Name', 'Reference']],
      body: docNames.map((n, i) => [String(i + 1), pdfClean(n), 'Enclosed']),
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 5, textColor: PDF_INK, lineColor: PDF_LINE, lineWidth: 0.4, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 36, halign: 'center' },
        2: { cellWidth: 76, halign: 'center' }
      },
      showHead: 'everyPage'
    });
    y = doc.lastAutoTable.finalY + 12;
  }

  // ---- Payment & Affidavit Details ---------------------------------------
  y = addPdfSection(doc, y, 'PAYMENT & AFFIDAVIT DETAILS', pdfPaymentRows(), pageWidth, margin);

  // ---- Declaration ---------------------------------------------------------
  const declEl = $('#declarationBox .cb-label');
  const declText = declEl
    ? declEl.textContent.trim()
    : 'I hereby declare that the above information is correct to the best of my knowledge.';
  addPdfSection(doc, y, 'DECLARATION', [
    ['Declaration', declText],
    ['Status', flow.submitted ? 'Submitted' : 'Not submitted'],
    ['Application Number', pdfClean(flow.applicationNo)]
  ], pageWidth, margin);

  // ---- Footer + page numbers on every page --------------------------------
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...PDF_LINE);
    doc.setLineWidth(0.6);
    doc.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_MUTED);
    doc.text('Generated from Jaipur Development Authority Property Services Portal', margin, pageHeight - 20);
    doc.text('Page ' + i + ' of ' + pageCount, pageWidth - margin, pageHeight - 20, { align: 'right' });
  }

  const fileTag = (flow.applicationNo || 'Draft').replace(/[^\w-]+/g, '-');
  doc.save('JDA-Application-' + fileTag + '.pdf');
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page !== 'final') return;
  const btn = $('#downloadPdf');
  if (btn) btn.addEventListener('click', buildApplicationPdf);
});
