import { useState, useMemo, useRef } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { runSimulator, SimulatorInputs, SimulatorOutputs } from '@/lib/simulator-calculations';
import { ArrowLeft, Download, Mail, Save, TrendingUp, TrendingDown, DollarSign, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;

export default function SellUpgradeSimulator() {
  const { user, isPreviewMode } = useAuth();
  const navigate = useNavigate();

  // Inputs
  const [currentHomeValue, setCurrentHomeValue] = useState<string>('');
  const [mortgageOwing, setMortgageOwing] = useState<string>('');
  const [sellingCostPercent, setSellingCostPercent] = useState<string>('3.0');
  const [targetPurchasePrice, setTargetPurchasePrice] = useState<string>('');
  const [state, setState] = useState('VIC');
  const [growthPreset, setGrowthPreset] = useState<number>(5);
  const [monthsToWait, setMonthsToWait] = useState<number>(6);
  const [conveyancingCost] = useState<number>(3000);
  const [saving, setSaving] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

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
      state,
      annualGrowthPercent: growthPreset,
      monthsToWait,
      conveyancingCost,
    };
  }, [currentHomeValue, mortgageOwing, sellingCostPercent, targetPurchasePrice, state, growthPreset, monthsToWait, conveyancingCost]);

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
    // Build a printable summary and trigger print
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
          <tr><td>Mortgage Owing</td><td>${fmt(inputs.mortgageOwing)}</td></tr>
          <tr><td>Selling Cost</td><td>${inputs.sellingCostPercent}%</td></tr>
          <tr><td>Target Purchase Price</td><td>${fmt(inputs.targetPurchasePrice)}</td></tr>
          <tr><td>Growth Assumption</td><td>${inputs.annualGrowthPercent}% p.a.</td></tr>
          <tr><td>Wait Period</td><td>${inputs.monthsToWait} months</td></tr>
        </table>

        <h3>Comparison: Sell Now vs Wait ${monthsToWait} Months</h3>
        <table>
          <tr><th></th><th>Sell Now</th><th>Wait ${monthsToWait} months</th></tr>
          <tr><td>Sell Home Value</td><td>${fmt(inputs.currentHomeValue)}</td><td>${fmt(outputs.futureHomeValue)}</td></tr>
          <tr><td>Selling Costs</td><td>${fmt(outputs.sellingCosts)}</td><td>${fmt(outputs.futureSellingCosts)}</td></tr>
          <tr><td>Mortgage Owing</td><td>${fmt(inputs.mortgageOwing)}</td><td>${fmt(inputs.mortgageOwing)}</td></tr>
          <tr><td>Usable Equity</td><td>${fmt(outputs.usableEquity)}</td><td>${fmt(outputs.futureUsableEquity)}</td></tr>
          <tr><td>Target Buy Price</td><td>${fmt(inputs.targetPurchasePrice)}</td><td>${fmt(outputs.futureTargetPrice)}</td></tr>
          <tr><td>Stamp Duty (${state})</td><td>${fmt(outputs.stampDutyNow)}</td><td>${fmt(outputs.futureStampDuty)}</td></tr>
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

  const comparisonRows = outputs ? [
    { label: 'Sell Home Value', now: fmt(inputs!.currentHomeValue), future: fmt(outputs.futureHomeValue) },
    { label: 'Selling Costs', now: fmt(outputs.sellingCosts), future: fmt(outputs.futureSellingCosts) },
    { label: 'Mortgage Owing', now: fmt(inputs!.mortgageOwing), future: fmt(inputs!.mortgageOwing) },
    { label: 'Usable Equity', now: fmt(outputs.usableEquity), future: fmt(outputs.futureUsableEquity) },
    { label: 'Target Buy Price', now: fmt(inputs!.targetPurchasePrice), future: fmt(outputs.futureTargetPrice) },
    { label: `Stamp Duty (${state})`, now: fmt(outputs.stampDutyNow), future: fmt(outputs.futureStampDuty) },
    { label: 'Total Funds Needed', now: fmt(outputs.totalFundsNeededNow), future: fmt(outputs.futureTotalFundsNeeded) },
    { label: 'Loan Required', now: fmt(outputs.loanRequiredNow), future: fmt(outputs.futureLoanRequired), highlight: true },
  ] : [];

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
          {/* Section A */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" /> Current Home
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Home Value ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 850000"
                  value={currentHomeValue}
                  onChange={(e) => setCurrentHomeValue(e.target.value)}
                />
              </div>
              <div>
                <Label>Mortgage Owing ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 400000"
                  value={mortgageOwing}
                  onChange={(e) => setMortgageOwing(e.target.value)}
                />
              </div>
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

          {/* Section B */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Next Purchase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Target Purchase Price ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1200000"
                  value={targetPurchasePrice}
                  onChange={(e) => setTargetPurchasePrice(e.target.value)}
                />
              </div>
              <div>
                <Label>State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIC">VIC</SelectItem>
                    <SelectItem value="NSW">NSW (estimate)</SelectItem>
                    <SelectItem value="QLD">QLD (estimate)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
            </CardContent>
          </Card>
        </div>

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
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Loan ({monthsToWait}mo)</p>
                  <p className="text-xl font-bold mt-1">{fmt(outputs.futureLoanRequired)}</p>
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
