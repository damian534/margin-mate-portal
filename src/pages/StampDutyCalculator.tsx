import { useState, useMemo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Home, Landmark, Info, Target, Download } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { StateKey, stateCalcs, stateLabels, fhbNotes } from '@/lib/stampDutyRates';
import { calculateGovFees } from '@/lib/govFees';
import { generateStampDutyPdf } from '@/lib/pdf/calculatorPdf';
import { toast } from 'sonner';

const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;

function parseCurrency(val: string): number {
  return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
}

export default function StampDutyCalculator() {
  const navigate = useNavigate();
  const [purchasePrice, setPurchasePrice] = useState('750,000');
  const [state, setState] = useState<StateKey>('VIC');
  const [isFirstHomeBuyer, setIsFirstHomeBuyer] = useState(false);
  const [hasMortgage, setHasMortgage] = useState(true);
  const [useTargetLvr, setUseTargetLvr] = useState(false);
  const [targetLvr, setTargetLvr] = useState(80);
  const [targetLvrInput, setTargetLvrInput] = useState('80');
  const [currentSavings, setCurrentSavings] = useState('');

  const results = useMemo(() => {
    const price = parseCurrency(purchasePrice);
    if (!price) return null;

    const { duty, concession } = stateCalcs[state](price, isFirstHomeBuyer);
    const netDuty = Math.max(0, duty - concession);
    const dutyPercent = (netDuty / price) * 100;
    const fees = calculateGovFees(price, state, hasMortgage);
    const totalGovCharges = netDuty + fees.total;

    // Compare across states for chart
    const comparison = (Object.keys(stateCalcs) as StateKey[]).map(s => {
      const r = stateCalcs[s](price, isFirstHomeBuyer);
      const f = calculateGovFees(price, s, hasMortgage);
      return {
        state: s,
        duty: Math.max(0, Math.round(r.duty - r.concession)) + Math.round(f.total),
        isCurrent: s === state,
      };
    });

    // Target LVR planning
    const targetLoan = price * (targetLvr / 100);
    const depositRequired = Math.max(0, price - targetLoan);
    const cashRequired = depositRequired + totalGovCharges;
    const savings = parseCurrency(currentSavings);
    const extraSavingsRequired = Math.max(0, cashRequired - savings);
    const surplusFunds = Math.max(0, savings - cashRequired);

    return { duty, concession, netDuty, dutyPercent, price, comparison, fees, totalGovCharges, targetLoan, depositRequired, cashRequired, savings, extraSavingsRequired, surplusFunds };
  }, [purchasePrice, state, isFirstHomeBuyer, hasMortgage, targetLvr, currentSavings]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setPurchasePrice(raw ? parseFloat(raw).toLocaleString() : '');
  };

  const handleDownloadPdf = async () => {
    if (!results) return;
    try {
      await generateStampDutyPdf({
        inputs: {
          purchasePrice: results.price,
          stateLabel: stateLabels[state],
          isFirstHomeBuyer,
          hasMortgage,
          useTargetLvr,
          targetLvr,
          savings: results.savings,
        },
        results,
        stateLabels,
      });
    } catch {
      toast.error('Could not generate the PDF');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Stamp Duty Calculator</h1>
            <p className="text-muted-foreground text-sm">Estimate stamp duty plus title transfer and mortgage registration fees across Australia</p>
          </div>
          {results && (
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-1" /> Download PDF
            </Button>
          )}
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
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="block">Buying with a loan</Label>
                  <p className="text-xs text-muted-foreground">Adds the mortgage registration fee</p>
                </div>
                <Switch checked={hasMortgage} onCheckedChange={setHasMortgage} />
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {results && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-primary" /> Government Charges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Total Government Charges</p>
                  <p className="text-3xl font-bold text-primary">{fmt(results.totalGovCharges)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stamp duty {fmt(results.netDuty)} ({results.dutyPercent.toFixed(2)}% of price) + fees
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
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stamp Duty Payable</span>
                    <span className="font-semibold">{fmt(results.netDuty)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Title Transfer Fee (est.)</span>
                    <span className="font-semibold">{fmt(results.fees.transferFee)}</span>
                  </div>
                  {hasMortgage && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mortgage Registration Fee (est.)</span>
                      <span className="font-semibold">{fmt(results.fees.mortgageRegistrationFee)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Government Charges</span>
                    <span>{fmt(results.totalGovCharges)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Price + Government Charges</span>
                    <span>{fmt(results.price + results.totalGovCharges)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Titles office fees are estimates based on the 2025-26 fee schedules and are indexed each 1 July. They exclude conveyancing, building and pest, and lender fees.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* State Comparison Chart */}
        {results && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Target LVR &amp; Deposit Planner</CardTitle>
                <Switch checked={useTargetLvr} onCheckedChange={setUseTargetLvr} />
              </div>
            </CardHeader>
            {useTargetLvr && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between mb-1"><Label>Target LVR on the loan</Label><span className="text-sm font-semibold text-primary">{targetLvr.toFixed(0)}%</span></div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-24">
                        <Input
                          type="number"
                          min={10}
                          max={100}
                          step={1}
                          value={targetLvrInput}
                          onChange={(e) => {
                            setTargetLvrInput(e.target.value);
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0 && val <= 100) setTargetLvr(val);
                          }}
                          onBlur={() => setTargetLvrInput(String(targetLvr))}
                          className="pr-7"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                      <Slider className="flex-1" value={[targetLvr]} onValueChange={([v]) => { setTargetLvr(v); setTargetLvrInput(String(v)); }} min={50} max={95} step={1} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">80% or below avoids Lenders Mortgage Insurance.</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Savings Available</Label>
                      <button type="button" className="text-xs text-primary underline" onClick={() => setCurrentSavings(Math.round(results.cashRequired).toLocaleString())}>Use amount needed</button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input className="pl-7" placeholder="e.g. 150,000" value={currentSavings}
                        onChange={(e) => { const raw = e.target.value.replace(/[^0-9.]/g, ''); setCurrentSavings(raw ? parseFloat(raw).toLocaleString() : ''); }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{results.extraSavingsRequired > 0 ? `Shortfall of ${fmt(results.extraSavingsRequired)} to hit ${targetLvr.toFixed(0)}% LVR.` : `Surplus of ${fmt(results.surplusFunds)} at ${targetLvr.toFixed(0)}% LVR.`}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground uppercase">Loan at {targetLvr.toFixed(0)}%</p><p className="text-lg font-bold">{fmt(results.targetLoan)}</p></div>
                  <div className="text-center p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground uppercase">Deposit Required</p><p className="text-lg font-bold">{fmt(results.depositRequired)}</p></div>
                  <div className="text-center p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground uppercase">Deposit + Gov Charges</p><p className="text-lg font-bold">{fmt(results.cashRequired)}</p></div>
                  <div className={`text-center p-3 rounded-lg ${results.extraSavingsRequired > 0 ? 'bg-warning/10 ring-1 ring-warning/30' : 'bg-success/10 ring-1 ring-success/30'}`}>
                    <p className="text-xs text-muted-foreground uppercase">{results.extraSavingsRequired > 0 ? 'Extra Savings Required' : 'Surplus Funds'}</p>
                    <p className={`text-lg font-bold ${results.extraSavingsRequired > 0 ? 'text-warning' : 'text-success'}`}>{fmt(results.extraSavingsRequired > 0 ? results.extraSavingsRequired : results.surplusFunds)}</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* State Comparison Chart */}
        {results && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">State Comparison (duty + fees)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.comparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="category" dataKey="state" stroke="hsl(var(--muted-foreground))" fontSize={12} width={40} />
                    <Tooltip formatter={(value: number) => [fmt(value), 'Government charges']} />
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
