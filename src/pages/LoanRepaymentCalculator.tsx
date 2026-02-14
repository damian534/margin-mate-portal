import { useState, useMemo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ArrowLeft, DollarSign, Clock, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;

function parseCurrency(val: string): number {
  return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
}

function formatCurrency(val: string): string {
  const num = parseCurrency(val);
  if (!num) return val.replace(/[^0-9.]/g, '');
  return num.toLocaleString();
}

function calcRepayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}

function calcMonthsToPayoff(principal: number, annualRate: number, monthlyPayment: number): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / monthlyPayment;
  if (monthlyPayment <= principal * monthlyRate) return Infinity;
  return Math.ceil(-Math.log(1 - (principal * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate));
}

type Frequency = 'monthly' | 'fortnightly' | 'weekly';

const frequencyLabels: Record<Frequency, string> = {
  monthly: 'Monthly',
  fortnightly: 'Fortnightly',
  weekly: 'Weekly',
};

const frequencyMultiplier: Record<Frequency, number> = {
  monthly: 12,
  fortnightly: 26,
  weekly: 52,
};

export default function LoanRepaymentCalculator() {
  const navigate = useNavigate();
  const [loanAmount, setLoanAmount] = useState('500,000');
  const [interestRate, setInterestRate] = useState('6.0');
  const [loanTerm, setLoanTerm] = useState(30);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [extraRepayment, setExtraRepayment] = useState('0');

  const results = useMemo(() => {
    const principal = parseCurrency(loanAmount);
    const rate = parseFloat(interestRate);
    if (!principal || isNaN(rate) || !loanTerm) return null;

    const monthlyBase = calcRepayment(principal, rate, loanTerm);
    const fortnightlyBase = monthlyBase * 12 / 26;
    const weeklyBase = monthlyBase * 12 / 52;
    const totalPaidBase = monthlyBase * loanTerm * 12;
    const totalInterestBase = totalPaidBase - principal;

    // Extra repayment in the chosen frequency
    const extra = parseCurrency(extraRepayment);
    const periodsPerYear = frequencyMultiplier[frequency];
    const basePerPeriod = monthlyBase * 12 / periodsPerYear;
    const totalPerPeriod = basePerPeriod + extra;

    // Convert total per-period payment to monthly equivalent
    const monthlyEquivalent = totalPerPeriod * periodsPerYear / 12;

    // Months to pay off with extra
    const monthsWithExtra = calcMonthsToPayoff(principal, rate, monthlyEquivalent);
    const monthsOriginal = loanTerm * 12;
    const monthsSaved = monthsOriginal - monthsWithExtra;
    const yearsSaved = Math.floor(monthsSaved / 12);
    const remainingMonthsSaved = monthsSaved % 12;

    // Total paid with extra
    const totalPaidWithExtra = monthlyEquivalent * monthsWithExtra;
    const totalInterestWithExtra = totalPaidWithExtra - principal;
    const interestSaved = totalInterestBase - totalInterestWithExtra;

    // Amortisation schedule for chart (both with and without extra)
    const schedule: { year: number; balance: number; balanceExtra: number }[] = [];
    let balance = principal;
    let balanceExtra = principal;
    const monthlyRate = rate / 100 / 12;
    const maxYears = loanTerm;

    for (let y = 1; y <= maxYears; y++) {
      for (let m = 0; m < 12; m++) {
        // Standard
        if (balance > 0) {
          const intPayment = balance * monthlyRate;
          const princPayment = monthlyBase - intPayment;
          balance = Math.max(0, balance - princPayment);
        }
        // With extra
        if (balanceExtra > 0) {
          const intPaymentExtra = balanceExtra * monthlyRate;
          const princPaymentExtra = monthlyEquivalent - intPaymentExtra;
          balanceExtra = Math.max(0, balanceExtra - princPaymentExtra);
        }
      }
      schedule.push({
        year: y,
        balance: Math.round(balance),
        balanceExtra: Math.round(balanceExtra),
      });
    }

    return {
      monthlyBase,
      fortnightlyBase,
      weeklyBase,
      totalPaidBase,
      totalInterestBase,
      basePerPeriod,
      totalPerPeriod,
      extra,
      monthsWithExtra,
      monthsSaved,
      yearsSaved,
      remainingMonthsSaved,
      interestSaved,
      totalInterestWithExtra,
      schedule,
    };
  }, [loanAmount, interestRate, loanTerm, frequency, extraRepayment]);

  const handleCurrencyChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setter(raw ? parseFloat(raw).toLocaleString() : '');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Loan Repayment Calculator</h1>
          <p className="text-muted-foreground text-sm">Calculate repayments and see the impact of extra payments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Loan Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Loan Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Loan Amount ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    className="pl-7"
                    placeholder="500,000"
                    value={loanAmount}
                    onChange={handleCurrencyChange(setLoanAmount)}
                  />
                </div>
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
              <div>
                <Label className="mb-2 block">Repayment Frequency</Label>
                <ToggleGroup
                  type="single"
                  value={frequency}
                  onValueChange={(v) => v && setFrequency(v as Frequency)}
                  className="justify-start"
                >
                  <ToggleGroupItem value="monthly" className="text-xs px-3">Monthly</ToggleGroupItem>
                  <ToggleGroupItem value="fortnightly" className="text-xs px-3">Fortnightly</ToggleGroupItem>
                  <ToggleGroupItem value="weekly" className="text-xs px-3">Weekly</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardContent>
          </Card>

          {/* Repayments Summary */}
          {results && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Repayments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className={`text-center p-3 rounded-lg ${frequency === 'monthly' ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted'}`}>
                    <p className="text-xs text-muted-foreground uppercase">Monthly</p>
                    <p className="text-lg font-bold">{fmt(results.monthlyBase)}</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${frequency === 'fortnightly' ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted'}`}>
                    <p className="text-xs text-muted-foreground uppercase">Fortnightly</p>
                    <p className="text-lg font-bold">{fmt(results.fortnightlyBase)}</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${frequency === 'weekly' ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted'}`}>
                    <p className="text-xs text-muted-foreground uppercase">Weekly</p>
                    <p className="text-lg font-bold">{fmt(results.weeklyBase)}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Repaid</span>
                    <span className="font-semibold">{fmt(results.totalPaidBase)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Interest</span>
                    <span className="font-semibold text-destructive">{fmt(results.totalInterestBase)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Principal</span>
                    <span className="font-semibold">{fmt(parseCurrency(loanAmount))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Extra Repayments */}
        {results && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" /> Extra Repayments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="max-w-sm">
                <Label>Extra {frequencyLabels[frequency]} Payment ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    className="pl-7"
                    placeholder="0"
                    value={extraRepayment}
                    onChange={handleCurrencyChange(setExtraRepayment)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Additional amount on top of your {frequencyLabels[frequency].toLowerCase()} repayment of {fmt(results.basePerPeriod)}
                </p>
              </div>

              {results.extra > 0 && results.monthsSaved > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
                    <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground uppercase mb-1">Time Saved</p>
                    <p className="text-xl font-bold text-primary">
                      {results.yearsSaved > 0 ? `${results.yearsSaved}yr ` : ''}{results.remainingMonthsSaved}mo
                    </p>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
                    <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground uppercase mb-1">Interest Saved</p>
                    <p className="text-xl font-bold text-primary">{fmt(results.interestSaved)}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase mb-1">New Loan Term</p>
                    <p className="text-xl font-bold">
                      {Math.floor(results.monthsWithExtra / 12)}yr {results.monthsWithExtra % 12}mo
                    </p>
                    <p className="text-xs text-muted-foreground">vs {loanTerm} years</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chart */}
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
                    <Tooltip formatter={(value: number, name: string) => [fmt(value), name === 'balance' ? 'Standard' : 'With Extra']} labelFormatter={(l) => `Year ${l}`} />
                    <Area type="monotone" dataKey="balance" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground) / 0.1)" strokeWidth={2} name="Standard" />
                    {results.extra > 0 && (
                      <Area type="monotone" dataKey="balanceExtra" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} name="With Extra" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {results.extra > 0 && (
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground justify-center">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-muted-foreground inline-block" /> Standard</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block" /> With Extra Repayments</span>
                </div>
              )}
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
