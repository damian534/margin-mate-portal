import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS, drawRoundedRect, drawSectionTitle, loadImageAsBase64 } from './pdfPrimitives';
import logoSrc from '@/assets/margin-icon-tm.png';

const money = (v: number) => `$${Math.round(v || 0).toLocaleString()}`;

async function startDoc(title: string, subtitle: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  let logoBase64: string | null = null;
  try {
    logoBase64 = (await loadImageAsBase64(logoSrc)).base64;
  } catch {}

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

function addTable(doc: jsPDF, margin: number, contentW: number, y: number, title: string, rows: [string, string][]) {
  if (!rows.length) return y;
  if (y > 250) { doc.addPage(); y = margin; }
  y = drawSectionTitle(doc, margin, y, title, 11);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: rows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.8, textColor: PDF_COLORS.dark },
    columnStyles: {
      0: { cellWidth: contentW * 0.55, textColor: PDF_COLORS.muted },
      1: { cellWidth: contentW * 0.45, fontStyle: 'bold', halign: 'right' },
    },
  });
  return (doc as any).lastAutoTable.finalY + 8;
}

function addFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.lightMuted);
    doc.text(
      `Margin Finance | Estimates only — not financial advice | Page ${i} of ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }
}

export async function generateSellUpgradePdf(params: {
  inputs: {
    currentHomeValue: number; mortgageOwing: number; sellingCostPct: number;
    targetPurchasePrice: number; stateLabel: string; isFirstHomeBuyer: boolean;
    otherBuyingCosts: number; savings: number; interestRate: number; loanTerm: number;
    useTargetLvr: boolean; targetLvr: number;
  };
  outputs: any;
}) {
  const { inputs: i, outputs: o } = params;
  const { doc, margin, contentW } = await startDoc('Sell & Buy Calculator', 'Upgrade scenario summary');
  let y = 42;

  y = addTable(doc, margin, contentW, y, 'Your Scenario', [
    ['Estimated sale price', money(i.currentHomeValue)],
    ['Mortgage owing', money(i.mortgageOwing)],
    ['Agent & selling costs', `${i.sellingCostPct.toFixed(1)}%`],
    ['Next purchase price', money(i.targetPurchasePrice)],
    ['Purchasing state', i.stateLabel],
    ['First home buyer', i.isFirstHomeBuyer ? 'Yes' : 'No'],
    ['Other buying costs', money(i.otherBuyingCosts)],
    ['Cash savings', money(i.savings)],
    ['Interest rate', `${i.interestRate.toFixed(2)}% p.a. over ${i.loanTerm} years`],
  ]);

  y = addTable(doc, margin, contentW, y, 'Results', [
    ['Selling costs', money(o.sellingCosts)],
    ['Net sale proceeds', money(o.netSaleProceeds)],
    ['Stamp duty', money(o.stampDuty)],
    ['Total buying costs', money(o.totalBuyingCosts)],
    ['Total purchase cost', money(o.totalPurchaseCost)],
    ['Total funds available', money(o.totalFundsAvailable)],
    ['Loan required', money(o.loanRequired)],
    ['LVR', `${o.lvr.toFixed(1)}%`],
    ['LMI likely', o.lmiApplies ? 'Yes — LVR above 80%' : 'No'],
  ]);

  y = addTable(doc, margin, contentW, y, 'Repayments', [
    ['Monthly', money(o.monthlyRepayment)],
    ['Fortnightly', money(o.fortnightlyRepayment)],
    ['Weekly', money(o.weeklyRepayment)],
    ['Total interest', money(o.totalInterest)],
    ['Total repaid', money(o.totalRepaid)],
  ]);

  if (i.useTargetLvr) {
    y = addTable(doc, margin, contentW, y, `Target LVR Planner — ${i.targetLvr.toFixed(0)}%`, [
      [`Loan at ${i.targetLvr.toFixed(0)}%`, money(o.targetLoan)],
      ['Funds needed', money(o.fundsNeededForTarget)],
      [o.extraSavingsRequired > 0 ? 'Extra savings required' : 'Surplus funds',
        money(o.extraSavingsRequired > 0 ? o.extraSavingsRequired : o.surplusFunds)],
      ['Monthly repayment at target', money(o.targetMonthlyRepayment)],
    ]);
  }

  addFooter(doc);
  doc.save('Margin-Sell-and-Buy-Calculator.pdf');
}

export async function generateStampDutyPdf(params: {
  inputs: {
    purchasePrice: number; stateLabel: string; isFirstHomeBuyer: boolean; hasMortgage: boolean;
    useTargetLvr: boolean; targetLvr: number; savings: number;
  };
  results: any;
  stateLabels: Record<string, string>;
}) {
  const { inputs: i, results: r, stateLabels } = params;
  const { doc, margin, contentW } = await startDoc('Stamp Duty Calculator', 'Government charges estimate');
  let y = 42;

  y = addTable(doc, margin, contentW, y, 'Your Scenario', [
    ['Purchase price', money(i.purchasePrice)],
    ['State / territory', i.stateLabel],
    ['First home buyer', i.isFirstHomeBuyer ? 'Yes' : 'No'],
    ['Purchasing with a mortgage', i.hasMortgage ? 'Yes' : 'No'],
  ]);

  y = addTable(doc, margin, contentW, y, 'Government Charges', [
    ['Stamp duty (before concession)', money(r.duty)],
    ['Concession applied', `- ${money(r.concession)}`],
    ['Stamp duty payable', money(r.netDuty)],
    ['Duty as % of price', `${r.dutyPercent.toFixed(2)}%`],
    ['Transfer / registration fees', money(r.fees.total)],
    ['Total government charges', money(r.totalGovCharges)],
  ]);

  if (i.useTargetLvr) {
    y = addTable(doc, margin, contentW, y, `Deposit Planner — ${i.targetLvr.toFixed(0)}% LVR`, [
      [`Loan at ${i.targetLvr.toFixed(0)}%`, money(r.targetLoan)],
      ['Deposit required', money(r.depositRequired)],
      ['Deposit + government charges', money(r.cashRequired)],
      ['Savings available', money(i.savings)],
      [r.extraSavingsRequired > 0 ? 'Extra savings required' : 'Surplus funds',
        money(r.extraSavingsRequired > 0 ? r.extraSavingsRequired : r.surplusFunds)],
    ]);
  }

  y = addTable(doc, margin, contentW, y, 'State Comparison (duty + fees)',
    r.comparison.map((c: any) => [stateLabels[c.state] ?? c.state, money(c.duty)] as [string, string]));

  addFooter(doc);
  doc.save('Margin-Stamp-Duty-Calculator.pdf');
}
