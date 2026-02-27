// Australian Stamp Duty Calculations by State
// Based on standard rates for investment properties (non-first home buyer)

export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export const AUSTRALIAN_STATES: { value: AustralianState; label: string }[] = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

export function calculateStampDuty(purchasePrice: number, state: AustralianState): number {
  switch (state) {
    case 'NSW': return calculateNSWStampDuty(purchasePrice);
    case 'VIC': return calculateVICStampDuty(purchasePrice);
    case 'QLD': return calculateQLDStampDuty(purchasePrice);
    case 'WA': return calculateWAStampDuty(purchasePrice);
    case 'SA': return calculateSAStampDuty(purchasePrice);
    case 'TAS': return calculateTASStampDuty(purchasePrice);
    case 'ACT': return calculateACTStampDuty(purchasePrice);
    case 'NT': return calculateNTStampDuty(purchasePrice);
    default: return 0;
  }
}

function calculateNSWStampDuty(price: number): number {
  if (price <= 16000) return price * 0.0125;
  if (price <= 35000) return 200 + (price - 16000) * 0.015;
  if (price <= 93000) return 485 + (price - 35000) * 0.0175;
  if (price <= 351000) return 1500 + (price - 93000) * 0.035;
  if (price <= 1168000) return 10530 + (price - 351000) * 0.045;
  if (price <= 3505000) return 47295 + (price - 1168000) * 0.055;
  return 175830 + (price - 3505000) * 0.07;
}

function calculateVICStampDuty(price: number): number {
  if (price <= 25000) return price * 0.014;
  if (price <= 130000) return 350 + (price - 25000) * 0.024;
  if (price <= 960000) return 2870 + (price - 130000) * 0.06;
  if (price <= 2000000) return 52670 + (price - 960000) * 0.055;
  return 110000 + (price - 2000000) * 0.065;
}

function calculateQLDStampDuty(price: number): number {
  if (price <= 5000) return 0;
  if (price <= 75000) return (price - 5000) * 0.015;
  if (price <= 540000) return 1050 + (price - 75000) * 0.035;
  if (price <= 1000000) return 17325 + (price - 540000) * 0.045;
  return 38025 + (price - 1000000) * 0.0575;
}

function calculateWAStampDuty(price: number): number {
  if (price <= 120000) return price * 0.019;
  if (price <= 150000) return 2280 + (price - 120000) * 0.0285;
  if (price <= 360000) return 3135 + (price - 150000) * 0.038;
  if (price <= 725000) return 11115 + (price - 360000) * 0.0475;
  return 28453 + (price - 725000) * 0.0515;
}

function calculateSAStampDuty(price: number): number {
  if (price <= 12000) return price * 0.01;
  if (price <= 30000) return 120 + (price - 12000) * 0.02;
  if (price <= 50000) return 480 + (price - 30000) * 0.03;
  if (price <= 100000) return 1080 + (price - 50000) * 0.035;
  if (price <= 200000) return 2830 + (price - 100000) * 0.04;
  if (price <= 250000) return 6830 + (price - 200000) * 0.0425;
  if (price <= 300000) return 8955 + (price - 250000) * 0.0475;
  if (price <= 500000) return 11330 + (price - 300000) * 0.05;
  return 21330 + (price - 500000) * 0.055;
}

function calculateTASStampDuty(price: number): number {
  if (price <= 3000) return 50;
  if (price <= 25000) return 50 + (price - 3000) * 0.0175;
  if (price <= 75000) return 435 + (price - 25000) * 0.0225;
  if (price <= 200000) return 1560 + (price - 75000) * 0.035;
  if (price <= 375000) return 5935 + (price - 200000) * 0.04;
  if (price <= 725000) return 12935 + (price - 375000) * 0.0425;
  return 27810 + (price - 725000) * 0.045;
}

function calculateACTStampDuty(price: number): number {
  if (price <= 260000) return price * 0.012 + 20;
  if (price <= 300000) return price * 0.0214 - 2612;
  if (price <= 500000) return price * 0.0357 - 6902;
  if (price <= 750000) return price * 0.0432 - 10652;
  if (price <= 1000000) return price * 0.0492 - 15152;
  if (price <= 1455000) return price * 0.0565 - 22452;
  return price * 0.0455 + 5610;
}

function calculateNTStampDuty(price: number): number {
  const V = price / 1000;
  if (price <= 525000) return (0.06571441 * V * V) + (15 * V);
  if (price <= 3000000) return price * 0.0495 - 7911.13;
  if (price <= 5000000) return price * 0.0575 - 31911.13;
  return price * 0.0595 - 41911.13;
}
