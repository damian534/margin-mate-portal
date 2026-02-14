// VIC stamp duty calculation (2024/25 rates)
// https://www.sro.vic.gov.au/land-transfer-duty-rates
export function calculateVicStampDuty(purchasePrice: number): number {
  if (purchasePrice <= 25000) {
    return purchasePrice * 0.014;
  } else if (purchasePrice <= 130000) {
    return 350 + (purchasePrice - 25000) * 0.024;
  } else if (purchasePrice <= 960000) {
    return 2870 + (purchasePrice - 130000) * 0.06;
  } else if (purchasePrice <= 2000000) {
    return 2870 + (960000 - 130000) * 0.06 + (purchasePrice - 960000) * 0.055;
    // Simplified: 52670 + (purchasePrice - 960000) * 0.055
  } else {
    // Over $2M: 6.5% flat on total (premium duty)
    return purchasePrice * 0.065;
  }
}

export function calculateStampDuty(purchasePrice: number, state: string): number {
  switch (state) {
    case 'VIC':
      return calculateVicStampDuty(purchasePrice);
    default:
      // Estimate for other states
      return purchasePrice * 0.055;
  }
}
