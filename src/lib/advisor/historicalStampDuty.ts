// Historical Australian Stamp Duty Calculations by State and Year
import { AustralianState } from "./stampDuty";

function calculateNSWHistorical(price: number, year: number): number {
  if (year < 2019) {
    if (price <= 14000) return price * 0.0125;
    if (price <= 30000) return 175 + (price - 14000) * 0.015;
    if (price <= 80000) return 415 + (price - 30000) * 0.0175;
    if (price <= 300000) return 1290 + (price - 80000) * 0.035;
    if (price <= 1000000) return 8990 + (price - 300000) * 0.045;
    return 40490 + (price - 1000000) * 0.055;
  }
  // 2024+ rates
  if (price <= 17000) return price * 0.0125;
  if (price <= 36000) return 212 + (price - 17000) * 0.015;
  if (price <= 97000) return 497 + (price - 36000) * 0.0175;
  if (price <= 364000) return 1564 + (price - 97000) * 0.035;
  if (price <= 1212000) return 10909 + (price - 364000) * 0.045;
  return 49069 + (price - 1212000) * 0.055;
}

function calculateVICHistorical(price: number, year: number): number {
  if (price <= 25000) return price * 0.014;
  if (price <= 130000) return 350 + (price - 25000) * 0.024;
  if (price <= 960000) return 2870 + (price - 130000) * 0.06;
  if (year < 2021) return 52670 + (price - 960000) * 0.055;
  if (price <= 2000000) return 52670 + (price - 960000) * 0.055;
  return 110000 + (price - 2000000) * 0.065;
}

function calculateQLDHistorical(price: number, _year: number): number {
  if (price <= 5000) return 0;
  if (price <= 75000) return (price - 5000) * 0.015;
  if (price <= 540000) return 1050 + (price - 75000) * 0.035;
  if (price <= 1000000) return 17325 + (price - 540000) * 0.045;
  return 38025 + (price - 1000000) * 0.0575;
}

function calculateWAHistorical(price: number, _year: number): number {
  if (price <= 120000) return price * 0.019;
  if (price <= 150000) return 2280 + (price - 120000) * 0.0285;
  if (price <= 360000) return 3135 + (price - 150000) * 0.038;
  if (price <= 725000) return 11115 + (price - 360000) * 0.0475;
  return 28453 + (price - 725000) * 0.0515;
}

function calculateSAHistorical(price: number, _year: number): number {
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

function calculateTASHistorical(price: number, _year: number): number {
  if (price <= 3000) return 50;
  if (price <= 25000) return 50 + (price - 3000) * 0.0175;
  if (price <= 75000) return 435 + (price - 25000) * 0.0225;
  if (price <= 200000) return 1560 + (price - 75000) * 0.035;
  if (price <= 375000) return 5935 + (price - 200000) * 0.04;
  if (price <= 725000) return 12935 + (price - 375000) * 0.0425;
  return 27810 + (price - 725000) * 0.045;
}

function calculateACTHistorical(price: number, year: number): number {
  if (year <= 2020) {
    if (price <= 260000) return price * 0.014 + 20;
    if (price <= 300000) return price * 0.025 - 2500;
    if (price <= 500000) return price * 0.04 - 7000;
    if (price <= 750000) return price * 0.045 - 9500;
    if (price <= 1000000) return price * 0.05 - 13250;
    return price * 0.06 - 23250;
  }
  if (price <= 260000) return price * 0.012 + 20;
  if (price <= 300000) return price * 0.0214 - 2612;
  if (price <= 500000) return price * 0.0357 - 6902;
  if (price <= 750000) return price * 0.0432 - 10652;
  if (price <= 1000000) return price * 0.0492 - 15152;
  if (price <= 1455000) return price * 0.0565 - 22452;
  return price * 0.0455 + 5610;
}

function calculateNTHistorical(price: number, _year: number): number {
  const V = price / 1000;
  if (price <= 525000) return (0.06571441 * V * V) + (15 * V);
  if (price <= 3000000) return price * 0.0495 - 7911.13;
  if (price <= 5000000) return price * 0.0575 - 31911.13;
  return price * 0.0595 - 41911.13;
}

function calculatePreDataStampDuty(price: number, state: AustralianState, year: number): number {
  const yearMultiplier = 0.7 + ((year - 1990) * 0.02);
  const calcMap: Record<string, (p: number, y: number) => number> = {
    NSW: calculateNSWHistorical, VIC: calculateVICHistorical, QLD: calculateQLDHistorical,
    WA: calculateWAHistorical, SA: calculateSAHistorical, TAS: calculateTASHistorical,
    ACT: calculateACTHistorical, NT: calculateNTHistorical,
  };
  const calc = calcMap[state];
  return calc ? calc(price, 2005) * yearMultiplier : price * 0.04 * yearMultiplier;
}

export function calculateHistoricalStampDuty(purchasePrice: number, state: AustralianState, purchaseYear: number): number {
  if (purchaseYear < 2005) return calculatePreDataStampDuty(purchasePrice, state, purchaseYear);
  const calcMap: Record<string, (p: number, y: number) => number> = {
    NSW: calculateNSWHistorical, VIC: calculateVICHistorical, QLD: calculateQLDHistorical,
    WA: calculateWAHistorical, SA: calculateSAHistorical, TAS: calculateTASHistorical,
    ACT: calculateACTHistorical, NT: calculateNTHistorical,
  };
  const calc = calcMap[state];
  return calc ? calc(purchasePrice, purchaseYear) : 0;
}

export function getPurchaseYearOptions(): { value: number; label: string }[] {
  const currentYear = new Date().getFullYear();
  const years: { value: number; label: string }[] = [];
  for (let year = currentYear; year >= 1990; year--) {
    years.push({ value: year, label: year.toString() });
  }
  return years;
}
