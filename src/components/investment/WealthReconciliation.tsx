import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Scale } from "lucide-react";
import { EngineResults, formatCurrency } from "@/lib/investment/engine";
import { ShowCalculation } from "./ShowCalculation";
import { cn } from "@/lib/utils";

function Row({ label, value, tone = "default", strong = false }: {
  label: string; value: number; tone?: "default" | "negative" | "positive"; strong?: boolean;
}) {
  const prefix = tone === "negative" ? "−" : tone === "positive" ? "+" : "";
  return (
    <div className={cn("flex items-center justify-between py-2 text-sm", strong && "text-base font-semibold")}>
      <span className={cn("text-muted-foreground", strong && "text-foreground")}>{label}</span>
      <span className={cn("font-medium tabular-nums",
        tone === "negative" && "text-destructive",
        tone === "positive" && "text-primary")}>
        {prefix}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

export function WealthReconciliation({ results }: { results: EngineResults }) {
  const s = results.sale;
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" /> Equity vs Wealth Reconciliation
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Gross equity is not wealth created. Every cost, tax and dollar you contributed is stripped out below.
        </p>
      </CardHeader>
      <CardContent>
        <Row label={`Property value in year ${s.saleYear}`} value={s.salePrice} />
        <Row label="Loan balance at sale" value={s.outstandingLoan} tone="negative" />
        <Separator />
        <Row label="Gross equity" value={results.grossEquityAtSale} strong />
        <Row label="Selling costs" value={s.totalSellingCosts} tone="negative" />
        <Row label="Estimated capital gains tax" value={s.cgt.cgtPayable} tone="negative" />
        <Separator />
        <Row label="Net cash received after sale" value={s.netSaleProceeds} strong />
        <Row label="Total investor cash contributed" value={results.totalInvestorCashContributed} tone="negative" />
        <Row label="Cumulative positive cashflow received" value={results.cumulativeNetCashflowReceived} tone="positive" />
        <Separator className="my-2" />
        <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
          <span className="font-semibold">TRUE NET WEALTH CREATED</span>
          <span className={cn("text-2xl font-bold tabular-nums",
            results.trueNetWealthCreated >= 0 ? "text-primary" : "text-destructive")}>
            {formatCurrency(results.trueNetWealthCreated)}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          In today's dollars (inflation adjusted): <span className="font-medium text-foreground">{formatCurrency(results.realWealthTodaysDollars)}</span>
        </p>
        <ShowCalculation lines={[
          `Net cash received from sale      ${formatCurrency(s.netSaleProceeds)}`,
          `+ Cumulative cashflow received   ${formatCurrency(results.cumulativeNetCashflowReceived)}`,
          `− Total investor cash contributed ${formatCurrency(results.totalInvestorCashContributed)}`,
          `= TRUE NET WEALTH CREATED        ${formatCurrency(results.trueNetWealthCreated)}`,
          ``,
          `Net sale proceeds = sale price − selling costs − loan balance − CGT`,
          `${formatCurrency(s.salePrice)} − ${formatCurrency(s.totalSellingCosts)} − ${formatCurrency(s.outstandingLoan)} − ${formatCurrency(s.cgt.cgtPayable)}`,
        ]} />
      </CardContent>
    </Card>
  );
}
