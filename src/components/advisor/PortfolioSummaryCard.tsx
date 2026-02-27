import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Briefcase, TrendingUp, Wallet, Sparkles, DollarSign, Home } from "lucide-react";
import { PortfolioSummary } from "@/lib/advisor/portfolioTypes";
import { formatCurrency } from "@/lib/advisor/calculations";
import { cn } from "@/lib/utils";

interface PortfolioSummaryCardProps {
  summary: PortfolioSummary;
}

export function PortfolioSummaryCard({ summary }: PortfolioSummaryCardProps) {
  const [includeCGT, setIncludeCGT] = useState(false);

  const totalGrowthPercent = summary.totalPurchasePrice > 0
    ? ((summary.totalGrowth / summary.totalPurchasePrice) * 100).toFixed(1)
    : '0';

  const netWealth = includeCGT ? summary.totalNetWealthIfSold : summary.totalNetWealthHolding;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Portfolio Summary</CardTitle>
              <p className="text-sm text-muted-foreground">
                {summary.totalProperties} {summary.totalProperties === 1 ? 'property' : 'properties'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Combined Analysis
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/80 border border-border/50">
          <div>
            <p className="text-sm font-medium">Include CGT & Selling Costs</p>
            <p className="text-xs text-muted-foreground">
              {includeCGT ? "Showing 'if all sold' scenario with CGT and selling costs" : "Showing holding scenario - equity minus costs invested"}
            </p>
          </div>
          <Switch checked={includeCGT} onCheckedChange={setIncludeCGT} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-background/80 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Home className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Value</p>
            </div>
            <p className="text-xl font-bold">{formatCurrency(summary.totalCurrentValue)}</p>
          </div>
          <div className="p-4 rounded-lg bg-background/80 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Growth</p>
            </div>
            <p className={cn("text-xl font-bold", summary.totalGrowth >= 0 ? "text-success" : "text-destructive")}>
              {summary.totalGrowth >= 0 ? '+' : ''}{formatCurrency(summary.totalGrowth)}
            </p>
            <p className="text-xs text-muted-foreground">{totalGrowthPercent}%</p>
          </div>
          <div className="p-4 rounded-lg bg-background/80 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Equity</p>
            </div>
            <p className="text-xl font-bold text-primary">{formatCurrency(summary.totalEquity)}</p>
          </div>
          <div className="p-4 rounded-lg bg-background/80 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Monthly Costs</p>
            </div>
            <p className="text-xl font-bold text-destructive">{formatCurrency(summary.totalMonthlyShortfall)}</p>
            <p className="text-xs text-muted-foreground">/month combined</p>
          </div>
        </div>

        <div className={cn(
          "p-6 rounded-lg border-2",
          netWealth >= 0 ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
        )}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-full", netWealth >= 0 ? "bg-success/20" : "bg-destructive/20")}>
                <Sparkles className={cn("h-6 w-6", netWealth >= 0 ? "text-success" : "text-destructive")} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Net Wealth {includeCGT ? "(if sold)" : "(holding)"}
                </p>
                <p className={cn("text-3xl md:text-4xl font-bold", netWealth >= 0 ? "text-success" : "text-destructive")}>
                  {netWealth >= 0 ? formatCurrency(netWealth) : `-${formatCurrency(Math.abs(netWealth))}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {includeCGT ? "Net Proceeds − Cash Invested (all properties)" : "Equity − Cash Invested (all properties)"}
                </p>
              </div>
            </div>
            {includeCGT && (
              <div className="flex gap-4">
                <div className="p-4 rounded-lg bg-background/80 border border-border/50 text-center min-w-[130px]">
                  <p className="text-xs text-muted-foreground mb-1">Net Proceeds</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(summary.totalNetProceedsIfSold)}</p>
                  <p className="text-xs text-muted-foreground">If all sold</p>
                </div>
                <div className="p-4 rounded-lg bg-background/80 border border-border/50 text-center min-w-[110px]">
                  <p className="text-xs text-muted-foreground mb-1">Total CGT</p>
                  <p className="text-xl font-bold text-warning">{formatCurrency(summary.totalCGTPayable)}</p>
                  <p className="text-xs text-muted-foreground">If all sold</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-muted-foreground">Total Loan Balance</span>
            <span className="font-medium">{formatCurrency(summary.totalLoanBalance)}</span>
          </div>
          <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-muted-foreground">Total Cash Invested</span>
            <span className="font-medium text-muted-foreground">{formatCurrency(summary.totalCashInvested)}</span>
          </div>
          <div className="flex justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-muted-foreground">Combined LVR</span>
            <span className="font-medium">
              {summary.totalCurrentValue > 0 ? ((summary.totalLoanBalance / summary.totalCurrentValue) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}