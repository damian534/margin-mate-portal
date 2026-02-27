// Australian Land Tax Calculations by State (2024-25)
import { AustralianState } from "./stampDuty";

export interface LandTaxInputs {
  state: AustralianState;
  landValue: number;
  totalPropertiesOwned: number;
  isMainResidence: boolean;
  isPrimaryProduction: boolean;
  isForeignOwner: boolean;
}

export interface LandTaxResult {
  annualLandTax: number;
  effectiveRate: number;
  threshold: number;
  taxableValue: number;
  foreignSurcharge: number;
  notes: string[];
}

function exempt(threshold: number, note: string): LandTaxResult {
  return { annualLandTax: 0, effectiveRate: 0, threshold, taxableValue: 0, foreignSurcharge: 0, notes: [note] };
}

function calculateNSWLandTax(inputs: LandTaxInputs): LandTaxResult {
  const threshold = 1075000;
  if (inputs.isMainResidence) return exempt(threshold, "Main residence exemption applies");
  const lv = inputs.landValue;
  const notes: string[] = [];
  let tax = 0;
  if (lv <= threshold) { tax = 0; notes.push(`Below threshold`); }
  else if (lv <= 6571000) { tax = 100 + (lv - threshold) * 0.016; }
  else { tax = 88036 + (lv - 6571000) * 0.02; }
  let fs = 0;
  if (inputs.isForeignOwner) { fs = lv * 0.04; notes.push("Foreign surcharge: 4%"); }
  const total = tax + fs;
  return { annualLandTax: total, effectiveRate: lv > 0 ? (total / lv) * 100 : 0, threshold, taxableValue: Math.max(0, lv - threshold), foreignSurcharge: fs, notes };
}

function calculateVICLandTax(inputs: LandTaxInputs): LandTaxResult {
  const threshold = 50000;
  if (inputs.isMainResidence) return exempt(threshold, "PPR exemption applies");
  const lv = inputs.landValue;
  const notes: string[] = [];
  let tax = 0;
  if (lv <= threshold) tax = 0;
  else if (lv <= 100000) tax = (lv - 50000) * 0.002;
  else if (lv <= 300000) tax = 100 + (lv - 100000) * 0.005;
  else if (lv <= 600000) tax = 1100 + (lv - 300000) * 0.008;
  else if (lv <= 1000000) tax = 3500 + (lv - 600000) * 0.013;
  else if (lv <= 1800000) tax = 8700 + (lv - 1000000) * 0.016;
  else if (lv <= 3000000) tax = 21500 + (lv - 1800000) * 0.021;
  else tax = 46700 + (lv - 3000000) * 0.025;
  if (lv >= 300000) { const cl = lv >= 1800000 ? lv * 0.001 : lv * 0.0005; tax += cl; notes.push("COVID debt levy"); }
  let fs = 0;
  if (inputs.isForeignOwner) { fs = lv * 0.04; notes.push("Absentee surcharge: 4%"); }
  const total = tax + fs;
  return { annualLandTax: total, effectiveRate: lv > 0 ? (total / lv) * 100 : 0, threshold, taxableValue: Math.max(0, lv - threshold), foreignSurcharge: fs, notes };
}

function calculateQLDLandTax(inputs: LandTaxInputs): LandTaxResult {
  const threshold = 600000;
  if (inputs.isMainResidence) return exempt(threshold, "Home exemption applies");
  const lv = inputs.landValue;
  const notes: string[] = [];
  let tax = 0;
  if (lv <= threshold) tax = 0;
  else if (lv <= 1000000) tax = 500 + (lv - 600000) * 0.01;
  else if (lv <= 3000000) tax = 4500 + (lv - 1000000) * 0.0165;
  else if (lv <= 5000000) tax = 37500 + (lv - 3000000) * 0.0175;
  else if (lv <= 10000000) tax = 72500 + (lv - 5000000) * 0.0225;
  else tax = 185000 + (lv - 10000000) * 0.0275;
  let fs = 0;
  if (inputs.isForeignOwner) { fs = lv * 0.02; notes.push("AFAD surcharge: 2%"); }
  const total = tax + fs;
  return { annualLandTax: total, effectiveRate: lv > 0 ? (total / lv) * 100 : 0, threshold, taxableValue: Math.max(0, lv - threshold), foreignSurcharge: fs, notes };
}

