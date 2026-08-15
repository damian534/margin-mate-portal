import { useState, useMemo, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Home, ShoppingCart, DollarSign, Percent, Info, Save, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { StateKey, stateCalcs, stateLabels, fhbNotes } from '@/lib/stampDutyRates';

const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
function parseCurrency(val: string): number { return parseFloat(val.replace(/[^0-9.]/g, '')) || 0; }
function formatInput(value: string): string { const num = parseCurrency(value); if (!num) return value.replace(/[^0-9.]/g, ''); return num.toLocaleString(); }

function CurrencyInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string }) {
  const displayValue = value ? formatInput(value) : '';
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
        <Input type="text" inputMode="numeric" className="pl-7" placeholder={placeholder} value={displayValue} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))} />
      </div>
    </div>
  );
}

function calcRepayment(principal: number, annualRate: number, years: number): number {
  const mr = annualRate / 100 / 12;
  const n = years * 12;
  if (mr === 0) return principal / n;
  return (principal * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
}

export default function SellUpgradeSimulator() {
  const navigate = useNavigate();
  const { user, isPreviewMode } = useAuth();
  const [saving, setSaving] = useState(false);

  // Selling inputs
  const [currentHomeValue, setCurrentHomeValue] = useState('');
  const [mortgageOwing, setMortgageOwing] = useState('');
  const [sellingCostPct, setSellingCostPct] = useState(3.0);

  // Buying inputs
  const [targetPurchasePrice, setTargetPurchasePrice] = useState('');
  const [buyingState, setBuyingState] = useState<StateKey>('VIC');
  const [isFirstHomeBuyer, setIsFirstHomeBuyer] = useState(false);
  const [otherBuyingCosts, setOtherBuyingCosts] = useState('5000');
  const [savings, setSavings] = useState('');

  // Loan inputs
  const [interestRate, setInterestRate] = useState('6.0');
  const loanTerm = 30;

  // Target LVR planner
  const [useTargetLvr, setUseTargetLvr] = useState(false);
  const [targetLvr, setTargetLvr] = useState(80);
  const [targetLvrInput, setTargetLvrInput] = useState('80');

  const outputs = useMemo(() => {
    const chv = parseCurrency(currentHomeValue);
    const mo = parseCurrency(mortgageOwing);
    const tp = parseCurrency(targetPurchasePrice);
    if (!chv || !tp) return null;

    const sellingCosts = chv * (sellingCostPct / 100);
    const netSaleProceeds = chv - mo - sellingCosts;

    const { duty: stampDutyGross, concession: stampDutyConcession } = stateCalcs[buyingState](tp, isFirstHomeBuyer);
    const stampDuty = Math.max(0, stampDutyGross - stampDutyConcession);
    const otherCosts = parseCurrency(otherBuyingCosts);
    const totalBuyingCosts = stampDuty + otherCosts;
    const totalPurchaseCost = tp + totalBuyingCosts;

    const sav = parseCurrency(savings);
    const totalFundsAvailable = Math.max(0, netSaleProceeds) + sav;

    const loanRequired = Math.max(0, totalPurchaseCost - totalFundsAvailable);
    const lvr = tp > 0 ? (loanRequired / tp) * 100 : 0;
    const lmiApplies = lvr > 80;

    const rate = parseFloat(interestRate) || 0;
    const monthlyRepayment = loanRequired > 0 ? calcRepayment(loanRequired, rate, loanTerm) : 0;
    const fortnightlyRepayment = (monthlyRepayment * 12) / 26;
    const weeklyRepayment = (monthlyRepayment * 12) / 52;
    const totalRepaid = monthlyRepayment * loanTerm * 12;
    const totalInterest = totalRepaid - loanRequired;

    // --- Target LVR planning (measured against sale proceeds only, savings are the output) ---
    const targetLoan = tp * (targetLvr / 100);
    const fundsNeededForTarget = Math.max(0, totalPurchaseCost - targetLoan);
    const proceedsAvailable = Math.max(0, netSaleProceeds);
    const extraSavingsRequired = Math.max(0, fundsNeededForTarget - proceedsAvailable);
    const surplusFunds = Math.max(0, proceedsAvailable - fundsNeededForTarget);
    const targetMonthlyRepayment = targetLoan > 0 ? calcRepayment(targetLoan, rate, loanTerm) : 0;

    return {
      sellingCosts, netSaleProceeds,
      stampDutyGross, stampDutyConcession, stampDuty,
      otherCosts, totalBuyingCosts, totalPurchaseCost,
      totalFundsAvailable, loanRequired, lvr, lmiApplies, sav,
      monthlyRepayment, fortnightlyRepayment, weeklyRepayment, totalRepaid, totalInterest,
      targetLoan, fundsNeededForTarget, extraSavingsRequired, surplusFunds, targetMonthlyRepayment,
    };
  }, [currentHomeValue, mortgageOwing, sellingCostPct, targetPurchasePrice, buyingState, isFirstHomeBuyer, otherBuyingCosts, savings, interestRate, targetLvr]);

  // When a target LVR is set, the shortfall becomes the additional savings needed
  useEffect(() => {
    if (!useTargetLvr || !outputs) return;
    const required = Math.round(outputs.extraSavingsRequired);
    if (Math.abs(parseCurrency(savings) - required) > 1) {
      setSavings(required ? required.toLocaleString('en-AU') : '0');
    }
  }, [useTargetLvr, outputs?.extraSavingsRequired]);

  const handleSaveScenario = async () => {
    if (!outputs || !user || isPreviewMode) {
      toast.info('Log in to save scenarios');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('tool_scenarios').insert({
      user_id: user.id,
      tool_name: 'sell_upgrade_simulator',
      inputs: {
        currentHomeValue: parseCurrency(currentHomeValue),
        mortgageOwing: parseCurrency(mortgageOwing),
        sellingCostPct,
        targetPurchasePrice: parseCurrency(targetPurchasePrice),
        buyingState, isFirstHomeBuyer,
        otherBuyingCosts: parseCurrency(otherBuyingCosts),
        savings: parseCurrency(savings),
        interestRate: parseFloat(interestRate) || 0,
        loanTerm,
      } as any,
      outputs: outputs as any,
    });
    setSaving(false);
    if (error) toast.error('Failed to save scenario');
    else toast.success('Scenario saved');
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
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Sell &amp; Buy Calculator</h1>
            <p className="text-muted-foreground text-sm">Work out the loan you'll need when you sell your current home and buy the next one.</p>
          </div>
          {outputs && (
            <Button variant="outline" size="sm" className="shrink-0" onClick={handleSaveScenario} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : 'Save scenario'}
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        {outputs && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-muted/30"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase mb-1">Net Sale Proceeds</p><p className={`text-xl font-bold ${outputs.netSaleProceeds >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(outputs.netSaleProceeds)}</p></CardContent></Card>
            <Card className="bg-muted/30"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase mb-1">Loan Required</p><p className="text-xl font-bold">{fmt(outputs.loanRequired)}</p></CardContent></Card>
            <Card className={outputs.lvr > 80 ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase mb-1">LVR</p><p className={`text-xl font-bold ${outputs.lvr > 80 ? 'text-destructive' : 'text-success'}`}>{fmtPct(outputs.lvr)}</p></CardContent></Card>
            <Card className="bg-muted/30"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground uppercase mb-1">Monthly Repayment</p><p className="text-xl font-bold">{fmt(outputs.monthlyRepayment)}</p></CardContent></Card>
          </div>
        )}

        {outputs && outputs.lmiApplies && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-sm">
            <strong>LMI may apply.</strong> The LVR is above 80%, which means Lenders Mortgage Insurance will likely be required. This can add thousands to the costs.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Selling */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Home className="w-4 h-4 text-primary" /> Current Property</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CurrencyInput label="Estimated Sale Price" placeholder="e.g. 850,000" value={currentHomeValue} onChange={setCurrentHomeValue} />
              <CurrencyInput label="Mortgage Owing" placeholder="e.g. 400,000" value={mortgageOwing} onChange={setMortgageOwing} />
              <div>
                <div className="flex justify-between mb-1"><Label>Agent &amp; Selling Costs</Label><span className="text-sm font-semibold text-primary">{fmtPct(sellingCostPct)}</span></div>
                <Slider value={[sellingCostPct]} onValueChange={([v]) => setSellingCostPct(v)} min={1} max={5} step={0.1} />
              </div>
            </CardContent>
          </Card>

          {/* Buying */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-primary" /> Next Property</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CurrencyInput label="Purchase Price" placeholder="e.g. 1,200,000" value={targetPurchasePrice} onChange={setTargetPurchasePrice} />
              <div>
                <Label>Purchasing State</Label>
                <Select value={buyingState} onValueChange={(v) => setBuyingState(v as StateKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(stateLabels) as StateKey[]).map((s) => (<SelectItem key={s} value={s}>{stateLabels[s]}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div><Label className="block">First Home Buyer</Label><p className="text-xs text-muted-foreground">Apply concessions if eligible</p></div>
                <Switch checked={isFirstHomeBuyer} onCheckedChange={setIsFirstHomeBuyer} />
              </div>
              {isFirstHomeBuyer && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex gap-2"><Info className="w-4 h-4 text-primary shrink-0 mt-0.5" /><p className="text-xs text-muted-foreground">{fhbNotes[buyingState]}</p></div>
              )}
              <CurrencyInput label="Other Buying Costs (conveyancing, inspections)" placeholder="e.g. 5,000" value={otherBuyingCosts} onChange={setOtherBuyingCosts} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Additional Savings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CurrencyInput label="Cash savings to put towards the purchase" placeholder="e.g. 50,000" value={savings} onChange={setSavings} />
              {useTargetLvr && (
                <p className="text-xs text-muted-foreground -mt-2">Auto-calculated from your target LVR below. Turn the target off to enter your own figure.</p>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /><Label className="cursor-pointer">Target LVR</Label></div>
                <Switch checked={useTargetLvr} onCheckedChange={setUseTargetLvr} />
              </div>
              {useTargetLvr && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-28">
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
                  <p className="text-xs text-muted-foreground">80% or below avoids Lenders Mortgage Insurance.</p>
                  {outputs && (
                    outputs.extraSavingsRequired > 0 ? (
                      <div className="rounded-lg p-3 bg-warning/10 ring-1 ring-warning/30">
                        <p className="text-xs text-muted-foreground uppercase">Shortfall — savings required</p>
                        <p className="text-lg font-bold text-warning">{fmt(outputs.extraSavingsRequired)}</p>
                      </div>
                    ) : (
                      <div className="rounded-lg p-3 bg-success/10 ring-1 ring-success/30">
                        <p className="text-xs text-muted-foreground uppercase">Surplus after settlement</p>
                        <p className="text-lg font-bold text-success">{fmt(outputs.surplusFunds)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Sale proceeds already cover a {fmtPct(targetLvr)} LVR loan.</p>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Percent className="w-4 h-4 text-primary" /> Interest Rate</CardTitle></CardHeader>
            <CardContent>
              <div>
                <Label>Rate (% p.a.)</Label>
                <Input type="number" step="0.1" min="1" max="15" className="max-w-[120px]" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Repayments based on 30-year P&amp;I loan</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown */}
        {outputs && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Target LVR Planner</CardTitle>
                <Switch checked={useTargetLvr} onCheckedChange={setUseTargetLvr} />
              </div>
            </CardHeader>
            {useTargetLvr && (
              <CardContent className="space-y-4">
              <div>
                  <div className="flex justify-between mb-1"><Label>Target LVR on the new loan</Label><span className="text-sm font-semibold text-primary">{fmtPct(targetLvr)}</span></div>
                  <div className="flex items-center gap-3">
                    <Slider className="flex-1" value={[targetLvr]} onValueChange={([v]) => setTargetLvr(v)} min={50} max={95} step={1} />
                    <div className="relative w-24">
                      <Input
                        type="number"
                        min={50}
                        max={95}
                        step={1}
                        value={Math.round(targetLvr)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setTargetLvr(Math.min(95, Math.max(50, val)));
                        }}
                        className="pr-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">80% or below avoids Lenders Mortgage Insurance.</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground uppercase">Loan at {fmtPct(targetLvr)}</p><p className="text-lg font-bold">{fmt(outputs.targetLoan)}</p></div>
                  <div className="text-center p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground uppercase">Funds Needed</p><p className="text-lg font-bold">{fmt(outputs.fundsNeededForTarget)}</p></div>
                  <div className={`text-center p-3 rounded-lg col-span-2 lg:col-span-1 ${outputs.extraSavingsRequired > 0 ? 'bg-warning/10 ring-1 ring-warning/30' : 'bg-success/10 ring-1 ring-success/30'}`}>
                    <p className="text-xs text-muted-foreground uppercase">{outputs.extraSavingsRequired > 0 ? 'Extra Savings Required' : 'Surplus Funds'}</p>
                    <p className={`text-lg font-bold ${outputs.extraSavingsRequired > 0 ? 'text-warning' : 'text-success'}`}>{fmt(outputs.extraSavingsRequired > 0 ? outputs.extraSavingsRequired : outputs.surplusFunds)}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total Purchase Cost</span><span className="font-semibold">{fmt(outputs.totalPurchaseCost)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Less Loan at {fmtPct(targetLvr)} LVR</span><span className="font-semibold">-{fmt(outputs.targetLoan)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Less Funds Available (proceeds + savings)</span><span className="font-semibold">-{fmt(outputs.totalFundsAvailable)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold"><span>{outputs.extraSavingsRequired > 0 ? 'Additional Savings Required' : 'Funds Left Over'}</span><span className={outputs.extraSavingsRequired > 0 ? 'text-warning' : 'text-success'}>{fmt(outputs.extraSavingsRequired > 0 ? outputs.extraSavingsRequired : outputs.surplusFunds)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Monthly Repayment at target</span><span className="font-semibold">{fmt(outputs.targetMonthlyRepayment)}</span></div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Breakdown */}
        {outputs && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Transaction Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Selling</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Sale Price</span><span className="font-semibold">{fmt(parseCurrency(currentHomeValue))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Less Mortgage</span><span className="font-semibold">-{fmt(parseCurrency(mortgageOwing))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Less Selling Costs ({fmtPct(sellingCostPct)})</span><span className="font-semibold">-{fmt(outputs.sellingCosts)}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>Net Sale Proceeds</span><span className={outputs.netSaleProceeds >= 0 ? 'text-success' : 'text-destructive'}>{fmt(outputs.netSaleProceeds)}</span></div>

                <div className="pt-4" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Buying in {stateLabels[buyingState]}</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Purchase Price</span><span className="font-semibold">{fmt(parseCurrency(targetPurchasePrice))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Stamp Duty ({stateLabels[buyingState]})</span><span className="font-semibold">{fmt(outputs.stampDuty)}</span></div>
                {isFirstHomeBuyer && outputs.stampDutyConcession > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">FHB Concession Applied</span><span className="font-semibold text-success">-{fmt(outputs.stampDutyConcession)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Other Costs</span><span className="font-semibold">{fmt(outputs.otherCosts)}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>Total Purchase Cost</span><span>{fmt(outputs.totalPurchaseCost)}</span></div>

                <div className="pt-4" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Funding</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Net Sale Proceeds</span><span className="font-semibold">{fmt(outputs.netSaleProceeds)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Additional Savings</span><span className="font-semibold">{fmt(outputs.sav)}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>Total Funds Available</span><span className="text-success">{fmt(outputs.totalFundsAvailable)}</span></div>
                <div className="flex justify-between font-bold text-lg pt-2"><span>Loan Required</span><span>{fmt(outputs.loanRequired)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Loan-to-Value Ratio (LVR)</span><span className={`font-bold ${outputs.lvr > 80 ? 'text-destructive' : 'text-success'}`}>{fmtPct(outputs.lvr)}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Repayments */}
        {outputs && outputs.loanRequired > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Estimated Repayments on {fmt(outputs.loanRequired)} loan</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg bg-primary/10 ring-2 ring-primary">
                  <p className="text-xs text-muted-foreground uppercase">Monthly</p>
                  <p className="text-lg font-bold">{fmt(outputs.monthlyRepayment)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground uppercase">Fortnightly</p>
                  <p className="text-lg font-bold">{fmt(outputs.fortnightlyRepayment)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground uppercase">Weekly</p>
                  <p className="text-lg font-bold">{fmt(outputs.weeklyRepayment)}</p>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Loan Amount</span><span className="font-semibold">{fmt(outputs.loanRequired)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Interest Rate</span><span className="font-semibold">{fmtPct(parseFloat(interestRate) || 0)} p.a.</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Loan Term</span><span className="font-semibold">{loanTerm} years</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Repaid</span><span className="font-semibold">{fmt(outputs.totalRepaid)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Interest</span><span className="font-semibold">{fmt(outputs.totalInterest)}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed"><strong>Important Note:</strong> This tool provides general estimates only. It does not constitute financial advice. Stamp duty is calculated on published state rates and may not reflect all exemptions or surcharges.</p>
      </main>
    </div>
  );
}
