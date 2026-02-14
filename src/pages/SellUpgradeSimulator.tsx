import { useState, useMemo, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { runSimulator, SimulatorInputs, SimulatorOutputs } from '@/lib/simulator-calculations';
import { ArrowLeft, Download, Mail, Save, TrendingUp, DollarSign, Home, PiggyBank, Send, MinusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;

// Calculate loan repayment per period
function calcRepayment(principal: number, annualRate: number, years: number, frequency: 'monthly' | 'fortnightly' | 'weekly'): number {
  if (principal <= 0 || annualRate <= 0) return 0;
  const periodsPerYear = frequency === 'weekly' ? 52 : frequency === 'fortnightly' ? 26 : 12;
  const totalPeriods = years * periodsPerYear;
  const periodRate = annualRate / 100 / periodsPerYear;
  return (principal * periodRate * Math.pow(1 + periodRate, totalPeriods)) / (Math.pow(1 + periodRate, totalPeriods) - 1);
}

// Currency input formatting helpers
function formatCurrency(value: string): string {
  const num = value.replace(/[^0-9]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString();
}

function parseCurrency(formatted: string): string {
  return formatted.replace(/[^0-9]/g, '');
}

function CurrencyInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const displayValue = value ? formatCurrency(value) : '';
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
        <Input
          type="text"
          inputMode="numeric"
          className="pl-7"
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => onChange(parseCurrency(e.target.value))}
        />
      </div>
    </div>
  );
}

