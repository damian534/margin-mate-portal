import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Columns2 } from "lucide-react";
import { EngineResults, formatCurrency, formatPercent2 } from "@/lib/investment/engine";
import { cn } from "@/lib/utils";

export function ComparisonPanel({ established, newBuild, purchasePrice, growthRate, weeklyRent }: {
  established: EngineResults; newBuild: EngineResults;
  purchasePrice: number; growthRate: number; weeklyRent: number;
}) {
  const yieldPct = purchasePrice > 0 ? ((weeklyRent * 52) / purchasePrice) * 100 : 0;
  const rows: { label: string; a: string; b: string; highlight?: boolean }[] = [
    { label: "Purchase price", a: formatCurrency(purchasePrice), b: formatCurrency(purchasePrice) },
    { label: "Capital growth assumption", a: `${growthRate.toFixed(2)}%`, b: `${growthRate.toFixed(2)}%` },
    { label: "Gross rental yield", a: formatPercent2(yieldPct), b: formatPercent2(yieldPct) },
    { label: "Total tax benefits received", a: formatCurrency(established.totalTaxBenefits), b: formatCurrency(newBuild.totalTaxBenefits) },
    { label: "Carried-forward losses before sale", a: formatCurrency(established.sale.carriedForwardLossesBeforeSale), b: formatCurrency(newBuild.sale.carriedForwardLossesBeforeSale) },
    { label: "Estimated CGT", a: formatCurrency(established.sale.cgt.cgtPayable), b: formatCurrency(newBuild.sale.cgt.cgtPayable) },
    { label: "Total cash contributed", a: formatCurrency(established.totalInvestorCashContributed), b: formatCurrency(newBuild.totalInvestorCashContributed) },
    { label: "Net sale proceeds", a: formatCurrency(established.netCashReceivedAfterSale), b: formatCurrency(newBuild.netCashReceivedAfterSale) },
    { label: "True net wealth created", a: formatCurrency(established.trueNetWealthCreated), b: formatCurrency(newBuild.trueNetWealthCreated), highlight: true },
    { label: "Investor IRR", a: formatPercent2(established.investorIRR * 100), b: formatPercent2(newBuild.investorIRR * 100), highlight: true },
  ];

  const diff = newBuild.trueNetWealthCreated - established.trueNetWealthCreated;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Columns2 className="h-5 w-5 text-primary" /> Established vs New Build (identical assumptions)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-left font-medium text-muted-foreground"> </th>
                <th className="py-2 text-right font-medium">Established</th>
                <th className="py-2 text-right font-medium">New Build</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.label} className={cn("border-b border-border/40", r.highlight && "font-semibold")}>
                  <td className="py-2 text-muted-foreground">{r.label}</td>
                  <td className="py-2 text-right tabular-nums">{r.a}</td>
                  <td className="py-2 text-right tabular-nums">{r.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">
          On these assumptions the new build produces{" "}
          <span className={cn("font-semibold", diff >= 0 ? "text-primary" : "text-destructive")}>
            {formatCurrency(Math.abs(diff))} {diff >= 0 ? "more" : "less"}
          </span>{" "}
          net wealth than the established property, driven mainly by the timing of tax benefits versus quarantined losses.
        </p>
      </CardContent>
    </Card>
  );
}
