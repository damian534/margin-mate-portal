// Australian stamp duty (land transfer duty) rates — kept in sync with the Margin website calculators.

export type StateKey = 'VIC' | 'NSW' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT';

export interface DutyResult { duty: number; concession: number }

function calcVIC(price: number, fhb: boolean): DutyResult { let d=0; if(price<=25000) d=price*0.014; else if(price<=130000) d=350+(price-25000)*0.024; else if(price<=960000) d=2870+(price-130000)*0.06; else if(price<=2000000) d=2870+(960000-130000)*0.06+(price-960000)*0.055; else d=price*0.065; let c=0; if(fhb){if(price<=600000)c=d;else if(price<=750000)c=d*((750000-price)/150000);} return{duty:d,concession:c}; }
function calcNSW(price: number, fhb: boolean): DutyResult { let d=0; if(price<=17000) d=price*0.0125; else if(price<=36000) d=212+(price-17000)*0.015; else if(price<=97000) d=497+(price-36000)*0.0175; else if(price<=364000) d=1565+(price-97000)*0.035; else if(price<=1214000) d=10910+(price-364000)*0.045; else if(price<=3636000) d=49160+(price-1214000)*0.055; else d=182380+(price-3636000)*0.07; let c=0; if(fhb){if(price<=800000)c=d;else if(price<=1000000)c=d*((1000000-price)/200000);} return{duty:d,concession:c}; }
function calcQLD(price: number, fhb: boolean): DutyResult { let d=0; if(price<=5000) d=0; else if(price<=75000) d=(price-5000)*0.015; else if(price<=540000) d=1050+(price-75000)*0.035; else if(price<=1000000) d=17325+(price-540000)*0.045; else d=38025+(price-1000000)*0.0575; let c=0; if(fhb){if(price<=500000)c=8750;else if(price<=550000)c=8750*((550000-price)/50000);c=Math.min(c,d);} return{duty:d,concession:c}; }
function calcSA(price: number): DutyResult { let d=0; if(price<=12000) d=price*0.01; else if(price<=30000) d=120+(price-12000)*0.02; else if(price<=50000) d=480+(price-30000)*0.03; else if(price<=100000) d=1080+(price-50000)*0.035; else if(price<=200000) d=2830+(price-100000)*0.04; else if(price<=250000) d=6830+(price-200000)*0.0425; else if(price<=300000) d=8955+(price-250000)*0.0475; else if(price<=500000) d=11330+(price-300000)*0.05; else d=21330+(price-500000)*0.055; return{duty:d,concession:0}; }
function calcWA(price: number, fhb: boolean): DutyResult { let d=0; if(price<=120000) d=price*0.019; else if(price<=150000) d=2280+(price-120000)*0.0285; else if(price<=360000) d=3135+(price-150000)*0.038; else if(price<=725000) d=11115+(price-360000)*0.0475; else d=28453+(price-725000)*0.0515; let c=0; if(fhb){if(price<=430000)c=d;else if(price<=530000)c=d*((530000-price)/100000);} return{duty:d,concession:c}; }
function calcTAS(price: number, fhb: boolean): DutyResult { let d=0; if(price<=3000) d=50; else if(price<=25000) d=50+(price-3000)*0.0175; else if(price<=75000) d=435+(price-25000)*0.025; else if(price<=200000) d=1685+(price-75000)*0.035; else if(price<=375000) d=6060+(price-200000)*0.04; else if(price<=725000) d=13060+(price-375000)*0.0425; else d=27935+(price-725000)*0.045; let c=0; if(fhb&&price<=600000) c=d*0.5; return{duty:d,concession:c}; }
function calcACT(price: number, fhb: boolean): DutyResult { let d=0; if(price<=260000) d=price*0.006*((260000-price)/260000+1); else if(price<=300000) d=price*0.0235; else if(price<=500000) d=price*0.04; else if(price<=750000) d=price*0.05; else if(price<=1000000) d=price*0.055; else if(price<=1455000) d=price*0.06; else d=price*0.07; let c=0; if(fhb&&price<=1000000) c=d; return{duty:d,concession:c}; }
function calcNT(price: number): DutyResult { let d=0; if(price<=525000){const v=price/1000;d=(0.06571441*v*v)+(15*v);}else d=price*0.0495; return{duty:d,concession:0}; }

export const stateCalcs: Record<StateKey, (price: number, fhb: boolean) => DutyResult> = {
  VIC: calcVIC, NSW: calcNSW, QLD: calcQLD, SA: (p) => calcSA(p), WA: calcWA, TAS: calcTAS, ACT: calcACT, NT: (p) => calcNT(p),
};

export const stateLabels: Record<StateKey, string> = {
  VIC: 'Victoria', NSW: 'New South Wales', QLD: 'Queensland', SA: 'South Australia',
  WA: 'Western Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory',
};

export const fhbNotes: Record<StateKey, string> = {
  VIC: 'Full exemption ≤$600k, sliding scale $600k–$750k',
  NSW: 'Full exemption ≤$800k, sliding scale $800k–$1M',
  QLD: 'Up to $8,750 concession for properties ≤$550k',
  SA: 'SA offers a $15k First Home Owner Grant instead of stamp duty concession',
  WA: 'Full exemption ≤$430k, sliding scale $430k–$530k',
  TAS: '50% discount on properties ≤$600k',
  ACT: 'Full exemption for properties ≤$1M',
  NT: 'NT does not offer a specific FHB stamp duty concession',
};

/** Net stamp duty payable after any first home buyer concession. */
export function calculateStampDuty(price: number, state: StateKey, fhb = false): number {
  const { duty, concession } = stateCalcs[state](price, fhb);
  return Math.max(0, duty - concession);
}
