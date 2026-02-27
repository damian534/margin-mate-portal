import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/advisor/calculations";
import { Slider } from "@/components/ui/slider";
import { InputField } from "./InputField";

interface ETFComparisonProps {
  holdingPeriodYears: number;
  propertyNetWealth: number;
  startYear: number;
  defaultInitialAmount?: number;
  defaultMonthlyAmount?: number;
  mode?: 'already-held' | 'new-purchase';
}

interface ETFYearlyProjection {
  year: number;
  contributions: number;
  growth: number;
  totalValue: number;
}

export function ETFComparisonSection({
  holdingPeriodYears,
  propertyNetWealth,
  startYear,
  defaultInitialAmount = 80000,
  defaultMonthlyAmount = 500,
  mode = 'already-held',
}: ETFComparisonProps) {
  const [initialContribution, setInitialContribution] = useState(defaultInitialAmount);
  const [monthlyContribution, setMonthlyContribution] = useState(defaultMonthlyAmount);
  const [annualReturn, setAnnualReturn] = useState(9.5);

  const { projections, summary } = useMemo(() => {
    const projections: ETFYearlyProjection[] = [];
    const monthlyRate = annualReturn / 100 / 12;
    const annualContribution = monthlyContribution * 12;
    
    let totalValue = initialContribution;
    let totalContributions = initialContribution;
    
    for (let i = 0; i <= holdingPeriodYears; i++) {
      const year = startYear + i;
      
      if (i === 0) {
        projections.push({ year, contributions: initialContribution, growth: 0, totalValue: initialContribution });
      } else {
        let yearStartValue = totalValue;
        for (let month = 0; month < 12; month++) {
          totalValue = totalValue * (1 + monthlyRate) + monthlyContribution;
        }
        totalContributions += annualContribution;
        projections.push({ year, contributions: totalContributions, growth: totalValue - totalContributions, totalValue });
      }
    }
    
    const finalValue = projections[projections.length - 1]?.totalValue || 0;
    const totalGrowth = finalValue - totalContributions;
    
    return { projections, summary: { totalContributions, totalGrowth, finalValue } };
  }, [initialContribution, monthlyContribution, holdingPeriodYears, startYear, annualReturn]);

  const difference = propertyNetWealth - summary.totalGrowth;
  const propertyWins = difference > 0;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BarChart3 className="h-5 w-5 text-primary" />
          ETF/Index Fund Comparison
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {mode === 'new-purchase' 
            ? "What if you invested your deposit and monthly costs in an ETF instead?"
            : "What if you had invested your property contributions in an ETF instead?"
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-lg border border-border/50">
          <InputField label="Initial Investment" id="etf-initial" value={initialContribution} onChange={setInitialContribution} prefix="$" helperText="Lump sum at start" min={0} step={5000} />
          <InputField label="Monthly Contribution" id="etf-monthly" value={monthlyContribution} onChange={setMonthlyContribution} prefix="$" helperText="Average monthly investment" min={0} step={50} />
          <div className="space-y-2">
            <Label className="text-sm font-medium">Average Annual Return</Label>
            <div className="flex items-center gap-3">
              <Slider value={[annualReturn]} onValueChange={(v) => setAnnualReturn(v[0])} min={4} max={15} step={0.5} className="flex-1" />
              <span className="text-sm font-medium w-12 text-right">{annualReturn}%</span>
            </div>
            <p className="text-xs text-muted-foreground">ASX200 avg: ~9.5%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
            <p className="text-sm text-muted-foreground mb-1">Total Contributed</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.totalContributions)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(initialContribution)} initial + {formatCurrency(monthlyContribution)}/mo</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
            <p className="text-sm text-muted-foreground mb-1">ETF Growth</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(summary.totalGrowth)}</p>
            <p className="text-xs text-muted-foreground mt-1">At {annualReturn}% avg. return</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
            <p className="text-sm text-muted-foreground mb-1">ETF Total Value</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(summary.finalValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">After {holdingPeriodYears} years</p>
          </div>
        </div>

        <div className={`p-6 rounded-lg border-2 ${propertyWins ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Scale className={`h-6 w-6 ${propertyWins ? 'text-success' : 'text-warning'}`} />
            <h4 className="text-lg font-semibold">Property vs ETF Comparison</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Property Net Wealth</p>
              <p className={`text-2xl font-bold ${propertyNetWealth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {propertyNetWealth >= 0 ? formatCurrency(propertyNetWealth) : `-${formatCurrency(Math.abs(propertyNetWealth))}`}
              </p>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <p className="text-sm text-muted-foreground mb-1">vs</p>
              <div className={`text-xl font-bold ${propertyWins ? 'text-success' : 'text-warning'}`}>
                {propertyWins ? `Property +${formatCurrency(difference)}` : `ETF +${formatCurrency(Math.abs(difference))}`}
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">ETF Growth</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(summary.totalGrowth)}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground font-medium">Year</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Total Contributed</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Growth</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">ETF Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projections.map((projection) => (
                <TableRow key={projection.year} className="border-border/50">
                  <TableCell className="font-medium text-foreground">{projection.year}</TableCell>
                  <TableCell className="text-right text-foreground">{formatCurrency(projection.contributions)}</TableCell>
                  <TableCell className="text-right text-success">{formatCurrency(projection.growth)}</TableCell>
                  <TableCell className="text-right font-bold text-success">{formatCurrency(projection.totalValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          * This comparison assumes reinvested dividends and does not account for ETF fees, taxes on dividends, or capital gains tax on sale.
        </p>
      </CardContent>
    </Card>
  );
}