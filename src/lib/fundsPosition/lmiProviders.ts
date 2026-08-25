/**
 * Lender-level LMI pricing.
 *
 * In Australia the premium is set by the mortgage insurer (Helia, QBE) or by
 * the lender itself when it is self-insured / uses a risk fee. Each lender in
 * Settings → Lenders can therefore store:
 *   - which provider it uses (drives the base premium table)
 *   - a loading/discount multiplier applied to that table
 *   - its own maximum LVR, maximum capitalised LVR and waiver rules
 *   - optionally a fully custom LVR × loan-size rate matrix
 *
 * All figures remain indicative — confirm with the lender's own quote.
 */

export type LmiProviderKey = 'helia' | 'qbe' | 'self_insured' | 'generic' | 'none';

export const LMI_PROVIDERS: { value: LmiProviderKey; label: string }[] = [
  { value: 'generic', label: 'Generic / market average' },
  { value: 'helia', label: 'Helia' },
  { value: 'qbe', label: 'QBE' },
  { value: 'self_insured', label: 'Self-insured / risk fee' },
  { value: 'none', label: 'No LMI (waiver only)' },
];

/** Premium as a % of the base loan, by LVR band and loan-size band. */
export interface RateBand {
  maxLvr: number;
  /** rate % per loan-size band, ordered ascending by maxLoan (Infinity last) */
  rates: { maxLoan: number; rate: number }[];
}

export type RateTable = RateBand[];

const band = (maxLvr: number, a: number, b: number, c: number, d: number): RateBand => ({
  maxLvr,
  rates: [
    { maxLoan: 300_000, rate: a },
    { maxLoan: 600_000, rate: b },
    { maxLoan: 1_000_000, rate: c },
    { maxLoan: Infinity, rate: d },
  ],
});

/** Market-average table (matches the previous single-table estimate). */
export const GENERIC_TABLE: RateTable = [
  band(81, 0.475, 0.523, 0.57, 0.665),
  band(82, 0.568, 0.625, 0.681, 0.795),
  band(83, 0.696, 0.766, 0.835, 0.974),
  band(84, 0.809, 0.89, 0.97, 1.133),
  band(85, 0.936, 1.03, 1.123, 1.31),
  band(86, 1.106, 1.217, 1.327, 1.548),
  band(87, 1.294, 1.423, 1.553, 1.812),
  band(88, 1.464, 1.61, 1.757, 2.05),
  band(89, 1.828, 2.011, 2.194, 2.559),
  band(90, 2.148, 2.363, 2.578, 3.007),
  band(91, 2.568, 2.825, 3.082, 3.595),
  band(92, 2.79, 3.069, 3.348, 3.906),
  band(93, 3.129, 3.442, 3.755, 4.381),
  band(94, 3.269, 3.596, 3.923, 4.577),
  band(95, 3.379, 3.717, 4.055, 4.731),
];

/** Helia-style table (slightly sharper sub-90, dearer above). */
export const HELIA_TABLE: RateTable = [
  band(81, 0.457, 0.503, 0.548, 0.64),
  band(82, 0.546, 0.601, 0.655, 0.765),
  band(83, 0.669, 0.736, 0.803, 0.937),
  band(84, 0.778, 0.856, 0.933, 1.09),
  band(85, 0.9, 0.99, 1.08, 1.26),
  band(86, 1.084, 1.192, 1.3, 1.517),
  band(87, 1.268, 1.395, 1.522, 1.776),
  band(88, 1.435, 1.578, 1.722, 2.009),
  band(89, 1.792, 1.971, 2.15, 2.508),
  band(90, 2.106, 2.317, 2.527, 2.948),
  band(91, 2.594, 2.853, 3.113, 3.632),
  band(92, 2.818, 3.1, 3.382, 3.945),
  band(93, 3.16, 3.476, 3.792, 4.424),
  band(94, 3.302, 3.632, 3.962, 4.623),
  band(95, 3.413, 3.754, 4.096, 4.778),
];

