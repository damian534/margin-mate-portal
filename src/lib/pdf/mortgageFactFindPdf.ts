import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MORTGAGE_STEPS } from '@/components/mortgage-factfind/mortgage-steps';
import { AllFormData, WizardField } from '@/components/mortgage-factfind/types';
import { PDF_COLORS, drawRoundedRect, drawSectionTitle, drawDivider, loadImageAsBase64 } from './pdfPrimitives';
import logoSrc from '@/assets/margin-icon-tm.png';

function formatValue(field: WizardField, value: any): string {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === 'currency') return `$${Number(value).toLocaleString()}`;
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  if (field.options) {
    const opt = field.options.find(o => o.value === value);
    return opt?.label ?? String(value);
  }
  return String(value);
}

export async function generateMortgageFactFindPdf(formData: AllFormData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Try load logo
  let logoBase64: string | null = null;
  try {
    const img = await loadImageAsBase64(logoSrc);
    logoBase64 = img.base64;
  } catch {}

  // Header
  drawRoundedRect(doc, 0, 0, pageW, 32, 0, PDF_COLORS.dark);
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 6, 20, 20);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Mortgage Application – Fact Find', margin + 25, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-AU')}`, margin + 25, 23);
  y = 40;

  // Get primary name
  const primary = formData.mff_primary_personal ?? {};
  const name = [primary.first_name, primary.last_name].filter(Boolean).join(' ') || 'Applicant';
  doc.setTextColor(...PDF_COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Applicant: ${name}`, margin, y);
  y += 8;

  const activeSteps = MORTGAGE_STEPS.filter(s => !s.condition || s.condition(formData));

  for (const step of activeSteps) {
    const sectionData = formData[step.sectionKey] ?? {};
    const displayFields = step.fields.filter(
      f => f.type !== 'heading' && f.type !== 'info' && f.type !== 'button-group' &&
        (!f.condition || f.condition(sectionData))
    );

    const filledFields = displayFields.filter(f => {
      const v = sectionData[f.key];
      return v !== undefined && v !== null && v !== '';
    });

    if (filledFields.length === 0) continue;

    // Check for page break
    if (y > 260) {
      doc.addPage();
      y = margin;
    }

    // Section title
    drawDivider(doc, margin, y, contentW);
    y += 4;
    y = drawSectionTitle(doc, margin, y + 4, step.title, 11);

    // Build rows for this section
    const rows: [string, string][] = [];

    for (const field of filledFields) {
      const v = sectionData[field.key];
      if (v === undefined || v === null || v === '') continue;

      if (field.type === 'repeatable' && Array.isArray(v)) {
        v.forEach((item: any, i: number) => {
          rows.push([`${field.itemLabel || 'Item'} ${i + 1}`, '']);
          field.fields?.forEach(sf => {
            const sv = item[sf.key];
            if (sv !== undefined && sv !== null && sv !== '') {
              rows.push([`  ${sf.label}`, formatValue(sf, sv)]);
            }
          });
        });
      } else {
        rows.push([field.label, formatValue(field, v)]);
      }
    }

    if (rows.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [],
        body: rows,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 1.5, textColor: PDF_COLORS.dark },
        columnStyles: {
          0: { cellWidth: contentW * 0.45, fontStyle: 'normal', textColor: PDF_COLORS.muted },
          1: { cellWidth: contentW * 0.55, fontStyle: 'bold' },
        },
        didDrawPage: () => {},
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.lightMuted);
    doc.text(
      `Margin Finance – Mortgage Fact Find | Page ${i} of ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`Mortgage-FactFind-${name.replace(/\s/g, '-')}.pdf`);
}
