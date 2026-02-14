import { useState, useMemo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, DollarSign, Users, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;

export default function BorrowingPowerEstimator() {
  const navigate = useNavigate();
  const [grossIncome, setGrossIncome] = useState('');
  const [partnerIncome, setPartnerIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [existingDebts, setExistingDebts] = useState('');
  const [dependants, setDependants] = useState('0');
  const [interestRate, setInterestRate] = useState('6.5');

  const results = useMemo(() => {
    const income = parseFloat(grossIncome) || 0;
    const partner = parseFloat(partnerIncome) || 0;
    const expenses = parseFloat(monthlyExpenses) || 0;
    const debts = parseFloat(existingDebts) || 0;
    const deps = parseInt(dependants) || 0;
    const rate = parseFloat(interestRate) || 6.5;

    if (!income) return null;

    const totalGrossMonthly = (income + partner) / 12;
    // Approximate net = 70% of gross (simplified tax estimate)
    const netMonthly = totalGrossMonthly * 0.7;
    // HEM-style dependant cost: ~$400/month per dependant
    const dependantCost = deps * 400;
    // Available for repayments (max 30% of net, minus expenses and debts)
    const maxRepayment = Math.max(0, netMonthly * 0.3 - dependantCost);
    const adjustedRepayment = Math.max(0, maxRepayment - (debts / 12));

    // Buffer rate (+2% for serviceability)
    const bufferRate = rate + 2;
    const monthlyRate = bufferRate / 100 / 12;
    const n = 30 * 12; // 30 year term

    // Max loan from repayment capacity
    let maxLoan = 0;
    if (monthlyRate > 0 && adjustedRepayment > 0) {
      maxLoan = adjustedRepayment * (1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate;
    }

    // Conservative and generous estimates
    const conservative = maxLoan * 0.85;
    const generous = maxLoan * 1.1;

    return {
      maxLoan: Math.round(maxLoan),
      conservative: Math.round(conservative),
      generous: Math.round(generous),
      monthlyRepayment: Math.round(adjustedRepayment),
      bufferRate,
      netMonthly: Math.round(netMonthly),
    };
  }, [grossIncome, partnerIncome, monthlyExpenses, existingDebts, dependants, interestRate]);

  const getGaugeColor = (loan: number) => {
    if (loan > 1500000) return 'text-destructive';
    if (loan > 800000) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Borrowing Power Estimator</h1>
          <p className="text-muted-foreground text-sm">Get a rough idea of how much you could borrow</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Income & Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Your Gross Annual Income ($)</Label>
                <Input type="number" placeholder="e.g. 120000" value={grossIncome} onChange={(e) => setGrossIncome(e.target.value)} />
              </div>
              <div>
                <Label>Partner's Gross Annual Income ($)</Label>
                <Input type="number" placeholder="0 if single" value={partnerIncome} onChange={(e) => setPartnerIncome(e.target.value)} />
              </div>
              <div>
                <Label>Monthly Living Expenses ($)</Label>
                <Input type="number" placeholder="e.g. 3000" value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(e.target.value)} />
              </div>
              <div>
                <Label>Existing Annual Debt Repayments ($)</Label>
                <Input type="number" placeholder="e.g. 12000" value={existingDebts} onChange={(e) => setExistingDebts(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Dependants</Label>
                  <Input type="number" min="0" value={dependants} onChange={(e) => setDependants(e.target.value)} />
                </div>
                <div>
                  <Label>Interest Rate (%)</Label>
                  <Input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {results && (
            <div className="space-y-5">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6 text-center">
                  <Gauge className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Estimated Borrowing Power</p>
                  <p className={`text-4xl font-bold ${getGaugeColor(results.maxLoan)}`}>{fmt(results.maxLoan)}</p>
                  <p className="text-xs text-muted-foreground mt-2">Assessed at {results.bufferRate.toFixed(1)}% buffer rate over 30 years</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Conservative Estimate</span>
                    <span className="font-semibold">{fmt(results.conservative)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mid Estimate</span>
                    <span className="font-semibold text-primary">{fmt(results.maxLoan)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Upper Estimate</span>
                    <span className="font-semibold">{fmt(results.generous)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Monthly Repayment Capacity</span>
                    <span className="font-semibold">{fmt(results.monthlyRepayment)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Net Monthly Income</span>
                    <span className="font-semibold">{fmt(results.netMonthly)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {!results && (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Enter your income details to see your estimated borrowing power</p>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Important Note:</strong> This is a simplified estimate only and does not constitute a formal borrowing assessment. Actual borrowing capacity depends on lender policies, credit history, living expenses (HEM), loan type, and other factors. Seek professional advice before making financial decisions.
        </p>
      </main>
    </div>
  );
}
