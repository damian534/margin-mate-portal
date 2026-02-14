import { useState, useMemo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, DollarSign, TrendingDown, ArrowDownRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;

function calcRepayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}

export default function RefinanceSavingsCalculator() {
  const navigate = useNavigate();
  const [loanBalance, setLoanBalance] = useState('');
  const [currentRate, setCurrentRate] = useState('');
  const [newRate, setNewRate] = useState('');
  const [remainingYears, setRemainingYears] = useState(25);
  const [switchCosts, setSwitchCosts] = useState('2000');

  const results = useMemo(() => {
    const balance = parseFloat(loanBalance);
    const oldRate = parseFloat(currentRate);
    const newR = parseFloat(newRate);
    const costs = parseFloat(switchCosts) || 0;

    if (!balance || isNaN(oldRate) || isNaN(newR) || !remainingYears) return null;

    const oldMonthly = calcRepayment(balance, oldRate, remainingYears);
    const newMonthly = calcRepayment(balance, newR, remainingYears);
    const monthlySaving = oldMonthly - newMonthly;
    const annualSaving = monthlySaving * 12;
    const totalSaving = monthlySaving * remainingYears * 12;
    const netSaving = totalSaving - costs;
    const oldTotalInterest = oldMonthly * remainingYears * 12 - balance;
    const newTotalInterest = newMonthly * remainingYears * 12 - balance;
    const interestSaved = oldTotalInterest - newTotalInterest;
    const breakEvenMonths = monthlySaving > 0 ? Math.ceil(costs / monthlySaving) : 0;

    return {
      oldMonthly,
      newMonthly,
      monthlySaving,
      annualSaving,
      totalSaving,
      netSaving,
      oldTotalInterest,
      newTotalInterest,
      interestSaved,
      breakEvenMonths,
      costs,
    };
  }, [loanBalance, currentRate, newRate, remainingYears, switchCosts]);

  const chartData = results ? [
    { name: 'Current Loan', interest: Math.round(results.oldTotalInterest) },
    { name: 'Refinanced', interest: Math.round(results.newTotalInterest) },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Refinance Savings Calculator</h1>
          <p className="text-muted-foreground text-sm">Compare your current loan against a new rate to see potential savings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Loan Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Current Loan Balance ($)</Label>
                <Input type="number" placeholder="e.g. 500000" value={loanBalance} onChange={(e) => setLoanBalance(e.target.value)} />
              </div>
              <div>
                <Label>Current Interest Rate (% p.a.)</Label>
                <Input type="number" step="0.01" placeholder="e.g. 6.5" value={currentRate} onChange={(e) => setCurrentRate(e.target.value)} />
              </div>
              <div>
                <Label>New Interest Rate (% p.a.)</Label>
                <Input type="number" step="0.01" placeholder="e.g. 5.99" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Remaining Loan Term</Label>
                  <span className="text-sm font-semibold text-primary">{remainingYears} years</span>
                </div>
                <Slider value={[remainingYears]} onValueChange={([v]) => setRemainingYears(v)} min={1} max={40} step={1} />
              </div>
              <div>
                <Label>Estimated Switching Costs ($)</Label>
                <Input type="number" placeholder="2000" value={switchCosts} onChange={(e) => setSwitchCosts(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {results && (
            <div className="space-y-5">
              {/* Headline saving */}
              <Card className={results.monthlySaving > 0 ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'}>
                <CardContent className="pt-6 text-center">
                  <ArrowDownRight className={`w-8 h-8 mx-auto mb-2 ${results.monthlySaving > 0 ? 'text-success' : 'text-destructive'}`} />
                  <p className="text-sm text-muted-foreground mb-1">Monthly Saving</p>
                  <p className={`text-4xl font-bold ${results.monthlySaving > 0 ? 'text-success' : 'text-destructive'}`}>
                    {results.monthlySaving > 0 ? '' : '-'}{fmt(Math.abs(results.monthlySaving))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {fmt(Math.abs(results.annualSaving))} per year · {fmt(Math.abs(results.netSaving))} total (net of costs)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Monthly Repayment</span>
                    <span className="font-semibold">{fmt(results.oldMonthly)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">New Monthly Repayment</span>
                    <span className="font-semibold text-primary">{fmt(results.newMonthly)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Interest (Current)</span>
                    <span className="font-semibold">{fmt(results.oldTotalInterest)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Interest (New)</span>
                    <span className="font-semibold">{fmt(results.newTotalInterest)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Interest Saved</span>
                    <span className="font-semibold text-success">{fmt(results.interestSaved)}</span>
                  </div>
                  {results.breakEvenMonths > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Break-Even Point</span>
                        <span className="font-semibold">{results.breakEvenMonths} months</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {results && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total Interest Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                    <Tooltip formatter={(value: number) => [fmt(value), 'Total Interest']} />
                    <Bar dataKey="interest" radius={[0, 6, 6, 0]}>
                      <Cell fill="hsl(var(--muted-foreground))" />
                      <Cell fill="hsl(var(--primary))" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {!results && (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingDown className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Enter your loan details to compare rates</p>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Important Note:</strong> This calculator provides estimates only. Actual savings depend on lender fees, discharge costs, loan features, and rate changes over time. Seek professional advice before refinancing.
        </p>
      </main>
    </div>
  );
}
