import { jsPDF } from "jspdf";

export type RGB = [number, number, number];

export const PDF_COLORS = {
  primary: [59, 130, 246] as RGB,
  brand: [220, 41, 28] as RGB,
  dark: [33, 30, 22] as RGB,
  muted: [107, 114, 128] as RGB,
  lightMuted: [156, 163, 175] as RGB,
  bg: [249, 250, 251] as RGB,
  pageBg: [255, 255, 255] as RGB,
  card: [255, 255, 255] as RGB,
  border: [229, 231, 235] as RGB,
  success: [34, 197, 94] as RGB,
  warning: [251, 191, 36] as RGB,
  danger: [239, 68, 68] as RGB,
};

export const safeFormatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return "$0";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export const loadImageAsBase64 = (src: string): Promise<{ base64: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Could not get canvas context"));
      ctx.drawImage(img, 0, 0);
      resolve({ base64: canvas.toDataURL("image/png"), width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = src;
  });
};

export const drawRoundedRect = (doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: RGB, border?: RGB) => {
  doc.setFillColor(...fill);
  if (border) { doc.setDrawColor(...border); doc.setLineWidth(0.35); doc.roundedRect(x, y, w, h, r, r, "FD"); }
  else { doc.roundedRect(x, y, w, h, r, r, "F"); }
};

export const drawCard = (doc: jsPDF, x: number, y: number, w: number, h: number, r: number = 4) => {
  drawRoundedRect(doc, x, y, w, h, r, PDF_COLORS.card, PDF_COLORS.border);
};

export const drawSectionTitle = (doc: jsPDF, x: number, y: number, title: string, fontSize = 14) => {
  doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize); doc.setTextColor(...PDF_COLORS.dark);
  doc.text(title, x, y); doc.setFont("helvetica", "normal"); return y + 6;
};

export const drawLabel = (doc: jsPDF, x: number, y: number, text: string, fontSize = 8) => {
  doc.setFont("helvetica", "normal"); doc.setFontSize(fontSize); doc.setTextColor(...PDF_COLORS.muted); doc.text(text, x, y);
};

export const drawValue = (doc: jsPDF, x: number, y: number, text: string, fontSize = 11, color: RGB = PDF_COLORS.dark) => {
  doc.setFont("helvetica", "bold"); doc.setFontSize(fontSize); doc.setTextColor(...color); doc.text(text, x, y); doc.setFont("helvetica", "normal");
};

export const drawDivider = (doc: jsPDF, x: number, y: number, width: number) => {
  doc.setDrawColor(...PDF_COLORS.border); doc.setLineWidth(0.3); doc.line(x, y, x + width, y);
};