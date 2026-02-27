// Historical RBA Cash Rates from 1990 to present

const RBA_CASH_RATES: Record<number, number> = {
  1990: 15.00, 1991: 11.00, 1992: 6.50, 1993: 5.25, 1994: 5.00,
  1995: 7.50, 1996: 7.25, 1997: 5.50, 1998: 5.00, 1999: 4.75,
  2000: 6.00, 2001: 5.00, 2002: 4.75, 2003: 4.75, 2004: 5.25,
  2005: 5.50, 2006: 5.75, 2007: 6.50, 2008: 6.00, 2009: 3.25,
  2010: 4.50, 2011: 4.75, 2012: 3.50, 2013: 2.75, 2014: 2.50,
  2015: 2.00, 2016: 1.75, 2017: 1.50, 2018: 1.50, 2019: 1.00,
  2020: 0.25, 2021: 0.10, 2022: 1.50, 2023: 4.00, 2024: 4.35,
  2025: 4.35, 2026: 4.35,
};

export function getRBACashRate(year: number): number {
  if (year in RBA_CASH_RATES) return RBA_CASH_RATES[year];
  if (year < 1990) return RBA_CASH_RATES[1990];
  return RBA_CASH_RATES[2025] || 4.35;
}

export function getConsumerRate(year: number, buffer: number = 2.0): number {
  return getRBACashRate(year) + buffer;
}

export function getAverageRateForPeriod(startYear: number, endYear: number, buffer: number = 2.0): number {
  if (endYear <= startYear) return getConsumerRate(startYear, buffer);
  let totalRate = 0;
  const years = endYear - startYear + 1;
  for (let year = startYear; year <= endYear; year++) {
    totalRate += getConsumerRate(year, buffer);
  }
  return totalRate / years;
}
