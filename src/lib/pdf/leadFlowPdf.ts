import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { PDF_COLORS, loadImageAsBase64, safeFormatCurrency, type RGB } from './pdfPrimitives';
import { regular, semibold } from './leadReportFont';

interface MonthlyRow {
  label: string; count: number; volume: number; lodged: number; lodgedVolume: number; approved: number; settled: number; lost: number;
}
interface BreakdownRow { label: string; count: number; volume: number }
export interface LeadFlowPdfData {
  rangeLabel: string;
  from: Date;
  to: Date;
  buckets: MonthlyRow[];
  lodgements: { label: string; count: number; volume: number }[];
  sources: BreakdownRow[];
  referrers: BreakdownRow[];
  brandName: string;
  logoUrl?: string | null;
  primary?: RGB;
}

/** Resolve the current brokerage's semantic CSS colour to a PDF RGB triplet. */
export function reportPrimaryColor(): RGB {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return PDF_COLORS.brand;
  ctx.fillStyle = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()})`;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

export async function createLeadFlowPdf(data: LeadFlowPdfData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('Poppins-Regular.ttf', regular);
  doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
  doc.addFileToVFS('Poppins-SemiBold.ttf', semibold);
  doc.addFont('Poppins-SemiBold.ttf', 'Poppins', 'bold');
  doc.setFont('Poppins', 'normal');
  doc.setProperties({ title: `Lead Flow Report — ${data.rangeLabel}`, author: data.brandName, subject: 'Lead acquisition and progression performance' });
  const primary = data.primary ?? PDF_COLORS.brand;
  const width = 180;
  const margin = 15;
  let logo: Awaited<ReturnType<typeof loadImageAsBase64>> | undefined;
  if (data.logoUrl) {
    try { logo = await loadImageAsBase64(data.logoUrl); } catch { /* Text branding remains if the logo cannot load. */ }
  }
  const text = (value: string | string[], x: number, y: number, size = 9, bold = false, color = PDF_COLORS.dark) => {
    doc.setFont('Poppins', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color); doc.text(value, x, y);
  };
  const header = () => {
    doc.setFillColor(...primary); doc.rect(0, 0, 210, 2, 'F');
    let x = margin;
    if (logo) {
      const w = Math.min(32, 12 * logo.width / logo.height);
      const h = w * logo.height / logo.width;
      doc.addImage(logo.base64, 'PNG', margin, 9, w, h);
      x += w + 5;
    }
    text(data.brandName, x, 16, 11, true);
    text('BUSINESS PERFORMANCE', margin, 33, 8, true, primary);
    doc.setDrawColor(...PDF_COLORS.border); doc.line(margin, 23, 195, 23);
  };
  header();
  text('Lead Flow Report', margin, 46, 24, true);
  const rangeLines = doc.splitTextToSize(data.rangeLabel, width);
  text(rangeLines, margin, 55, 10);
  text(`${format(data.from, 'd MMM yyyy')} – ${format(data.to, 'd MMM yyyy')}  |  Prepared ${format(new Date(), 'd MMM yyyy')}`, margin, 65, 8, false, PDF_COLORS.muted);
  const totals = data.buckets.reduce((s, b) => ({ count: s.count + b.count, volume: s.volume + b.volume, lodged: s.lodged + b.lodged, lodgedVolume: s.lodgedVolume + b.lodgedVolume, approved: s.approved + b.approved, settled: s.settled + b.settled, lost: s.lost + b.lost }), { count: 0, volume: 0, lodged: 0, lodgedVolume: 0, approved: 0, settled: 0, lost: 0 });
  const pct = (count: number) => `${totals.count ? Math.round(count / totals.count * 100) : 0}%`;
  const actualCount = data.lodgements.reduce((sum, row) => sum + row.count, 0);
  const actualVolume = data.lodgements.reduce((sum, row) => sum + row.volume, 0);
  const metrics = [
    ['New leads', String(totals.count), `${data.buckets.length ? (totals.count / data.buckets.length).toFixed(1) : '0'} monthly average`],
    ['Loan amount', safeFormatCurrency(totals.volume), 'Current value of these leads'],
    ['Lodged in period', String(actualCount), safeFormatCurrency(actualVolume)],
    ['Settled', String(totals.settled), `from ${totals.count} leads`],
  ];
  metrics.forEach(([label, value, detail], i) => {
    const x = margin + i * 46;
    doc.setFillColor(...PDF_COLORS.bg); doc.rect(x, 74, 42, 32, 'F');
    text(label, x + 3, 81, 8, false, PDF_COLORS.muted);
    text(value, x + 3, 92, value.length > 10 ? 11 : 18, true);
    text(detail, x + 3, 101, 6.3, false, PDF_COLORS.muted);
  });
  text('New-lead cohort progression', margin, 118, 11, true);
  text(`${totals.count} new leads  /  ${totals.lodged} lodged  /  ${totals.approved} approved  /  ${totals.settled} settled  /  ${totals.lost} lost`, margin, 126, 8);
  const explanation = 'Lodged in period counts all deals by their recorded lodgement date, including older leads. Cohort progression groups leads by creation date and includes their later outcomes; settled is a cohort conversion figure.';
  text(doc.splitTextToSize(explanation, width), margin, 136, 8, false, PDF_COLORS.muted);
  text('New leads per month', margin, 159, 11, true);
  // Vector bars stay crisp in print; long histories remain complete in the monthly table.
  const chartRows = data.buckets.length > 24 ? data.buckets.slice(-24) : data.buckets;
  const max = Math.max(1, ...chartRows.map(b => b.count));
  const step = width / Math.max(1, chartRows.length);
  chartRows.forEach((b, i) => {
    const x = margin + i * step + step * .15;
    const h = b.count / max * 40;
    doc.setFillColor(...primary); doc.rect(x, 211 - h, step * .7, h, 'F');
    text(String(b.count), x, 208 - h, 7);
    if (chartRows.length <= 12 || i % 3 === 0) text(b.label.replace(' ', '\n'), x, 217, 6);
  });
  if (data.buckets.length > 24) text('Chart shows the most recent 24 months; all months are listed on the following pages.', margin, 234, 7, false, PDF_COLORS.muted);
  text('Monthly performance', margin, 253, 11, true);
  text('Full monthly results and referral breakdowns follow.', margin, 261, 8, false, PDF_COLORS.muted);

  doc.addPage(); header();
  text('Monthly performance', margin, 46, 19, true);
  const tableBase = {
    margin: { left: margin, right: margin, top: 40, bottom: 22 },
    styles: { font: 'Poppins', fontSize: 7, cellPadding: 2.2, textColor: PDF_COLORS.dark, lineColor: PDF_COLORS.border },
    headStyles: { fillColor: primary, textColor: PDF_COLORS.pageBg, fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: PDF_COLORS.bg },
    rowPageBreak: 'avoid' as const,
    didDrawPage: () => { if (doc.getCurrentPageInfo().pageNumber > 2) header(); },
  };
  autoTable(doc, {
    ...tableBase, startY: 55,
    head: [['Lodged month', 'Deals lodged', 'Actual lodged amount']],
    body: data.lodgements.map(row => [row.label, row.count, safeFormatCurrency(row.volume)]),
    foot: [['Total', actualCount, safeFormatCurrency(actualVolume)]],
    showFoot: 'lastPage',
    footStyles: { fillColor: PDF_COLORS.bg, textColor: PDF_COLORS.dark, fontStyle: 'bold' },
  });
  doc.addPage(); header();
  text('New-lead cohort progression', margin, 46, 19, true);
  autoTable(doc, {
    ...tableBase, startY: 55,
    head: [['Created\nmonth', 'New\nleads', 'Loan\namount', 'Lodged\nsince', 'Lodged since\namount', 'Approved', 'Settled', 'Lost']],
    body: data.buckets.map(b => [b.label, b.count, safeFormatCurrency(b.volume), b.lodged, safeFormatCurrency(b.lodgedVolume), b.approved, b.settled, b.lost]),
    foot: [['Total', totals.count, safeFormatCurrency(totals.volume), totals.lodged, safeFormatCurrency(totals.lodgedVolume), totals.approved, totals.settled, totals.lost]],
    footStyles: { fillColor: PDF_COLORS.bg, textColor: PDF_COLORS.dark, fontStyle: 'bold' },
    showFoot: 'lastPage',
    columnStyles: { 0: { cellWidth: 23 }, 1: { halign: 'right' }, 2: { cellWidth: 30, halign: 'right' }, 3: { halign: 'right' }, 4: { cellWidth: 30, halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
  });
  // Keep complete source and partner lists, with repeated headers on overflow pages.
  doc.addPage(); header();
  text('Where your leads come from', margin, 46, 19, true);
  let y = 57;
  for (const [title, rows] of [['By lead source', data.sources], ['By referrer', data.referrers]] as const) {
    if (y > 235) { doc.addPage(); header(); y = 44; }
    text(title, margin, y, 11, true);
    autoTable(doc, {
      ...tableBase, startY: y + 5,
      head: [[title === 'By lead source' ? 'Source' : 'Referrer', 'Leads', 'Share', 'Loan amount']],
      body: rows.length ? rows.map(r => [r.label, r.count, pct(r.count), safeFormatCurrency(r.volume)]) : [['No leads in this period', '0', '0%', '$0']],
      columnStyles: { 0: { cellWidth: 92 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...PDF_COLORS.border); doc.line(margin, 278, 195, 278);
    text('Confidential · Business performance report', margin, 285, 7, false, PDF_COLORS.muted);
    doc.setFontSize(7); doc.text(`${page} / ${pages}`, 195, 285, { align: 'right' });
  }
  return doc;
}

export async function exportLeadFlowPdf(data: LeadFlowPdfData) {
  const doc = await createLeadFlowPdf(data);
  doc.save(`lead-flow-${format(data.from, 'yyyy-MM-dd')}-to-${format(data.to, 'yyyy-MM-dd')}.pdf`);
}