import { TrendingUp, TrendingDown, AlertCircle, Building2, MapPin, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SuburbAnalysis } from "@/lib/suburbAnalysis";
import { formatCurrency } from "@/lib/negative-gearing/calculations";

interface SuburbAnalysisCardProps {
  analysis: SuburbAnalysis;
  onApplyRate: (rate: number) => void;
}

export function SuburbAnalysisCard({ analysis, onApplyRate }: SuburbAnalysisCardProps) {
  const confidenceColors = {
    low: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    medium: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    high: "bg-green-500/10 text-green-600 border-green-500/20",
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-semibold text-foreground">{analysis.suburb}, {analysis.state}</h4>
              <p className="text-xs text-muted-foreground">AI-Powered Analysis</p>
            </div>
          </div>
          <Badge variant="outline" className={confidenceColors[analysis.confidence]}>
            {analysis.confidence.charAt(0).toUpperCase() + analysis.confidence.slice(1)} Confidence
          </Badge>
        </div>

        <div className="p-3 bg-background rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recommended Growth Rate</p>
              <p className="text-2xl font-bold text-primary">{analysis.recommendedGrowthRate.toFixed(1)}% <span className="text-sm font-normal text-muted-foreground">p.a.</span></p>
            </div>
            <button onClick={() => onApplyRate(analysis.recommendedGrowthRate)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              <CheckCircle className="h-4 w-4" />Apply Rate
            </button>
          </div>
        </div>

        {(analysis.medianHousePrice || analysis.medianUnitPrice) && (
          <div className="grid grid-cols-2 gap-3">
            {analysis.medianHousePrice && (
              <div className="p-2 bg-background rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 mb-1"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><p className="text-xs text-muted-foreground">Median House</p></div>
                <p className="font-semibold text-foreground">{formatCurrency(analysis.medianHousePrice)}</p>
              </div>
            )}
            {analysis.medianUnitPrice && (
              <div className="p-2 bg-background rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5 mb-1"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><p className="text-xs text-muted-foreground">Median Unit</p></div>
                <p className="font-semibold text-foreground">{formatCurrency(analysis.medianUnitPrice)}</p>
              </div>
            )}
          </div>
        )}

        {(analysis.historicalGrowth.fiveYear || analysis.historicalGrowth.tenYear) && (
          <div className="grid grid-cols-2 gap-3">
            {analysis.historicalGrowth.fiveYear !== null && (
              <div className="p-2 bg-background rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">5-Year Growth</p>
                <div className="flex items-center gap-1">
                  {analysis.historicalGrowth.fiveYear >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                  <p className="font-semibold text-foreground">{analysis.historicalGrowth.fiveYear.toFixed(1)}% p.a.</p>
                </div>
              </div>
            )}
            {analysis.historicalGrowth.tenYear !== null && (
              <div className="p-2 bg-background rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">10-Year Growth</p>
                <div className="flex items-center gap-1">
                  {analysis.historicalGrowth.tenYear >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                  <p className="font-semibold text-foreground">{analysis.historicalGrowth.tenYear.toFixed(1)}% p.a.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <h5 className="text-sm font-medium text-foreground">Market Analysis</h5>
          <p className="text-sm text-muted-foreground">{analysis.marketAnalysis}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.growthDrivers.length > 0 && (
            <div className="space-y-1.5">
              <h5 className="text-sm font-medium text-foreground flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-green-600" />Growth Drivers</h5>
              <ul className="text-xs text-muted-foreground space-y-1">
                {analysis.growthDrivers.map((driver, i) => (<li key={i} className="flex items-start gap-1.5"><span className="text-green-600">•</span>{driver}</li>))}
              </ul>
            </div>
          )}
          {analysis.risks.length > 0 && (
            <div className="space-y-1.5">
              <h5 className="text-sm font-medium text-foreground flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-amber-600" />Key Risks</h5>
              <ul className="text-xs text-muted-foreground space-y-1">
                {analysis.risks.map((risk, i) => (<li key={i} className="flex items-start gap-1.5"><span className="text-amber-600">•</span>{risk}</li>))}
              </ul>
            </div>
          )}
        </div>

        {analysis.comparableSuburbs.length > 0 && (
          <div className="space-y-1.5">
            <h5 className="text-sm font-medium text-foreground">Comparable Suburbs</h5>
            <div className="flex flex-wrap gap-2">
              {analysis.comparableSuburbs.map((sub, i) => (<Badge key={i} variant="secondary" className="text-xs">{sub.name}: {sub.growth.toFixed(1)}%</Badge>))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground italic">Source: {analysis.dataSource}</p>
      </CardContent>
    </Card>
  );
}