import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Scale, TrendingUp, ThumbsUp, ThumbsDown, Minus, Home, LineChart } from "lucide-react";
import { PropertyData, PropertyResults } from "@/lib/advisor/portfolioTypes";
import { calculateHoldVsSell } from "@/lib/advisor/portfolioCalculations";
import { formatCurrency } from "@/lib/advisor/calculations";
import { InputField } from "./InputField";
import { cn } from "@/lib/utils";

interface HoldVsSellSectionProps {
  property: PropertyData;
  results: PropertyResults;
  applicant1Income: number;
  applicant2Income: number;
  isJointOwnership: boolean;
  applicant1OwnershipPercent: number;
}

export function HoldVsSellSection({
  property, results, applicant1Income, applicant2Income, isJointOwnership, applicant1OwnershipPercent,
}: HoldVsSellSectionProps) {
  const [comparisonYears, setComparisonYears] = useState(10);
  const [etfReturnRate, setEtfReturnRate] = useState(9.5);
  
  const analysis = calculateHoldVsSell(property, results, comparisonYears, etfReturnRate, applicant1Income, applicant2Income, isJointOwnership, applicant1OwnershipPercent);

  const RecommendationIcon = { hold: ThumbsUp, sell: ThumbsDown, neutral: Minus }[analysis.recommendation];
  const recommendationColor = { hold: "text-success", sell: "text-warning", neutral: "text-muted-foreground" }[analysis.recommendation];
  const recommendationBg = { hold: "bg-success/10 border-success/30", sell: "bg-warning/10 border-warning/30", neutral: "bg-muted/30 border-border" }[analysis.recommendation];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Scale className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle className="text-lg font-semibold">Hold vs Sell & Reinvest</CardTitle>
              <p className="text-sm text-muted-foreground">Compare keeping the property vs selling and investing in ETFs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Compare over:</Label>
            <Select value={comparisonYears.toString()} onValueChange={(v) => setComparisonYears(parseInt(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20, 25, 30].map((years) => (
                  <SelectItem key={years} value={years.toString()}>{years} years</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
          <LineChart className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <InputField label="ETF/Index Fund Return Rate" id="etf-return-rate" value={etfReturnRate} onChange={setEtfReturnRate} suffix="% p.a." helperText="ASX200 historical average: ~9.5%" min={0} max={20} step={0.5} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-lg border-2 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-primary/20"><Home className="h-5 w-5 text-primary" /></div>
              <div>
                <h3 className="font-semibold">Continue Holding</h3>
                <p className="text-xs text-muted-foreground">Keep property for {comparisonYears} more years</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Future Property Value</span><span className="font-medium">{formatCurrency(analysis.holdPropertyValue)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Future Equity</span><span className="font-medium text-primary">{formatCurrency(analysis.holdEquity)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Additional Shortfall</span><span className="font-medium text-destructive">-{formatCurrency(analysis.holdTotalShortfall)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CGT if Sold Then</span><span className="font-medium text-warning">{formatCurrency(analysis.holdCGT)}</span></div>
              <div className="border-t border-border/50 pt-3">
                <div className="flex justify-between"><span className="font-medium">Net Proceeds</span><span className="font-bold text-primary">{formatCurrency(analysis.holdNetProceeds)}</span></div>
              </div>
              <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Net Wealth Created</span>
                  <span className={cn("text-lg font-bold", analysis.holdNetWealth >= 0 ? "text-success" : "text-destructive")}>
                    {analysis.holdNetWealth >= 0 ? '+' : ''}{formatCurrency(analysis.holdNetWealth)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg border-2 border-success/30 bg-success/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-success/20"><TrendingUp className="h-5 w-5 text-success" /></div>
              <div>
                <h3 className="font-semibold">Sell Now & Reinvest</h3>
                <p className="text-xs text-muted-foreground">Invest proceeds in ETFs at {etfReturnRate}% p.a.</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Net Proceeds Today</span><span className="font-medium">{formatCurrency(analysis.sellNetProceeds)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Monthly Contributions</span><span className="font-medium">{formatCurrency(results.afterTaxMonthlyShortfall)}/mo</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Investment Growth</span><span className="font-medium text-success">+{formatCurrency(analysis.reinvestmentGrowth)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CGT on ETF</span><span className="font-medium text-muted-foreground">Not calculated*</span></div>
              <div className="border-t border-border/50 pt-3">
                <div className="flex justify-between"><span className="font-medium">Final Portfolio Value</span><span className="font-bold text-success">{formatCurrency(analysis.reinvestmentFinalValue)}</span></div>
              </div>
              <div className="p-3 rounded-lg bg-background/80 border border-border/50">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Investment Growth</span>
                  <span className={cn("text-lg font-bold", analysis.reinvestmentNetWealth >= 0 ? "text-success" : "text-destructive")}>
                    +{formatCurrency(analysis.reinvestmentNetWealth)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn("p-6 rounded-lg border-2", recommendationBg)}>
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-full", recommendationBg)}>
              <RecommendationIcon className={cn("h-6 w-6", recommendationColor)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-lg">
                  {analysis.recommendation === 'hold' && 'Continue Holding'}
                  {analysis.recommendation === 'sell' && 'Consider Selling'}
                  {analysis.recommendation === 'neutral' && 'Either Strategy Works'}
                </h3>
                {analysis.holdAdvantage !== 0 && (
                  <Badge variant="outline" className={cn("text-xs", recommendationColor)}>
                    {analysis.holdAdvantage > 0 ? 'Hold' : 'Sell'} advantage: {formatCurrency(Math.abs(analysis.holdAdvantage))}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{analysis.reasoning}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          *ETF comparison does not include CGT on investment gains. Actual returns may vary. This is a simplified comparison and does not constitute financial advice.
        </p>
      </CardContent>
    </Card>
  );
}