/** QBE-style table. */
export const QBE_TABLE: RateTable = [
  band(81, 0.492, 0.541, 0.59, 0.688),
  band(82, 0.589, 0.648, 0.707, 0.824),
  band(83, 0.723, 0.795, 0.867, 1.012),
  band(84, 0.84, 0.924, 1.008, 1.176),
  band(85, 0.972, 1.069, 1.166, 1.36),
  band(86, 1.128, 1.241, 1.354, 1.579),
  band(87, 1.32, 1.452, 1.584, 1.848),
  band(88, 1.493, 1.642, 1.792, 2.09),
  band(89, 1.864, 2.05, 2.237, 2.61),
  band(90, 2.19, 2.409, 2.628, 3.066),
  band(91, 2.542, 2.796, 3.05, 3.559),
  band(92, 2.762, 3.038, 3.314, 3.867),
  band(93, 3.098, 3.408, 3.718, 4.337),
  band(94, 3.236, 3.56, 3.883, 4.53),
  band(95, 3.345, 3.68, 4.014, 4.683),
];

export const PROVIDER_TABLES: Record<Exclude<LmiProviderKey, 'none'>, RateTable> = {
  generic: GENERIC_TABLE,
  helia: HELIA_TABLE,
  qbe: QBE_TABLE,
  self_insured: GENERIC_TABLE,
};

/** LMI configuration stored against a lender. */
export interface LenderLmiProfile {
  lenderId?: string | null;
  lenderName?: string | null;
  provider: LmiProviderKey;
  /** multiplier applied to the base table, 1 = table rate */
  multiplier: number;
  /** highest LVR the lender will lend to with LMI */
  maxLvr: number;
  /** highest LVR once LMI is capitalised */
  maxCapitalisedLvr: number;
  /** LVR up to which LMI is waived (e.g. 90 for medico/professional waivers) */
  waiverMaxLvr: number | null;
  waiverNotes?: string | null;
  /** custom LVR × loan-size matrix, overrides the provider table */
  customTable?: RateTable | null;
  notes?: string | null;
}

export const defaultLmiProfile = (name?: string | null): LenderLmiProfile => ({
  lenderName: name ?? null,
  provider: 'generic',
  multiplier: 1,
  maxLvr: 95,
  maxCapitalisedLvr: 97,
  waiverMaxLvr: null,
  waiverNotes: null,
  customTable: null,
});

export interface LmiQuote {
  premium: number;
  ratePct: number;
  /** false when the LVR is outside the lender's appetite */
  eligible: boolean;
  waived: boolean;
  note: string | null;
  provider: LmiProviderKey;
}

function tableFor(profile: LenderLmiProfile): RateTable | null {
  if (profile.provider === 'none') return null;
  if (profile.customTable && profile.customTable.length) return profile.customTable;
  return PROVIDER_TABLES[profile.provider] ?? GENERIC_TABLE;
}

export function rateFromTable(table: RateTable, lvr: number, loan: number): number {
  const b = table.find(x => lvr <= x.maxLvr) ?? table[table.length - 1];
  if (!b) return 0;
  const r = b.rates.find(x => loan <= x.maxLoan) ?? b.rates[b.rates.length - 1];
  return r?.rate ?? 0;
}

/** Price LMI for one lender at a given base loan / LVR. */
export function quoteLmi(
  profile: LenderLmiProfile,
  baseLoan: number,
  lvr: number,
  investment = false,
): LmiQuote {
  const base = { provider: profile.provider, premium: 0, ratePct: 0, eligible: true, waived: false, note: null as string | null };
  if (!isFinite(lvr) || lvr <= 80 || baseLoan <= 0) return base;

  if (profile.waiverMaxLvr != null && lvr <= profile.waiverMaxLvr) {
    return { ...base, waived: true, note: profile.waiverNotes || `LMI waived to ${profile.waiverMaxLvr}% LVR` };
  }
  if (profile.provider === 'none') {
    return { ...base, eligible: false, note: 'This lender is set to no-LMI lending only' };
  }
  if (lvr > profile.maxLvr) {
    return { ...base, eligible: false, note: `Above the lender's max ${profile.maxLvr}% LVR` };
  }

  const table = tableFor(profile);
  if (!table) return base;
  const ratePct = rateFromTable(table, lvr, baseLoan) * (profile.multiplier || 1) * (investment ? 1.1 : 1);
  return { ...base, ratePct, premium: baseLoan * (ratePct / 100) };
}
