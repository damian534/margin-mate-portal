// Estimated government charges (other than stamp duty) payable on a property purchase.
// Land titles office transfer registration fee + mortgage registration fee.
// These are indicative estimates based on published state/territory fee schedules
// and should be confirmed with the relevant titles office or your conveyancer.

export type GovFeeState = "VIC" | "NSW" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT";

export interface GovFees {
  transferFee: number;
  mortgageRegistrationFee: number;
  total: number;
}

export function calculateGovFees(price: number, state: GovFeeState, hasMortgage = true): GovFees {
  let transferFee = 0;
  let mortgageFee = 0;

  switch (state) {
    case "VIC": {
      // Land Use Victoria 2025-26: base fee + $2.34 per $1,000 (or part) of consideration, capped
      transferFee = Math.min(3614, 110.9 + Math.ceil(price / 1000) * 2.34);
      mortgageFee = 120.6;
      break;
    }
    case "NSW": {
      // NSW LRS 2025/26 standard dealing fee (flat, not value-scaled)
      transferFee = 160.19;
      mortgageFee = 160.19;
      break;
    }
    case "QLD": {
      // Titles Queensland FY2025/26: $238.14 base + $44.71 per $10,000 (or part) above $180,000
      transferFee =
        price <= 180000 ? 238.14 : 238.14 + Math.ceil((price - 180000) / 10000) * 44.71;
      mortgageFee = 238.14;
      break;
    }
    case "SA": {
      // Land Services SA 2025-26: value-scaled step table, approx $198 base
      // plus ~$100 per $10,000 (or part) of purchase price
      transferFee = 198 + Math.ceil(price / 10000) * 100;
      mortgageFee = 204;
      break;
    }
    case "WA": {
      // Landgate 2025-26 transfer lodgement scale (value-scaled)
      transferFee = 200 + Math.ceil(price / 100000) * 20;
      mortgageFee = 197.2;
      break;
    }
    case "TAS": {
      // Tasmanian Land Titles Office 2025-26 flat lodgement fee
      transferFee = 172.85;
      mortgageFee = 172.85;
      break;
    }
    case "ACT": {
      // Access Canberra 2025-26 land title lodgement fees
      transferFee = 479;
      mortgageFee = 178;
      break;
    }
    case "NT": {
      // NT Land Titles Office flat revenue-unit fees (not value-scaled)
      transferFee = 232;
      mortgageFee = 232;
      break;
    }
  }


  if (!hasMortgage) mortgageFee = 0;

  return {
    transferFee,
    mortgageRegistrationFee: mortgageFee,
    total: transferFee + mortgageFee,
  };
}
