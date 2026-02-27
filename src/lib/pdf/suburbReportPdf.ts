import { jsPDF } from "jspdf";
import { SuburbAnalysis } from "@/lib/suburbAnalysis";
import { PDF_COLORS, drawCard, drawDivider, drawSectionTitle, drawRoundedRect, loadImageAsBase64, safeFormatCurrency, RGB } from "@/lib/pdf/pdfPrimitives";
import marginFinanceLogo from "@/assets/logo-icon.png";

type GenerateArgs = { analysis: SuburbAnalysis; projectionPeriod: number };
const MARGIN = 16;

const drawHeader = async (doc: jsPDF, analysis: SuburbAnalysis, date: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  try {
    const logoData = await loadImageAsBase64(marginFinanceLogo);
    const targetH = 10;
    const aspect = logoData.width / logoData.height;
    doc.addImage(logoData.base64, "PNG", MARGIN, 14, targetH * aspect, targetH);
  } catch {}
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...PDF_COLORS.muted);
  doc.text("SUBURB INVESTMENT ANALYSIS", pageWidth - MARGIN, 14, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text(`${analysis.suburb}, ${analysis.state} • ${date}`, pageWidth - MARGIN, 21, { align: "right" });
  drawDivider(doc, MARGIN, 28, pageWidth - MARGIN * 2);
  return 36;
};

const drawPageFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...PDF_COLORS.muted);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.setFillColor(...PDF_COLORS.bg); doc.rect(0, pageHeight - 24, pageWidth, 14, "F");
  doc.setFontSize(6); doc.setTextColor(...PDF_COLORS.muted);
  doc.text("DISCLAIMER: This report provides general information only. All outputs are estimates. Seek independent advice before making investment decisions.", MARGIN, pageHeight - 16);
};

export const generateSuburbReportPdf = async ({ analysis, projectionPeriod }: GenerateArgs) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

  // Cover Page
  doc.setFillColor(...PDF_COLORS.dark); doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(200, 200, 200);
  doc.text("SUBURB INVESTMENT REPORT", pageWidth / 2, 85, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(36); doc.setTextColor(255, 255, 255);
  doc.text(analysis.suburb, pageWidth / 2, 115, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(18); doc.setTextColor(200, 200, 200);
  doc.text(analysis.state, pageWidth / 2, 130, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(28); doc.setTextColor(...PDF_COLORS.brand);
  doc.text(`${analysis.recommendedGrowthRate.toFixed(1)}%`, pageWidth / 2, 165, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(200, 200, 200);
  doc.text("Recommended Growth Rate p.a.", pageWidth / 2, 175, { align: "center" });
  doc.setFontSize(9); doc.setTextColor(150, 150, 150);
  doc.text(`Generated ${date}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 30, { align: "center" });

  // Page 1: Overview
  doc.addPage();
  let y = await drawHeader(doc, analysis, date);

  drawCard(doc, MARGIN, y, contentWidth, 32);
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...PDF_COLORS.dark);
  doc.text(`${analysis.suburb}, ${analysis.state}`, MARGIN + 12, y + 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Comprehensive suburb investment analysis", MARGIN + 12, y + 26);
  y += 40;

  drawRoundedRect(doc, MARGIN, y, contentWidth, 28, 4, [254, 242, 242]);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...PDF_COLORS.muted);
  doc.text("Recommended Growth Rate", MARGIN + 12, y + 10);
  doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(...PDF_COLORS.brand);
  doc.text(`${analysis.recommendedGrowthRate.toFixed(1)}%`, MARGIN + 12, y + 24);
  doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(...PDF_COLORS.muted);
  doc.text("p.a.", MARGIN + 48, y + 24);
  y += 36;

  y = drawSectionTitle(doc, MARGIN, y, "Market Analysis"); y += 2;
  drawCard(doc, MARGIN, y, contentWidth, 40);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...PDF_COLORS.dark);
  const splitAnalysis = doc.splitTextToSize(analysis.marketAnalysis, contentWidth - 20);
  doc.text(splitAnalysis, MARGIN + 10, y + 12);
  y += 48;

  // Key metrics
  const gap = 6;
  const metricCardW = (contentWidth - gap * 3) / 4;
  const metrics = [
    { label: "Median House", value: analysis.medianHousePrice ? `$${(analysis.medianHousePrice / 1000000).toFixed(2)}M` : "N/A" },
    { label: "Median Unit", value: analysis.medianUnitPrice ? `$${(analysis.medianUnitPrice / 1000).toFixed(0)}K` : "N/A" },
    { label: "5-Year Growth", value: analysis.historicalGrowth.fiveYear !== null ? `+${analysis.historicalGrowth.fiveYear.toFixed(1)}%` : "N/A" },
    { label: "10-Year Growth", value: analysis.historicalGrowth.tenYear !== null ? `+${analysis.historicalGrowth.tenYear.toFixed(1)}%` : "N/A" },
  ];
  metrics.forEach((m, i) => {
    const mx = MARGIN + i * (metricCardW + gap);
    drawCard(doc, mx, y, metricCardW, 32);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...PDF_COLORS.muted);
    doc.text(m.label, mx + metricCardW / 2, y + 10, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...PDF_COLORS.dark);
    doc.text(m.value, mx + metricCardW / 2, y + 22, { align: "center" });
  });
  y += 44;

  // Growth drivers & risks
  y = drawSectionTitle(doc, MARGIN, y, "Growth Drivers & Risks"); y += 4;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  let driverY = y;
  analysis.growthDrivers.slice(0, 4).forEach((d) => {
    doc.setTextColor(...PDF_COLORS.success); doc.text("•", MARGIN + 4, driverY);
    doc.setTextColor(...PDF_COLORS.dark);
    const lines = doc.splitTextToSize(d, contentWidth / 2 - 16);
    doc.text(lines, MARGIN + 10, driverY);
    driverY += lines.length * 5 + 2;
  });

  let riskY = y;
  const riskX = MARGIN + contentWidth / 2 + gap;
  analysis.risks.slice(0, 4).forEach((r) => {
    doc.setTextColor(...PDF_COLORS.warning); doc.text("•", riskX + 4, riskY);
    doc.setTextColor(...PDF_COLORS.dark);
    const lines = doc.splitTextToSize(r, contentWidth / 2 - 16);
    doc.text(lines, riskX + 10, riskY);
    riskY += lines.length * 5 + 2;
  });

  drawPageFooter(doc, 2, 2);

  const now = new Date();
  doc.save(`${analysis.suburb.toLowerCase().replace(/\s+/g, "-")}-suburb-report-${now.toISOString().split("T")[0]}.pdf`);
};