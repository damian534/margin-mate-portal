import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, Calendar, Briefcase, Sparkles, Home, DollarSign, Wallet } from "lucide-react";
import { PropertyData, PropertyResults, FutureProjection } from "@/lib/advisor/portfolioTypes";
import { calculateFutureProjections } from "@/lib/advisor/portfolioCalculations";
import { formatCurrency } from "@/lib/advisor/calculations";
import { cn } from "@/lib/utils";

interface CombinedPortfolioProjectionProps {
  properties: PropertyData[];
  resultsMap: Map<string, PropertyResults>;
  applicant1Income: number;
  applicant2Income: number;
  isJointOwnership: boolean;
  applicant1OwnershipPercent: number;
}

interface CombinedYearProjection {
  year: number;
  totalPropertyValue: number;
  totalLoanBalance: number;
  totalEquity: number;
  totalCashInvested: number;
  totalCgtIfSold: number;
  totalNetProceedsIfSold: number;
  totalNetWealthHolding: number;
  totalNetWealthIfSold: number;
}

export function CombinedPortfolioProjection({
  properties, resultsMap, applicant1Income, applicant2Income, isJointOwnership, applicant1OwnershipPercent,
}: CombinedPortfolioProjectionProps) {
  const [projectionYears, setProjectionYears] = useState(10);
  const [includeCGT, setIncludeCGT] = useState(false);

  const combinedProjections = useMemo(() => {
    const allProjections: Map<string, FutureProjection[]> = new Map();
    properties.forEach(property => {
      const results = resultsMap.get(property.id);
      if (!results) return;
      const projections = calculateFutureProjections(property, results, projectionYears, applicant1Income, applicant2Income, isJointOwnership, applicant1OwnershipPercent);
      allProjections.set(property.id, projections);
    });

    const combined: CombinedYearProjection[] = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i <= projectionYears; i++) {
      const year = currentYear + i;
      let totalPropertyValue = 0, totalLoanBalance = 0, totalEquity = 0, totalCashInvested = 0, totalCgtIfSold = 0, totalNetProceedsIfSold = 0, totalNetWealthHolding = 0, totalNetWealthIfSold = 0;
      allProjections.forEach((projections) => {
        const proj = projections[i];
        if (proj) {
          totalPropertyValue += proj.propertyValue; totalLoanBalance += proj.loanBalance; totalEquity += proj.equity;
          totalCashInvested += proj.totalCashInvested; totalCgtIfSold += proj.cgtIfSold; totalNetProceedsIfSold += proj.netProceedsIfSold;
          totalNetWealthHolding += proj.netWealthHolding; totalNetWealthIfSold += proj.netWealthIfSold;
        }
      });
      combined.push({ year, totalPropertyValue, totalLoanBalance, totalEquity, totalCashInvested, totalCgtIfSold, totalNetProceedsIfSold, totalNetWealthHolding, totalNetWealthIfSold });
    }
    return combined;
  }, [properties, resultsMap, projectionYears, applicant1Income, applicant2Income, isJointOwnership, applicant1OwnershipPercent]);

  const currentYear = new Date().getFullYear();
  const finalProjection = combinedProjections[combinedProjections.length - 1];

  const avgGrowthRate = useMemo(() => {
    let totalRate = 0, count = 0;
    properties.forEach(property => { const r = resultsMap.get(property.id); if (r) { totalRate += r.annualizedGrowth; count++; } });
    return count > 0 ? totalRate / count : 0;
  }, [properties, resultsMap]);

  const getNetWealth = (proj: CombinedYearProjection) => includeCGT ? proj.totalNetWealthIfSold : proj.totalNetWealthHolding;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20"><Briefcase className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle className="text-lg font-semibold">Combined Portfolio Projection</CardTitle>
              <p className="text-sm text-muted-foreground">{properties.length} properties • {avgGrowthRate.toFixed(1)}% avg growth rate</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Project forward:</Label>
            <Select value={projectionYears.toString()} onValueChange={(v) => setProjectionYears(parseInt(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 25, 30].map((years) => (<SelectItem key={years} value={years.toString()}>{years} years</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/80 border border-border/50">
          <div>
            <p className="text-sm font-medium">Include CGT & Selling Costs</p>
            <p className="text-xs text-muted-foreground">{includeCGT ? "Showing 'if all sold' scenario" : "Showing holding scenario"}</p>
          </div>
          <Switch checked={includeCGT} onCheckedChange={setIncludeCGT} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-background/80 border border-border/50">
            <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">In {projectionYears} Years</p></div>
            <p className="text-lg font-bold">{currentYear + projectionYears}</p>
          </div>
          <div className="p-4 rounded-lg bg-background/80 border border-border/50">
            <div className="flex items-center gap-2 mb-1"><Home className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Value</p></div>
            <p className="text-lg font-bold text-success">{formatCurrency(finalProjection?.totalPropertyValue || 0)}</p>
          </div>
          <div className="p-4 rounded-lg bg-background/80 border border-border/50">
            <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Equity</p></div>
            <p className="text-lg font-bold text-primary">{formatCurrency(finalProjection?.totalEquity || 0)}</p>
          </div>
          <div className="p-4 rounded-lg bg-background/80 border border-border/50">
            <div className="flex items-center gap-2 mb-1"><Wallet className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Total Invested</p></div>
            <p className="text-lg font-bold text-muted-foreground">{formatCurrency(finalProjection?.totalCashInvested || 0)}</p>
          </div>
        </div>

        <div className={cn("p-6 rounded-lg border-2", getNetWealth(finalProjection || {} as CombinedYearProjection) >= 0 ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-full", getNetWealth(finalProjection || {} as CombinedYearProjection) >= 0 ? "bg-success/20" : "bg-destructive/20")}>
                <Sparkles className={cn("h-6 w-6", getNetWealth(finalProjection || {} as CombinedYearProjection) >= 0 ? "text-success" : "text-destructive")} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Net Wealth in {projectionYears} Years {includeCGT ? "(if sold)" : "(holding)"}</p>
                <p className={cn("text-3xl md:text-4xl font-bold", getNetWealth(finalProjection || {} as CombinedYearProjection) >= 0 ? "text-success" : "text-destructive")}>
                  {getNetWealth(finalProjection || {} as CombinedYearProjection) >= 0 ? formatCurrency(getNetWealth(finalProjection || {} as CombinedYearProjection)) : `-${formatCurrency(Math.abs(getNetWealth(finalProjection || {} as CombinedYearProjection)))}`}
                </p>
                <p className="text-sm text-muted-foreground">{includeCGT ? "Net Proceeds − Total Cash Invested" : "Total Equity − Total Cash Invested"}</p>
              </div>
            </div>
            {includeCGT && (
              <div className="flex gap-4">
                <div className="p-4 rounded-lg bg-background/80 border border-border/50 text-center min-w-[130px]">
                  <p className="text-xs text-muted-foreground mb-1">Net Proceeds</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(finalProjection?.totalNetProceedsIfSold || 0)}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/80 border border-border/50 text-center min-w-[110px]">
                  <p className="text-xs text-muted-foreground mb-1">Total CGT</p>
                  <p className="text-xl font-bold text-warning">{formatCurrency(finalProjection?.totalCgtIfSold || 0)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Year</TableHead>
                  <TableHead className="text-right font-semibold">Total Value</TableHead>
                  <TableHead className="text-right font-semibold">Total Debt</TableHead>
                  <TableHead className="text-right font-semibold">Total Equity</TableHead>
                  <TableHead className="text-right font-semibold">Cash Invested</TableHead>
                  {includeCGT && <TableHead className="text-right font-semibold">Total CGT</TableHead>}
                  <TableHead className="text-right font-semibold">Net Wealth {includeCGT ? "(if sold)" : ""}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinedProjections.map((proj, index) => {
                  const isNow = index === 0;
                  const isFinal = index === combinedProjections.length - 1;
                  const netWealth = getNetWealth(proj);
                  return (
                    <TableRow key={proj.year} className={cn(isNow && "bg-primary/5", isFinal && "bg-success/5 font-medium")}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{proj.year}</span>
                          {isNow && <Badge variant="outline" className="text-xs">Now</Badge>}
                          {isFinal && <Badge className="text-xs bg-success/20 text-success border-success/30">+{projectionYears}yr</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(proj.totalPropertyValue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(proj.totalLoanBalance)}</TableCell>
                      <TableCell className="text-right text-primary font-medium">{formatCurrency(proj.totalEquity)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(proj.totalCashInvested)}</TableCell>
                      {includeCGT && <TableCell className="text-right text-warning">{formatCurrency(proj.totalCgtIfSold)}</TableCell>}
                      <TableCell className={cn("text-right font-medium", netWealth >= 0 ? "text-success" : "text-destructive")}>
                        {netWealth >= 0 ? '+' : ''}{formatCurrency(netWealth)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}