export default function SellUpgradeSimulator() {
  const { user, isPreviewMode } = useAuth();
  const navigate = useNavigate();

  // Inputs
  const [currentHomeValue, setCurrentHomeValue] = useState<string>('');
  const [mortgageOwing, setMortgageOwing] = useState<string>('');
  const [sellingCostPercent, setSellingCostPercent] = useState<string>('3.0');
  const [targetPurchasePrice, setTargetPurchasePrice] = useState<string>('');
  const [growthPreset, setGrowthPreset] = useState<number>(5);
  const [monthsToWait, setMonthsToWait] = useState<number>(6);
  const [savings, setSavings] = useState<string>('');
  const [homeValueAdjustment, setHomeValueAdjustment] = useState<number>(0);
  const [repaymentRate, setRepaymentRate] = useState<string>('6.0');
  const [saving, setSaving] = useState(false);

  const buyingCostPercent = 6; // flat 6% covers stamp duty, conveyancing, legals etc.
  const resultsRef = useRef<HTMLDivElement>(null);

  const chvNum = parseFloat(currentHomeValue) || 0;

  const inputs: SimulatorInputs | null = useMemo(() => {
    const chv = parseFloat(currentHomeValue);
    const mo = parseFloat(mortgageOwing);
    const tp = parseFloat(targetPurchasePrice);
    const sc = parseFloat(sellingCostPercent);
    if (!chv || isNaN(mo) || !tp || !sc) return null;
    return {
      currentHomeValue: chv,
      mortgageOwing: mo,
      sellingCostPercent: sc,
      targetPurchasePrice: tp,
      annualGrowthPercent: growthPreset,
      monthsToWait,
      buyingCostPercent,
      savings: parseFloat(savings) || 0,
      homeValueAdjustment,
    };
  }, [currentHomeValue, mortgageOwing, sellingCostPercent, targetPurchasePrice, growthPreset, monthsToWait, savings, homeValueAdjustment]);

  const outputs: SimulatorOutputs | null = useMemo(() => {
    if (!inputs) return null;
    return runSimulator(inputs);
  }, [inputs]);

  const handleSaveScenario = async () => {
    if (!inputs || !outputs || !user || isPreviewMode) {
      toast.info('Log in to save scenarios');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('tool_scenarios').insert({
      user_id: user.id,
      tool_name: 'sell_upgrade_simulator',
      inputs: inputs as any,
      outputs: outputs as any,
    });
    setSaving(false);
    if (error) {
      toast.error('Failed to save scenario');
    } else {
      toast.success('Scenario saved');
    }
  };

  const handleDownloadPDF = () => {
    if (!inputs || !outputs) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to download PDF');
      return;
    }
    printWindow.document.write(`
      <html>
      <head>
        <title>Sell & Upgrade Simulator - Margin Connect</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          h2 { font-size: 16px; color: #666; font-weight: normal; margin-bottom: 24px; }
          .brand { color: #c0392b; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
          th { background: #f9f9f9; font-weight: 600; }
          .highlight { background: #fff3f0; font-weight: 700; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
          .summary-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; }
          .summary-card .label { font-size: 12px; color: #888; text-transform: uppercase; }
          .summary-card .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
          .disclaimer { font-size: 11px; color: #999; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; line-height: 1.5; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1 class="brand">Margin Connect Tools</h1>
        <h2>Sell & Upgrade Timeline Simulator</h2>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Usable Equity (Now)</div>
            <div class="value">${fmt(outputs.usableEquity)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Loan Required (Now)</div>
            <div class="value">${fmt(outputs.loanRequiredNow)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Loan Required (${monthsToWait}mo)</div>
            <div class="value">${fmt(outputs.futureLoanRequired)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Extra Loan from Waiting</div>
            <div class="value" style="color: ${outputs.extraLoanFromWaiting > 0 ? '#c0392b' : '#27ae60'}">${fmt(outputs.extraLoanFromWaiting)}</div>
          </div>
        </div>

        <h3>Inputs</h3>
        <table>
          <tr><td>Current Home Value</td><td>${fmt(inputs.currentHomeValue)}</td></tr>
          ${inputs.homeValueAdjustment !== 0 ? `<tr><td>Sale Price Adjustment</td><td>${fmt(inputs.homeValueAdjustment)}</td></tr>` : ''}
          <tr><td>Mortgage Owing</td><td>${fmt(inputs.mortgageOwing)}</td></tr>
          <tr><td>Selling Cost</td><td>${inputs.sellingCostPercent}%</td></tr>
          <tr><td>Target Purchase Price</td><td>${fmt(inputs.targetPurchasePrice)}</td></tr>
          <tr><td>Buying Costs</td><td>${inputs.buyingCostPercent}%</td></tr>
          ${inputs.savings > 0 ? `<tr><td>Savings</td><td>${fmt(inputs.savings)}</td></tr>` : ''}
          <tr><td>Growth Assumption</td><td>${inputs.annualGrowthPercent}% p.a.</td></tr>
          <tr><td>Wait Period</td><td>${inputs.monthsToWait} months</td></tr>
        </table>

        <h3>Comparison: Sell Now vs Wait ${monthsToWait} Months</h3>
        <table>
          <tr><th></th><th>Sell Now</th><th>Wait ${monthsToWait} months</th></tr>
          <tr><td>Sell Home Value</td><td>${fmt(outputs.adjustedHomeValue)}</td><td>${fmt(outputs.futureHomeValue)}</td></tr>
          <tr><td>Selling Costs</td><td>${fmt(outputs.sellingCosts)}</td><td>${fmt(outputs.futureSellingCosts)}</td></tr>
          <tr><td>Mortgage Owing</td><td>${fmt(inputs.mortgageOwing)}</td><td>${fmt(inputs.mortgageOwing)}</td></tr>
          <tr><td>Usable Equity</td><td>${fmt(outputs.usableEquity)}</td><td>${fmt(outputs.futureUsableEquity)}</td></tr>
          <tr><td>Target Buy Price</td><td>${fmt(inputs.targetPurchasePrice)}</td><td>${fmt(outputs.futureTargetPrice)}</td></tr>
          <tr><td>Buying Costs (${inputs.buyingCostPercent}%)</td><td>${fmt(outputs.purchaseCostsNow)}</td><td>${fmt(outputs.futurePurchaseCosts)}</td></tr>
          ${inputs.savings > 0 ? `<tr><td>Client Savings</td><td colspan="2">${fmt(inputs.savings)}</td></tr>` : ''}
          <tr><td>Total Funds Needed</td><td>${fmt(outputs.totalFundsNeededNow)}</td><td>${fmt(outputs.futureTotalFundsNeeded)}</td></tr>
          <tr class="highlight"><td>Loan Required</td><td>${fmt(outputs.loanRequiredNow)}</td><td>${fmt(outputs.futureLoanRequired)}</td></tr>
        </table>

        <div class="disclaimer">
          <strong>Important Note:</strong> This tool provides general information and estimates only. It does not constitute financial advice and does not consider your personal circumstances. Figures shown are indicative and may change based on lender assessment, market movements, and actual costs (including stamp duty and selling costs). Seek professional advice before making decisions.
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleEmailSummary = async () => {
    if (!inputs || !outputs || !user) {
      toast.info('Log in to email summaries');
      return;
    }
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: user.email,
          subject: 'Sell & Upgrade Simulator Summary - Margin Connect',
          html: `
            <h2>Sell & Upgrade Timeline Simulator</h2>
            <p><strong>Usable Equity (Now):</strong> ${fmt(outputs.usableEquity)}</p>
            <p><strong>Loan Required (Now):</strong> ${fmt(outputs.loanRequiredNow)}</p>
            <p><strong>Loan Required (${monthsToWait}mo):</strong> ${fmt(outputs.futureLoanRequired)}</p>
            <p><strong>Extra Loan from Waiting:</strong> ${fmt(outputs.extraLoanFromWaiting)}</p>
            ${inputs.savings > 0 ? `<p><strong>Client Savings Applied:</strong> ${fmt(inputs.savings)}</p>` : ''}
            <hr/>
            <p style="font-size:11px;color:#999;">This tool provides general information and estimates only. It does not constitute financial advice. Seek professional advice before making decisions.</p>
          `,
        },
      });
      if (error) throw error;
      toast.success('Summary emailed to ' + user.email);
    } catch {
      toast.error('Failed to send email');
    }
  };

  const comparisonRows = outputs && inputs ? [
    { label: 'Sell Home Value', now: fmt(outputs.adjustedHomeValue), future: fmt(outputs.futureHomeValue) },
    { label: 'Selling Costs', now: fmt(outputs.sellingCosts), future: fmt(outputs.futureSellingCosts) },
    { label: 'Mortgage Owing', now: fmt(inputs.mortgageOwing), future: fmt(inputs.mortgageOwing) },
    { label: 'Usable Equity', now: fmt(outputs.usableEquity), future: fmt(outputs.futureUsableEquity) },
    { label: 'Target Buy Price', now: fmt(inputs.targetPurchasePrice), future: fmt(outputs.futureTargetPrice) },
    { label: `Buying Costs (${buyingCostPercent}%)`, now: fmt(outputs.purchaseCostsNow), future: fmt(outputs.futurePurchaseCosts) },
    ...(inputs.savings > 0 ? [{ label: 'Client Savings', now: fmt(inputs.savings), future: fmt(inputs.savings) }] : []),
    { label: 'Total Funds Needed', now: fmt(outputs.totalFundsNeededNow), future: fmt(outputs.futureTotalFundsNeeded) },
    { label: 'Loan Required', now: fmt(outputs.loanRequiredNow), future: fmt(outputs.futureLoanRequired), highlight: true },
  ] : [];

  // Home value adjustment slider range
  const adjustmentMin = -100000;
  const adjustmentMax = 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Tools
          </Button>
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Sell & Upgrade Timeline Simulator</h1>
          <p className="text-muted-foreground text-sm">Model what happens if a vendor sells now vs waits.</p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Section A – Current Home */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" /> Current Home
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CurrencyInput
                label="Current Home Value"
                placeholder="e.g. 850,000"
                value={currentHomeValue}
                onChange={setCurrentHomeValue}
              />
              <CurrencyInput
                label="Mortgage Owing"
                placeholder="e.g. 400,000"
                value={mortgageOwing}
                onChange={setMortgageOwing}
              />
              <div>
                <Label>Selling Cost %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={sellingCostPercent}
                  onChange={(e) => setSellingCostPercent(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section B – Next Purchase */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Next Purchase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CurrencyInput
                label="Target Purchase Price"
                placeholder="e.g. 1,200,000"
                value={targetPurchasePrice}
                onChange={setTargetPurchasePrice}
              />
              <div>
                <Label>Growth Assumption</Label>
                <div className="flex gap-2 mt-1">
                  {[
                    { label: 'Conservative 3%', value: 3 },
                    { label: 'Balanced 5%', value: 5 },
                    { label: 'Strong 7%', value: 7 },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      variant={growthPreset === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setGrowthPreset(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="pt-1">
                <p className="text-xs text-muted-foreground">Buying costs (stamp duty, conveyancing, legals) calculated at {buyingCostPercent}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Savings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-primary" /> Client Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CurrencyInput
              label="Savings towards next purchase"
              placeholder="e.g. 50,000"
              value={savings}
              onChange={setSavings}
            />
            <p className="text-xs text-muted-foreground mt-2">Any cash the client has saved that can go towards the purchase.</p>
          </CardContent>
        </Card>

        {/* Home Value Adjustment Slider */}
        {chvNum > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MinusCircle className="w-4 h-4 text-primary" /> What If They Sell For Less?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm">Adjusted Sale Price</Label>
                  <span className="text-lg font-bold text-primary">
                    {fmt(chvNum + homeValueAdjustment)}
                    {homeValueAdjustment !== 0 && (
                      <span className="text-sm font-normal text-destructive ml-2">
                        ({fmt(homeValueAdjustment)})
                      </span>
                    )}
                  </span>
                </div>
                <Slider
                  value={[homeValueAdjustment]}
                  onValueChange={([v]) => setHomeValueAdjustment(v)}
                  min={adjustmentMin}
                  max={adjustmentMax}
                  step={25000}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>-$100k</span>
                  <span>-$75k</span>
                  <span>-$50k</span>
                  <span>-$25k</span>
                  <span>Full price</span>
                </div>
              </div>

              {/* Repayment Impact */}
              {outputs && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Repayment Impact (30yr loan)</Label>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Rate %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="15"
                        className="w-20 h-8 text-sm"
                        value={repaymentRate}
                        onChange={(e) => setRepaymentRate(e.target.value)}
                      />
                    </div>
                  </div>
                  {(() => {
                    const rate = parseFloat(repaymentRate) || 6;
                    const loan = outputs.loanRequiredNow;
                    const monthly = calcRepayment(loan, rate, 30, 'monthly');
                    const fortnightly = calcRepayment(loan, rate, 30, 'fortnightly');
                    const weekly = calcRepayment(loan, rate, 30, 'weekly');

                    // Also calculate at full price (no adjustment) for comparison
                    const fullPriceInputs = { ...inputs!, homeValueAdjustment: 0 };
                    const fullPriceOutputs = runSimulator(fullPriceInputs);
                    const fullLoan = fullPriceOutputs.loanRequiredNow;
                    const fullMonthly = calcRepayment(fullLoan, rate, 30, 'monthly');
                    const fullFortnightly = calcRepayment(fullLoan, rate, 30, 'fortnightly');
                    const fullWeekly = calcRepayment(fullLoan, rate, 30, 'weekly');

                    const showDiff = homeValueAdjustment !== 0;

                    return (
                      <div className="space-y-3">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[35%]">Frequency</TableHead>
                              <TableHead>Repayment</TableHead>
                              {showDiff && <TableHead>vs Full Price</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[
                              { label: 'Monthly', val: monthly, full: fullMonthly },
                              { label: 'Fortnightly', val: fortnightly, full: fullFortnightly },
                              { label: 'Weekly', val: weekly, full: fullWeekly },
                            ].map((r) => (
                              <TableRow key={r.label}>
                                <TableCell className="text-sm font-medium">{r.label}</TableCell>
                                <TableCell className="text-sm font-semibold">{fmt(r.val)}</TableCell>
                                {showDiff && (
                                  <TableCell className="text-sm text-destructive">
                                    +{fmt(r.val - r.full)}/
                                    {r.label === 'Monthly' ? 'mo' : r.label === 'Fortnightly' ? 'fn' : 'wk'}
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <p className="text-xs text-muted-foreground">
                          Based on a loan of {fmt(loan)} at {rate}% over 30 years (P&I).
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline Slider */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Timeline: How long to wait?</Label>
              <span className="text-lg font-bold text-primary">
                {monthsToWait === 0 ? 'Move now' : `Wait: ${monthsToWait} month${monthsToWait !== 1 ? 's' : ''}`}
              </span>
            </div>
            <Slider
              value={[monthsToWait]}
              onValueChange={([v]) => setMonthsToWait(v)}
              min={0}
              max={24}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Now</span>
              <span>6mo</span>
              <span>12mo</span>
              <span>18mo</span>
              <span>24mo</span>
            </div>
          </CardContent>
        </Card>

        {/* OUTPUTS */}
        {outputs && inputs && (
          <div ref={resultsRef} className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Usable Equity</p>
                  <p className="text-xl font-bold mt-1">{fmt(outputs.usableEquity)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Loan Required (Now)</p>
                  <p className="text-xl font-bold mt-1">{fmt(outputs.loanRequiredNow)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    LVR: {inputs.targetPurchasePrice > 0 ? ((outputs.loanRequiredNow / inputs.targetPurchasePrice) * 100).toFixed(1) : '0.0'}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Loan ({monthsToWait}mo)</p>
                  <p className="text-xl font-bold mt-1">{fmt(outputs.futureLoanRequired)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    LVR: {outputs.futureTargetPrice > 0 ? ((outputs.futureLoanRequired / outputs.futureTargetPrice) * 100).toFixed(1) : '0.0'}%
                  </p>
                </CardContent>
              </Card>
              <Card className={outputs.extraLoanFromWaiting > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-success/40 bg-success/5'}>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Extra Loan from Waiting</p>
                  <p className={`text-xl font-bold mt-1 ${outputs.extraLoanFromWaiting > 0 ? 'text-destructive' : 'text-success'}`}>
                    {outputs.extraLoanFromWaiting > 0 ? '+' : ''}{fmt(outputs.extraLoanFromWaiting)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Headline */}
            {monthsToWait > 0 && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-5 pb-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Waiting {monthsToWait} month{monthsToWait !== 1 ? 's' : ''} at {growthPreset}% growth could
                    {outputs.extraLoanFromWaiting > 0 ? ' increase' : ' decrease'} the required loan by:
                  </p>
                  <p className={`text-3xl font-bold ${outputs.extraLoanFromWaiting > 0 ? 'text-destructive' : 'text-success'}`}>
                    {outputs.extraLoanFromWaiting > 0 ? '+' : ''}{fmt(outputs.extraLoanFromWaiting)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Comparison Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sell Now vs Wait {monthsToWait} Months</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]"></TableHead>
                      <TableHead>Sell Now</TableHead>
                      <TableHead>Wait {monthsToWait}mo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonRows.map((row) => (
                      <TableRow key={row.label} className={row.highlight ? 'bg-primary/5 font-semibold' : ''}>
                        <TableCell className="text-sm">{row.label}</TableCell>
                        <TableCell className="text-sm">{row.now}</TableCell>
                        <TableCell className="text-sm">{row.future}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Loan Required Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={outputs.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        tickFormatter={(v) => `${v}mo`}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip
                        formatter={(value: number) => [fmt(value), 'Loan Required']}
                        labelFormatter={(label) => `Month ${label}`}
                      />
                      <ReferenceLine
                        x={monthsToWait}
                        stroke="hsl(var(--primary))"
                        strokeDasharray="4 4"
                        label={{ value: `${monthsToWait}mo`, position: 'top', fontSize: 11 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="loanRequired"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleDownloadPDF} variant="outline">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
              <Button onClick={handleEmailSummary} variant="outline">
                <Mail className="w-4 h-4 mr-2" /> Email Summary
              </Button>
              <Button onClick={handleSaveScenario} disabled={saving}>
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Scenario'}
              </Button>
            </div>

            {/* Refer to Margin */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-base">Ready to move forward?</h3>
                  <p className="text-sm text-muted-foreground">Send this client to Margin Finance for a quick assessment.</p>
                </div>
                <Button
                  size="lg"
                  className="shrink-0"
                  onClick={() => navigate('/submit-referral')}
                >
                  <Send className="w-4 h-4 mr-2" /> Refer to Margin
                </Button>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Separator />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Important Note:</strong> This tool provides general information and estimates only.
              It does not constitute financial advice and does not consider your personal circumstances.
              Figures shown are indicative and may change based on lender assessment, market movements,
              and actual costs (including stamp duty and selling costs). Seek professional advice before making decisions.
            </p>
          </div>
        )}

        {!outputs && (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Enter the property details above to see your results</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
