// Historical property growth rates by Australian State/Territory

export type GrowthState = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';
export type AreaType = 'capitalCity' | 'regional';

interface GrowthRateData {
  capitalCity: number;
  regional: number | null;
  capitalCityName: string;
}

export const GROWTH_RATE_DATA: Record<GrowthState, GrowthRateData> = {
  NSW: { capitalCity: 7.5, regional: 6.8, capitalCityName: 'Sydney' },
  VIC: { capitalCity: 7.2, regional: 6.5, capitalCityName: 'Melbourne' },
  QLD: { capitalCity: 6.8, regional: 6.2, capitalCityName: 'Brisbane' },
  SA: { capitalCity: 6.0, regional: 5.5, capitalCityName: 'Adelaide' },
  WA: { capitalCity: 5.5, regional: 5.0, capitalCityName: 'Perth' },
  TAS: { capitalCity: 6.5, regional: 6.0, capitalCityName: 'Hobart' },
  NT: { capitalCity: 4.5, regional: 4.0, capitalCityName: 'Darwin' },
  ACT: { capitalCity: 6.8, regional: null, capitalCityName: 'Canberra' },
};

export function getGrowthRate(state: GrowthState, areaType: AreaType): number {
  const data = GROWTH_RATE_DATA[state];
  if (areaType === 'regional' && data.regional === null) return data.capitalCity;
  return areaType === 'capitalCity' ? data.capitalCity : (data.regional ?? data.capitalCity);
}

export function hasRegionalOption(state: GrowthState): boolean {
  return GROWTH_RATE_DATA[state].regional !== null;
}
