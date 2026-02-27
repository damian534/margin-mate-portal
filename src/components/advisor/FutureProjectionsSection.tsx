import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { PropertyData, PropertyResults, FutureProjection } from "@/lib/advisor/portfolioTypes";
import { calculateFutureProjections } from "@/lib/advisor/portfolioCalculations";
import { formatCurrency } from "@/lib/advisor/calculations";
import { cn } from "@/lib/utils";

interface FutureProjectionsSectionProps {
  property: PropertyData;
  results: PropertyResults;
  applicant1Income: number;
  applicant2Income: number;
  isJointOwnership: boolean;
  applicant1OwnershipPercent: number;
}

export function FutureProjectionsSection({
  property, results, applicant1Income, applicant2Income, isJointOwnership, applicant1OwnershipPercent,
}: FutureProjectionsSectionProps) {
  const [projectionYears, setProjectionYears] = useState(10);
  const [includeCGT, setIncludeCGT] = useState(false);
  
  const projections = calculateFutureProjections(property, results, projectionYears, applicant1Income, applicant2Income, isJointOwnership, applicant1OwnershipPercent);
  const currentYear = new Date().getFullYear();
  const finalProjection = projections[projections.length - 1];
  const getNetWealth = (proj: FutureProjection) => includeCGT ? proj.netWealthIfSold : proj.netWealthHolding;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Continue Holding Projection</CardTitle>
              <p className="text-sm text-muted-foreground">Based on {results.annualizedGrowth.toFixed(1)}% historical growth rate</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Project forward:</Label>
            <Select value={projectionYears.toString()} onValueChange={(v) => setProjectionYears(parseInt(v))}>
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
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
          <div>
            <p className="text-sm font-medium">Include CGT & Selling Costs</p>
            <p className="text-xs text-muted-foreground">
              {includeCGT ? "Showing 'if sold' scenario with CGT and selling costs deducted" : "Showing holding scenario - equity minus costs invested"}
            </p>
          </div>
          <Switch checked={includeCGT} onCheckedChange={setIncludeCGT} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">In {projectionYears} Years</p>
            </div>
            <p className="text-lg font-bold">{currentYear + projectionYears}</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Projected Value</p>
            <p className="text-lg font-bold text-success">{formatCurrency(finalProjection?.propertyValue || 0)}</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Projected Equity</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(finalProjection?.equity || 0)}</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Net Wealth {includeCGT ? "(if sold)" : "(holding)"}</p>
            <p className={cn("text-lg font-bold", getNetWealth(finalProjection || { netWealthHolding: 0, netWealthIfSold: 0 } as FutureProjection) >= 0 ? "text-success" : "text-destructive")}>
              {formatCurrency(getNetWealth(finalProjection || { netWealthHolding: 0, netWealthIfSold: 0 } as FutureProjection))}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Year</TableHead>
                  <TableHead className="text-right font-semibold">Property Value</TableHead>
                  <TableHead className="text-right font-semibold">Loan Balance</TableHead>
                  <TableHead className="text-right font-semibold">Equity</TableHead>
                  <TableHead className="text-right font-semibold">Cash Invested</TableHead>
                  {includeCGT && (
                    <>
                      <TableHead className="text-right font-semibold">CGT if Sold</TableHead>
                      <TableHead className="text-right font-semibold">Net Proceeds</TableHead>
                    </>
                  )}
                  <TableHead className="text-right font-semibold">Net Wealth {includeCGT ? "(if sold)" : ""}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projections.map((proj, index) => {
                  const isNow = index === 0;
                  const isFinal = index === projections.length - 1;
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
                      <TableCell className="text-right">{formatCurrency(proj.propertyValue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(proj.loanBalance)}</TableCell>
                      <TableCell className="text-right text-primary font-medium">{formatCurrency(proj.equity)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(proj.totalCashInvested)}</TableCell>
                      {includeCGT && (
                        <>
                          <TableCell className="text-right text-warning">{formatCurrency(proj.cgtIfSold)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(proj.netProceedsIfSold)}</TableCell>
                        </>
                      )}
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

        <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground">
          <ArrowRight className="h-4 w-4 flex-shrink-0" />
          <span>
            If you continue holding for {projectionYears} years at {results.annualizedGrowth.toFixed(1)}% p.a. growth, 
            the property is projected to be worth <strong className="text-foreground">{formatCurrency(finalProjection?.propertyValue || 0)}</strong> with 
            <strong className={cn("ml-1", getNetWealth(finalProjection || { netWealthHolding: 0, netWealthIfSold: 0 } as FutureProjection) >= 0 ? "text-success" : "text-destructive")}>
              {formatCurrency(getNetWealth(finalProjection || { netWealthHolding: 0, netWealthIfSold: 0 } as FutureProjection))}
            </strong> net wealth{includeCGT ? " after CGT and costs" : " (equity minus costs invested)"}.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}