import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PDF_COLORS,
  drawRoundedRect,
  drawSectionTitle,
  loadImageAsBase64,
  type RGB,
} from './pdfPrimitives';
import logoSrc from '@/assets/margin-icon-tm.png';
import { stateLabels } from '@/lib/stampDutyRates';
import type { FundsPositionInputs, FundsPositionResult } from '@/lib/fundsPosition/types';
import type { FundsWarning } from '@/lib/fundsPosition/warnings';

const money = (v: number) =>
  `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v || 0)).toLocaleString('en-AU')}`;

export interface FundsPdfMeta {
  clientName?: string;
  brokerName?: string;
  scenarioName?: string;
}

export interface FundsPdfScenario {
  name: string;
  inputs: FundsPositionInputs;
  result: FundsPositionResult;
}

const TXN_LABEL: Record<string, string> = {
  purchase: 'Purchase',
  refinance: 'Refinance',
  sale: 'Sale',
  property_only: 'Property Only',
};
const PROP_LABEL: Record<string, string> = {
  established: 'Established Home',
  new: 'New Home',
  vacant_build: 'Vacant land (plan to build)',
  vacant_no_build: 'Vacant land (no build)',
};

async function startDoc(title: string, subtitle: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  let logoBase64: string | null = null;
  try {
    logoBase64 = (await loadImageAsBase64(logoSrc)).base64;
  } catch {
    /* logo is optional */
  }

  drawRoundedRect(doc, 0, 0, pageW, 32, 0, PDF_COLORS.dark);
  if (logoBase64) doc.addImage(logoBase64, 'PNG', margin, 6, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(title, margin + 25, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, margin + 25, 21);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-AU')}`, margin + 25, 26);

  return { doc, pageW, margin, contentW: pageW - margin * 2 };
}

function addFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.lightMuted);
    doc.text(
      `Margin Finance | Estimates only — not financial advice | Page ${i} of ${pageCount}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' },
    );
  }
}

function kpiRow(
  doc: jsPDF,
  margin: number,
  contentW: number,
  y: number,
  tiles: Array<{ label: string; value: string; tone?: RGB }>,
) {
  const gap = 4;
  const w = (contentW - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((t, idx) => {
    const x = margin + idx * (w + gap);
    drawRoundedRect(doc, x, y, w, 20, 3, PDF_COLORS.bg, PDF_COLORS.border);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(t.label.toUpperCase(), x + w / 2, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...(t.tone ?? PDF_COLORS.dark));
    doc.text(t.value, x + w / 2, y + 15, { align: 'center' });
  });
  return y + 26;
}

/** Horizontal waterfall of the funds-to-complete build up. */
function waterfall(
  doc: jsPDF,
  margin: number,
  contentW: number,
  y: number,
  r: FundsPositionResult,
  isPurchase: boolean,
) {
  y = drawSectionTitle(doc, margin, y, 'Funds to Complete — Waterfall', 11);

  const steps: Array<{ label: string; amount: number; tone: RGB }> = [
    { label: isPurchase ? 'Purchase price' : 'Loan refinanced', amount: isPurchase ? r.propertyValue : 0, tone: PDF_COLORS.dark },
    { label: 'Government charges', amount: r.govCharges, tone: PDF_COLORS.warning },
    { label: 'Fees', amount: r.fees, tone: PDF_COLORS.warning },
    { label: 'LMI payable upfront', amount: r.lmiPayable, tone: PDF_COLORS.warning },
    { label: 'Less base loan', amount: -r.baseLoan, tone: PDF_COLORS.primary },
    { label: 'Less funds available', amount: -r.fundsAvailable, tone: PDF_COLORS.success },
  ];

  const maxAbs = Math.max(...steps.map(s => Math.abs(s.amount)), 1);
  const labelW = 55;
  const barMaxW = contentW - labelW - 34;

  steps.forEach(s => {
    const barW = Math.max(1, (Math.abs(s.amount) / maxAbs) * barMaxW);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(s.label, margin, y + 3.6);
    drawRoundedRect(doc, margin + labelW, y, barW, 5, 1.2, s.tone);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.dark);
    doc.text(money(s.amount), margin + contentW, y + 3.6, { align: 'right' });
    y += 8;
  });

  const shortfall = r.netSurplus < 0;
  y += 2;
  drawRoundedRect(
    doc,
    margin,
    y,
    contentW,
    16,
    3,
    shortfall ? [254, 242, 242] : [240, 253, 244],
    shortfall ? PDF_COLORS.danger : PDF_COLORS.success,
  );
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...(shortfall ? PDF_COLORS.danger : PDF_COLORS.success));
  doc.text(shortfall ? 'Shortfall — additional funds required' : 'Net surplus', margin + 5, y + 10);
  doc.setFontSize(13);
  doc.text(money(Math.abs(r.netSurplus)), margin + contentW - 5, y + 10, { align: 'right' });

  return y + 24;
}

function table(
  doc: jsPDF,
  margin: number,
  contentW: number,
  y: number,
  title: string,
  rows: [string, string][],
) {
  if (!rows.length) return y;
  if (y > 245) {
    doc.addPage();
    y = margin;
  }
  y = drawSectionTitle(doc, margin, y, title, 11);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: rows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.7, textColor: PDF_COLORS.dark },
    columnStyles: {
      0: { cellWidth: contentW * 0.6, textColor: PDF_COLORS.muted },
      1: { cellWidth: contentW * 0.4, fontStyle: 'bold', halign: 'right' },
    },
  });
  return (doc as any).lastAutoTable.finalY + 8;
}

const onOff = (manual: boolean) => (manual ? 'Manual (locked)' : 'Auto-calculated');

export async function buildFundsPositionPdf(
  i: FundsPositionInputs,
  r: FundsPositionResult,
  meta: FundsPdfMeta = {},
  warnings: FundsWarning[] = [],
  comparisons: FundsPdfScenario[] = [],
): Promise<jsPDF> {
  const subtitleBits = [meta.clientName, meta.scenarioName].filter(Boolean);
  const { doc, margin, contentW } = await startDoc(
    'Funding Position',
    subtitleBits.length ? subtitleBits.join(' — ') : 'Funds to complete summary',
  );

  const isPurchase = i.transactionType === 'purchase' || i.transactionType === 'property_only';
  let y = 42;

  y = kpiRow(doc, margin, contentW, y, [
    { label: 'Property value', value: money(r.propertyValue) },
    { label: 'Total loan', value: money(r.totalLoan) },
    { label: 'Total LVR', value: `${r.totalLVR.toFixed(2)}%` },
    {
      label: r.netSurplus < 0 ? 'Funds to complete' : 'Net surplus',
      value: money(Math.abs(r.netSurplus)),
      tone: r.netSurplus < 0 ? PDF_COLORS.danger : PDF_COLORS.success,
    },
  ]);

  y = waterfall(doc, margin, contentW, y, r, isPurchase);

  y = table(doc, margin, contentW, y, 'Scenario', [
    ['State', stateLabels[i.state]],
    ['Transaction type', TXN_LABEL[i.transactionType] ?? i.transactionType],
    ['Property type', PROP_LABEL[i.propertyType] ?? i.propertyType],
    ['Purpose', i.purpose === 'investment' ? 'Investment' : 'Owner Occupied'],
    ['First home buyer', i.firstHomeBuyer ? 'Yes' : 'No'],
    ['First Home Guarantee', i.fhgScheme ? 'Yes' : 'No'],
    ['Pensioner', i.pensioner ? 'Yes' : 'No'],
    ['Foreign buyer', i.foreignBuyer ? 'Yes' : 'No'],
    ...(i.differentValuation ? ([['Valuation', money(i.valuation)]] as [string, string][]) : []),
  ]);

  y = table(doc, margin, contentW, y, 'Toggles — what was locked vs solved', [
    ['Property value', `${onOff(!i.propertyValue.auto)} · ${money(r.propertyValue)}`],
    ['Base LVR', `${onOff(!i.baseLVR.auto)} · ${r.baseLVR.toFixed(2)}%`],
    ['Base loan amount', `${onOff(!i.baseLoan.auto)} · ${money(r.baseLoan)}`],
    ['Funds available', `${i.fundsDetailed ? 'Detailed breakdown' : onOff(!i.fundsAvailable.auto)} · ${money(r.fundsAvailable)}`],
    ['LMI', `${onOff(!i.lmiOverride.auto)} · ${money(r.lmi)}`],
    ['Capitalise LMI', i.capitaliseLMI ? 'On' : 'Off'],
    ['LMI stamp duty', i.includeLmiStampDuty ? 'Included' : 'Excluded'],
    ['Government charges', `${onOff(!i.govTotalOverride.auto)} · ${money(r.govCharges)}`],
    ['Fees', `${i.feesDetailed ? 'Itemised' : 'Total entered'} · ${money(r.fees)}`],
  ]);

  y = table(doc, margin, contentW, y, 'Government charges & LMI', [
    ['Base stamp duty', money(r.stampDuty)],
    ['Stamp duty concession', money(-r.stampDutyConcession)],
    ['Transfer fee', money(r.transferFee)],
    ['Mortgage registration', money(r.mortgageRegistrationFee)],
    ['Total government charges', money(r.govCharges)],
    ['LMI premium', money(r.lmi)],
    ['LMI stamp duty', money(r.lmiStampDuty)],
    ['LMI capitalised', money(r.lmiCapitalised)],
    ['LMI payable upfront', money(r.lmiPayable)],
  ]);

  if (i.fundsDetailed) {
    y = table(doc, margin, contentW, y, 'Funds available breakdown', [
      ['Deposit paid', money(i.deposit)],
      ['Savings', money(i.savings)],
      ['Gifts', money(i.gifts)],
      ['Assets being disposed', money(i.assetsDisposed)],
      ['Equity', money(i.equity)],
      ...i.customFunds.map(f => [f.label || 'Other funds', money(f.amount)] as [string, string]),
      ['Total funds available', money(r.fundsAvailable)],
    ]);
  }

  if (i.feesDetailed && i.feeItems.length) {
    y = table(
      doc,
      margin,
      contentW,
      y,
      'Fees',
      [...i.feeItems.map(f => [f.label || 'Fee', money(f.amount)] as [string, string]), ['Total fees', money(r.fees)]],
    );
  }

  y = table(doc, margin, contentW, y, 'Loan terms', [
    ['Interest rate', `${i.rate}%`],
    ['Term', `${i.termYears} years`],
    ['Interest only period', i.ioYears > 0 ? `${i.ioYears} years` : 'None'],
    ['Repayment type', i.repaymentType === 'io' || i.ioYears > 0 ? 'Interest only' : 'Principal & interest'],
    ['Monthly repayment', money(r.repayment)],
  ]);

  if (warnings.length) {
    if (y > 235) {
      doc.addPage();
      y = margin;
    }
    y = drawSectionTitle(doc, margin, y, 'Warnings & checks', 11);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      body: warnings.map(w => [w.level.toUpperCase(), w.message]),
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.7, textColor: PDF_COLORS.dark },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold', textColor: PDF_COLORS.muted },
        1: { cellWidth: contentW - 22 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (comparisons.length > 1) {
    doc.addPage();
    y = margin;
    y = drawSectionTitle(doc, margin, y, 'Scenario comparison', 12);
    const metrics: Array<[string, (s: FundsPdfScenario) => string]> = [
      ['Property value', s => money(s.result.propertyValue)],
      ['Base loan', s => money(s.result.baseLoan)],
      ['Total loan', s => money(s.result.totalLoan)],
      ['Base LVR', s => `${s.result.baseLVR.toFixed(2)}%`],
      ['Total LVR', s => `${s.result.totalLVR.toFixed(2)}%`],
      ['LMI', s => money(s.result.lmi + s.result.lmiStampDuty)],
      ['Government charges', s => money(s.result.govCharges)],
      ['Fees', s => money(s.result.fees)],
      ['Funds required', s => money(s.result.fundsRequired)],
      ['Funds available', s => money(s.result.fundsAvailable)],
      ['Surplus / (shortfall)', s => money(s.result.netSurplus)],
      ['Monthly repayment', s => money(s.result.repayment)],
    ];
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Metric', ...comparisons.map(s => s.name)]],
      body: metrics.map(([label, fn]) => [label, ...comparisons.map(fn)]),
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.dark, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 2, textColor: PDF_COLORS.dark },
      columnStyles: { 0: { fontStyle: 'bold' } },
    });
  }

  addFooter(doc);
  return doc;
}

export function fundsPositionFileName(meta: FundsPdfMeta = {}) {
  const base = [meta.clientName, meta.scenarioName].filter(Boolean).join('-') || 'funding-position';
  return `${base.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}-funding-position.pdf`;
}

export async function downloadFundsPositionPdf(
  i: FundsPositionInputs,
  r: FundsPositionResult,
  meta: FundsPdfMeta = {},
  warnings: FundsWarning[] = [],
  comparisons: FundsPdfScenario[] = [],
) {
  const doc = await buildFundsPositionPdf(i, r, meta, warnings, comparisons);
  doc.save(fundsPositionFileName(meta));
}

/** Base64 (no data-url prefix) for emailing as a Resend attachment. */
export async function fundsPositionPdfBase64(
  i: FundsPositionInputs,
  r: FundsPositionResult,
  meta: FundsPdfMeta = {},
  warnings: FundsWarning[] = [],
  comparisons: FundsPdfScenario[] = [],
): Promise<string> {
  const doc = await buildFundsPositionPdf(i, r, meta, warnings, comparisons);
  const dataUri = doc.output('datauristring');
  return dataUri.slice(dataUri.indexOf(',') + 1);
}