function simpleStateLandTax(inputs: LandTaxInputs, threshold: number, calc: (lv: number) => number): LandTaxResult {
  if (inputs.isMainResidence) return exempt(threshold, "PPR exemption applies");
  const lv = inputs.landValue;
  const notes: string[] = [];
  const tax = lv <= threshold ? 0 : calc(lv);
  let fs = 0;
  if (inputs.isForeignOwner) { fs = lv * 0.02; notes.push("Foreign surcharge: 2%"); }
  const total = tax + fs;
  return { annualLandTax: total, effectiveRate: lv > 0 ? (total / lv) * 100 : 0, threshold, taxableValue: Math.max(0, lv - threshold), foreignSurcharge: fs, notes };
}

export function calculateLandTax(inputs: LandTaxInputs): LandTaxResult {
  switch (inputs.state) {
    case 'NSW': return calculateNSWLandTax(inputs);
    case 'VIC': return calculateVICLandTax(inputs);
    case 'QLD': return calculateQLDLandTax(inputs);
    case 'WA': return simpleStateLandTax(inputs, 300000, (lv) => {
      if (lv <= 420000) return 300;
      if (lv <= 1000000) return 300 + (lv - 420000) * 0.0025;
      if (lv <= 1800000) return 1750 + (lv - 1000000) * 0.009;
      if (lv <= 5000000) return 8950 + (lv - 1800000) * 0.018;
      if (lv <= 11000000) return 66550 + (lv - 5000000) * 0.022;
      return 198550 + (lv - 11000000) * 0.027;
    });
    case 'SA': return simpleStateLandTax(inputs, 713000, (lv) => {
      if (lv <= 1102000) return 50 + (lv - 713000) * 0.005;
      if (lv <= 1350000) return 1995 + (lv - 1102000) * 0.01;
      return 4475 + (lv - 1350000) * 0.024;
    });
    case 'TAS': return simpleStateLandTax(inputs, 100000, (lv) => {
      if (lv <= 250000) return 475 + (lv - 100000) * 0.005;
      if (lv <= 350000) return 1225 + (lv - 250000) * 0.0075;
      if (lv <= 400000) return 1975 + (lv - 350000) * 0.01;
      if (lv <= 600000) return 2475 + (lv - 400000) * 0.0125;
      return 4975 + (lv - 600000) * 0.015;
    });
    case 'ACT': {
      if (inputs.isMainResidence) return exempt(0, "PPR exemption applies");
      const lv = inputs.landValue;
      const notes: string[] = [];
      let tax = 1499;
      if (lv <= 150000) tax += lv * 0.0054;
      else if (lv <= 275000) tax += 810 + (lv - 150000) * 0.0064;
      else if (lv <= 2000000) tax += 1610 + (lv - 275000) * 0.0107;
      else tax += 20068 + (lv - 2000000) * 0.015;
      let fs = 0;
      if (inputs.isForeignOwner) { fs = lv * 0.0075; notes.push("Foreign surcharge: 0.75%"); }
      const total = tax + fs;
      return { annualLandTax: total, effectiveRate: lv > 0 ? (total / lv) * 100 : 0, threshold: 0, taxableValue: lv, foreignSurcharge: fs, notes };
    }
    case 'NT': return { annualLandTax: 0, effectiveRate: 0, threshold: 0, taxableValue: 0, foreignSurcharge: 0, notes: ["NT has no land tax for individuals"] };
    default: return { annualLandTax: 0, effectiveRate: 0, threshold: 0, taxableValue: 0, foreignSurcharge: 0, notes: ["Unknown state"] };
  }
}
