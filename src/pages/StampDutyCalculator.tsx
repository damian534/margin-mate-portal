import { useState, useMemo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, DollarSign, Home, Landmark, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;

function parseCurrency(val: string): number {
  return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
}

// ─── State stamp duty rates (2024/25) ───

function calcVIC(price: number, fhb: boolean): { duty: number; concession: number } {
  let duty = 0;
  if (price <= 25000) duty = price * 0.014;
  else if (price <= 130000) duty = 350 + (price - 25000) * 0.024;
  else if (price <= 960000) duty = 2870 + (price - 130000) * 0.06;
  else if (price <= 2000000) duty = 2870 + (960000 - 130000) * 0.06 + (price - 960000) * 0.055;
  else duty = price * 0.065;

  let concession = 0;
  if (fhb) {
    if (price <= 600000) concession = duty; // full exemption
    else if (price <= 750000) concession = duty * ((750000 - price) / 150000); // sliding scale
  }
  return { duty, concession };
}

function calcNSW(price: number, fhb: boolean): { duty: number; concession: number } {
  let duty = 0;
  if (price <= 17000) duty = price * 0.0125;
  else if (price <= 36000) duty = 212 + (price - 17000) * 0.015;
  else if (price <= 97000) duty = 497 + (price - 36000) * 0.0175;
  else if (price <= 364000) duty = 1565 + (price - 97000) * 0.035;
  else if (price <= 1214000) duty = 10910 + (price - 364000) * 0.045;
  else if (price <= 3636000) duty = 49160 + (price - 1214000) * 0.055;
  else duty = 182380 + (price - 3636000) * 0.07;

  let concession = 0;
  if (fhb) {
    if (price <= 800000) concession = duty; // full exemption
    else if (price <= 1000000) concession = duty * ((1000000 - price) / 200000);
  }
  return { duty, concession };
}

function calcQLD(price: number, fhb: boolean): { duty: number; concession: number } {
  let duty = 0;
  if (price <= 5000) duty = 0;
  else if (price <= 75000) duty = (price - 5000) * 0.015;
  else if (price <= 540000) duty = 1050 + (price - 75000) * 0.035;
  else if (price <= 1000000) duty = 17325 + (price - 540000) * 0.045;
  else duty = 38025 + (price - 1000000) * 0.0575;

  let concession = 0;
  if (fhb) {
    if (price <= 500000) concession = 8750;
    else if (price <= 550000) concession = 8750 * ((550000 - price) / 50000);
    concession = Math.min(concession, duty);
  }
  return { duty, concession };
}

function calcSA(price: number, _fhb: boolean): { duty: number; concession: number } {
  let duty = 0;
  if (price <= 12000) duty = price * 0.01;
  else if (price <= 30000) duty = 120 + (price - 12000) * 0.02;
  else if (price <= 50000) duty = 480 + (price - 30000) * 0.03;
  else if (price <= 100000) duty = 1080 + (price - 50000) * 0.035;
  else if (price <= 200000) duty = 2830 + (price - 100000) * 0.04;
  else if (price <= 250000) duty = 6830 + (price - 200000) * 0.0425;
  else if (price <= 300000) duty = 8955 + (price - 250000) * 0.0475;
  else if (price <= 500000) duty = 11330 + (price - 300000) * 0.05;
  else duty = 21330 + (price - 500000) * 0.055;

  // SA no longer has FHB stamp duty concession (replaced by grant)
  return { duty, concession: 0 };
}

function calcWA(price: number, fhb: boolean): { duty: number; concession: number } {
  let duty = 0;
  if (price <= 120000) duty = price * 0.019;
  else if (price <= 150000) duty = 2280 + (price - 120000) * 0.0285;
  else if (price <= 360000) duty = 3135 + (price - 150000) * 0.038;
  else if (price <= 725000) duty = 11115 + (price - 360000) * 0.0475;
  else duty = 28453 + (price - 725000) * 0.0515;

  let concession = 0;
  if (fhb) {
    if (price <= 430000) concession = duty;
    else if (price <= 530000) concession = duty * ((530000 - price) / 100000);
  }
  return { duty, concession };
}

function calcTAS(price: number, fhb: boolean): { duty: number; concession: number } {
  let duty = 0;
  if (price <= 3000) duty = 50;
  else if (price <= 25000) duty = 50 + (price - 3000) * 0.0175;
  else if (price <= 75000) duty = 435 + (price - 25000) * 0.025;
  else if (price <= 200000) duty = 1685 + (price - 75000) * 0.035;
  else if (price <= 375000) duty = 6060 + (price - 200000) * 0.04;
  else if (price <= 725000) duty = 13060 + (price - 375000) * 0.0425;
  else duty = 27935 + (price - 725000) * 0.045;

  let concession = 0;
  if (fhb && price <= 600000) concession = duty * 0.5; // 50% discount
  return { duty, concession };
}

function calcACT(price: number, fhb: boolean): { duty: number; concession: number } {
  let duty = 0;
  if (price <= 260000) duty = price * 0.006 * ((260000 - price) / 260000 + 1);
  else if (price <= 300000) duty = price * 0.0235;
  else if (price <= 500000) duty = price * 0.04;
  else if (price <= 750000) duty = price * 0.05;
  else if (price <= 1000000) duty = price * 0.055;
  else if (price <= 1455000) duty = price * 0.06;
  else duty = price * 0.07;

  let concession = 0;
  if (fhb && price <= 1000000) concession = duty; // full exemption for eligible
  return { duty, concession };
}

function calcNT(price: number, _fhb: boolean): { duty: number; concession: number } {
  // NT simplified rates
  let duty = 0;
  if (price <= 525000) {
    const v = price / 1000;
    duty = (0.06571441 * v * v) + (15 * v);
  } else duty = price * 0.0495;
  return { duty, concession: 0 };
}

type StateKey = 'VIC' | 'NSW' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT';

const stateCalcs: Record<StateKey, (price: number, fhb: boolean) => { duty: number; concession: number }> = {
  VIC: calcVIC,
  NSW: calcNSW,
  QLD: calcQLD,
  SA: calcSA,
  WA: calcWA,
  TAS: calcTAS,
  ACT: calcACT,
  NT: calcNT,
};

const stateLabels: Record<StateKey, string> = {
  VIC: 'Victoria',
  NSW: 'New South Wales',
  QLD: 'Queensland',
  SA: 'South Australia',
  WA: 'Western Australia',
  TAS: 'Tasmania',
  ACT: 'Australian Capital Territory',
  NT: 'Northern Territory',
};

const fhbNotes: Record<StateKey, string> = {
  VIC: 'Full exemption ≤$600k, sliding scale $600k–$750k',
  NSW: 'Full exemption ≤$800k, sliding scale $800k–$1M',
  QLD: 'Up to $8,750 concession for properties ≤$550k',
  SA: 'SA offers a $15k First Home Owner Grant instead of stamp duty concession',
  WA: 'Full exemption ≤$430k, sliding scale $430k–$530k',
  TAS: '50% discount on properties ≤$600k',
  ACT: 'Full exemption for properties ≤$1M',
  NT: 'NT does not offer a specific FHB stamp duty concession',
};

export default function StampDutyCalculator() {
  const navigate = useNavigate();
  const [purchasePrice, setPurchasePrice] = useState('750,000');
  const [state, setState] = useState<StateKey>('VIC');
  const [isFirstHomeBuyer, setIsFirstHomeBuyer] = useState(false);

  const results = useMemo(() => {
    const price = parseCurrency(purchasePrice);
    if (!price) return null;

    const { duty, concession } = stateCalcs[state](price, isFirstHomeBuyer);
    const netDuty = Math.max(0, duty - concession);
    const dutyPercent = (netDuty / price) * 100;

    // Compare across states for chart
    const comparison = (Object.keys(stateCalcs) as StateKey[]).map(s => {
      const r = stateCalcs[s](price, isFirstHomeBuyer);
      return {
        state: s,
        duty: Math.max(0, Math.round(r.duty - r.concession)),
        isCurrent: s === state,
      };
    });

    return { duty, concession, netDuty, dutyPercent, price, comparison };
  }, [purchasePrice, state, isFirstHomeBuyer]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setPurchasePrice(raw ? parseFloat(raw).toLocaleString() : '');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Stamp Duty Calculator</h1>
          <p className="text-muted-foreground text-sm">Estimate stamp duty (land transfer duty) across Australian states</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Inputs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" /> Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Purchase Price ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    className="pl-7"
                    placeholder="750,000"
                    value={purchasePrice}
                    onChange={handleCurrencyChange}
                  />
                </div>
              </div>
              <div>
                <Label>State / Territory</Label>
                <Select value={state} onValueChange={(v) => setState(v as StateKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(stateLabels) as StateKey[]).map(s => (
                      <SelectItem key={s} value={s}>{stateLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="block">First Home Buyer</Label>
                  <p className="text-xs text-muted-foreground">Apply concessions if eligible</p>
                </div>
                <Switch checked={isFirstHomeBuyer} onCheckedChange={setIsFirstHomeBuyer} />
              </div>
              {isFirstHomeBuyer && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{fhbNotes[state]}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {results && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-primary" /> Stamp Duty Estimate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Stamp Duty Payable</p>
                  <p className="text-3xl font-bold text-primary">{fmt(results.netDuty)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {results.dutyPercent.toFixed(2)}% of purchase price
                  </p>
                </div>

                {isFirstHomeBuyer && results.concession > 0 && (
                  <div className="bg-accent/50 border border-accent rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground uppercase mb-0.5">FHB Concession Saved</p>
                    <p className="text-lg font-bold text-primary">{fmt(results.concession)}</p>
                  </div>
                )}

                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purchase Price</span>
                    <span className="font-semibold">{fmt(results.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Duty</span>
                    <span className="font-semibold">{fmt(results.duty)}</span>
                  </div>
                  {results.concession > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Concession</span>
                      <span className="font-semibold text-primary">-{fmt(results.concession)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Upfront Costs</span>
                    <span>{fmt(results.netDuty + results.price)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* State Comparison Chart */}
        {results && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">State Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.comparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="category" dataKey="state" stroke="hsl(var(--muted-foreground))" fontSize={12} width={40} />
                    <Tooltip formatter={(value: number) => [fmt(value), 'Stamp Duty']} />
                    <Bar dataKey="duty" radius={[0, 4, 4, 0]}>
                      {results.comparison.map((entry) => (
                        <Cell key={entry.state} fill={entry.isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {isFirstHomeBuyer ? 'Includes first home buyer concessions where applicable' : 'Standard rates shown — toggle First Home Buyer for concessions'}
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Important Note:</strong> This calculator provides estimates only based on published state/territory rates. Actual duty may vary based on property type, concessions, off-the-plan discounts, and other factors. Seek professional advice before making financial decisions.
        </p>
      </main>
    </div>
  );
}
