import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { EngineResults, formatCurrency, formatPercent2 } from "@/lib/investment/engine";
import { ShowCalculation } from "./ShowCalculation";

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm border-b border-border/40 last:border-0">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function SaleYearTable({ results, purchasePrice, growthRate }: {
  results: EngineResults; purchasePrice: number; growthRate: number;
}) {
  const s = results.sale;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" /> Sale Year Reconciliation (Year {s.saleYear})
        </CardTitle>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="secondary">CGT method: {s.cgt.method === "discount" ? "50% CGT discount" : "Indexation (post-reform)"}</Badge>
          {s.cgt.minimumRateApplied && <Badge variant="outline">30% minimum CGT rate applied</Badge>}
          <Badge variant="outline">{results.effectiveCategory === "grandfathered" ? "Grandfathered – existing rules" : results.effectiveCategory === "new-build" ? "New build" : "Established – post-reform rules"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <Line label="Estimated property sale price" value={formatCurrency(s.salePrice)} />
        <Line label="Less selling costs" value={`− ${formatCurrency(s.totalSellingCosts)}`} muted />
        <Line label="CGT cost base (incl. improvements, less capital works claimed)" value={formatCurrency(s.costBase)} muted />
        <Line label="Nominal capital gain" value={formatCurrency(s.cgt.nominalGain)} />
        <Line label="Inflation / indexation adjustment" value={`− ${formatCurrency(s.cgt.inflationAdjustment)}`} muted />
        <Line label="Real capital gain" value={formatCurrency(s.cgt.realGain)} />
        <Line label="Less eligible carried-forward property losses" value={`− ${formatCurrency(s.carriedForwardLossesUsedAtSale)}`} muted />
        <Line label="Net taxable capital gain" value={formatCurrency(s.cgt.netTaxableGain)} />
        <Line label="Estimated capital gains tax" value={formatCurrency(s.cgt.cgtPayable)} />
        <Line label="Unused carried-forward losses" value={formatCurrency(s.unusedLossesAtSale)} muted />
        <Line label="Outstanding loan repaid" value={`− ${formatCurrency(s.outstandingLoan)}`} muted />
        <Line label="Net sale proceeds" value={formatCurrency(s.netSaleProceeds)} />
        <Line label="Total investor cash contributed" value={formatCurrency(results.totalInvestorCashContributed)} muted />
        <Line label="Cumulative cashflow received" value={formatCurrency(results.cumulativeNetCashflowReceived)} muted />
        <Line label="TRUE NET WEALTH CREATED" value={formatCurrency(results.trueNetWealthCreated)} />
        <Line label="Investor IRR" value={isFinite(results.investorIRR) ? formatPercent2(results.investorIRR * 100) : "n/a"} />

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3">
          <div><p className="text-xs text-muted-foreground">50% discount method CGT</p><p className="font-semibold">{formatCurrency(s.discountMethodCgt)}</p></div>
          <div><p className="text-xs text-muted-foreground">Indexation method CGT</p><p className="font-semibold">{formatCurrency(s.indexationMethodCgt)}</p></div>
          <div><p className="text-xs text-muted-foreground">Estimated difference</p><p className="font-semibold">{formatCurrency(s.methodDifference)}</p></div>
        </div>
        {results.effectiveCategory === "established" && (
          <p className="text-xs text-muted-foreground pt-2">
            Established property acquired after budget night must use the indexation regime for post-1 July 2027 gains — the discount comparison is shown for reference only.
          </p>
        )}

        <ShowCalculation lines={[
          `Estimated sale price = ${formatCurrency(purchasePrice)} × (1 + ${growthRate}%) ^ ${s.saleYear} = ${formatCurrency(s.salePrice)}`,
          `Gross capital gain = sale price − selling costs − cost base`,
          `Cost base = purchase price + acquisition costs + capital improvements − Div 43 claimed (${formatCurrency(s.capitalWorksClaimed)})`,
          `Real gain = nominal gain − indexation adjustment`,
          `Net taxable gain = (real gain − carried-forward losses) after any applicable discount`,
          `CGT = tax with the gain − tax without the gain, subject to the 30% minimum rate on real gains`,
        ]} />
      </CardContent>
    </Card>
  );
}
