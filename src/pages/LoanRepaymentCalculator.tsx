import { useState, useMemo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, DollarSign, Percent, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;

function calcRepayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}

export default function LoanRepaymentCalculator() {
  const navigate = useNavigate();
  const [loanAmount, setLoanAmount] = useState('500000');
  const [interestRate, setInterestRate] = useState('6.0');
  const [loanTerm, setLoanTerm] = useState(30);

  const results = useMemo(() => {
    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate);
    if (!principal || isNaN(rate) || !loanTerm) return null;

    const monthly = calcRepayment(principal, rate, loanTerm);
    const fortnightly = monthly * 12 / 26;
    const weekly = monthly * 12 / 52;
    const totalPaid = monthly * loanTerm * 12;
    const totalInterest = totalPaid - principal;

    // Amortisation schedule for chart
    const schedule: { year: number; principal: number; interest: number; balance: number }[] = [];
    let balance = principal;
    const monthlyRate = rate / 100 / 12;
    for (let y = 1; y <= loanTerm; y++) {
      let yearPrincipal = 0;
      let yearInterest = 0;
      for (let m = 0; m < 12; m++) {
        const intPayment = balance * monthlyRate;
        const princPayment = monthly - intPayment;
        yearInterest += intPayment;
        yearPrincipal += princPayment;
        balance = Math.max(0, balance - princPayment);
      }
      schedule.push({ year: y, principal: Math.round(yearPrincipal), interest: Math.round(yearInterest), balance: Math.round(balance) });
    }

    return { monthly, fortnightly, weekly, totalPaid, totalInterest, schedule };
  }, [loanAmount, interestRate, loanTerm]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Loan Repayment Calculator</h1>
          <p className="text-muted-foreground text-sm">Calculate monthly, fortnightly and weekly repayments</p>
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
                <Label>Loan Amount ($)</Label>
                <Input type="number" placeholder="500000" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
              </div>
              <div>
                <Label>Interest Rate (% p.a.)</Label>
                <Input type="number" step="0.1" placeholder="6.0" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Loan Term</Label>
                  <span className="text-sm font-semibold text-primary">{loanTerm} years</span>
                </div>
                <Slider value={[loanTerm]} onValueChange={([v]) => setLoanTerm(v)} min={1} max={40} step={1} />
              </div>
            </CardContent>
          </Card>

          {results && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Repayments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase">Monthly</p>
                    <p className="text-lg font-bold">{fmt(results.monthly)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase">Fortnightly</p>
                    <p className="text-lg font-bold">{fmt(results.fortnightly)}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase">Weekly</p>
                    <p className="text-lg font-bold">{fmt(results.weekly)}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Repaid</span>
                    <span className="font-semibold">{fmt(results.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Interest</span>
                    <span className="font-semibold text-destructive">{fmt(results.totalInterest)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Principal</span>
                    <span className="font-semibold">{fmt(parseFloat(loanAmount))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {results && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Loan Balance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.schedule}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tickFormatter={(v) => `Yr ${v}`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip formatter={(value: number) => [fmt(value)]} labelFormatter={(l) => `Year ${l}`} />
                    <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Important Note:</strong> This calculator provides estimates only. Actual repayments may vary based on lender fees, loan structure, and interest rate changes. Seek professional advice before making financial decisions.
        </p>
      </main>
    </div>
  );
}
