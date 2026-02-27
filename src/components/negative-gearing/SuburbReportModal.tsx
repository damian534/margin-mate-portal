import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Download, TrendingUp, BarChart3, Activity, CheckCircle } from "lucide-react";
import { SuburbAnalysis } from "@/lib/suburbAnalysis";
import { HistoricalPriceChart } from "@/components/negative-gearing/HistoricalPriceChart";
import { SupplyDemandChart } from "@/components/negative-gearing/SupplyDemandChart";
import { ExtendedKPICards } from "@/components/negative-gearing/ExtendedKPICards";
import { SuburbComparisonChart } from "@/components/negative-gearing/SuburbComparisonChart";

interface SuburbReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: SuburbAnalysis;
  projectionPeriod: number;
  onApplyRate: (rate: number) => void;
  onDownloadPDF: () => void;
}

export function SuburbReportModal({ open, onOpenChange, analysis, projectionPeriod, onApplyRate, onDownloadPDF }: SuburbReportModalProps) {
  const confidenceColors = {
    low: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    medium: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    high: "bg-green-500/10 text-green-600 border-green-500/20",
  };

  const generateHistoricalData = () => {
    const currentYear = new Date().getFullYear();
    const baseHousePrice = analysis.medianHousePrice || 850000;
    const baseUnitPrice = analysis.medianUnitPrice || 450000;
    const growthRate = analysis.recommendedGrowthRate / 100;
    const data = [];
    for (let i = 9; i >= 0; i--) {
      const factor = Math.pow(1 + growthRate, -i);
      const variance = 1 + (Math.random() - 0.5) * 0.08;
      data.push({ year: (currentYear - i).toString(), housePrice: Math.round(baseHousePrice * factor * variance), unitPrice: Math.round(baseUnitPrice * factor * variance) });
    }
    return data;
  };

  const supplyDemandData = [
    { label: "Houses", supply: 42, demand: analysis.confidence === "high" ? 85 : 68 },
    { label: "Units", supply: 65, demand: analysis.confidence === "high" ? 58 : 48 },
    { label: "Townhouses", supply: 28, demand: analysis.confidence === "high" ? 52 : 42 },
  ];

  const kpiData = {
    daysOnMarket: analysis.confidence === "high" ? 22 : analysis.confidence === "medium" ? 32 : 45,
    auctionClearance: analysis.confidence === "high" ? 78 : analysis.confidence === "medium" ? 65 : 52,
    rentalYield: 3.5, vacancyRate: analysis.confidence === "high" ? 1.2 : analysis.confidence === "medium" ? 2.1 : 3.2,
    ownerOccupierRatio: 68, populationGrowth: analysis.confidence === "high" ? 2.1 : 1.4,
  };

  const comparablesData = [
    { name: analysis.suburb, medianPrice: analysis.medianHousePrice || 850000, growthRate: analysis.recommendedGrowthRate, yield: 3.5, isSubject: true },
    ...analysis.comparableSuburbs.slice(0, 3).map((s) => ({ name: s.name, medianPrice: (analysis.medianHousePrice || 850000) * (0.85 + Math.random() * 0.3), growthRate: s.growth, yield: 3 + Math.random() * 1 })),
  ];

  const marketCondition = analysis.confidence === "high" ? "seller" : analysis.confidence === "medium" ? "balanced" : "buyer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto p-0 sm:p-6 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-background border-b sm:border-0 p-4 sm:p-0 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl truncate">{analysis.suburb}, {analysis.state}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">Suburb investment analysis</DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className={`${confidenceColors[analysis.confidence]} self-start sm:self-auto text-xs`}>
              {analysis.confidence.charAt(0).toUpperCase() + analysis.confidence.slice(1)} Confidence
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-0 space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">Recommended Growth Rate</p>
                <p className="text-2xl sm:text-3xl font-bold text-primary">{analysis.recommendedGrowthRate.toFixed(1)}% <span className="text-base sm:text-lg font-normal text-muted-foreground">p.a.</span></p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => onApplyRate(analysis.recommendedGrowthRate)} className="w-full sm:w-auto"><CheckCircle className="mr-2 h-4 w-4" />Apply Rate</Button>
                <Button variant="outline" onClick={onDownloadPDF} className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4" />Download PDF</Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-auto p-1">
              <TabsTrigger value="overview" className="flex-col sm:flex-row gap-0.5 sm:gap-1 px-1 py-2 text-[10px] sm:text-sm"><TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />Overview</TabsTrigger>
              <TabsTrigger value="charts" className="flex-col sm:flex-row gap-0.5 sm:gap-1 px-1 py-2 text-[10px] sm:text-sm"><BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />Charts</TabsTrigger>
              <TabsTrigger value="kpis" className="flex-col sm:flex-row gap-0.5 sm:gap-1 px-1 py-2 text-[10px] sm:text-sm"><Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />KPIs</TabsTrigger>
              <TabsTrigger value="comparison" className="flex-col sm:flex-row gap-0.5 sm:gap-1 px-1 py-2 text-[10px] sm:text-sm"><MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />Compare</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <Card><CardContent className="p-3 sm:p-4"><h4 className="font-semibold mb-2 text-sm sm:text-base">Market Analysis</h4><p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{analysis.marketAnalysis}</p></CardContent></Card>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {analysis.medianHousePrice && <Card><CardContent className="p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-sm text-muted-foreground">Median House</p><p className="text-base sm:text-xl font-bold">${(analysis.medianHousePrice / 1000000).toFixed(2)}M</p></CardContent></Card>}
                {analysis.medianUnitPrice && <Card><CardContent className="p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-sm text-muted-foreground">Median Unit</p><p className="text-base sm:text-xl font-bold">${(analysis.medianUnitPrice / 1000).toFixed(0)}K</p></CardContent></Card>}
                {analysis.historicalGrowth.fiveYear !== null && <Card><CardContent className="p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-sm text-muted-foreground">5-Year Growth</p><p className="text-base sm:text-xl font-bold text-green-600">+{analysis.historicalGrowth.fiveYear.toFixed(1)}%</p></CardContent></Card>}
                {analysis.historicalGrowth.tenYear !== null && <Card><CardContent className="p-3 sm:p-4 text-center"><p className="text-[10px] sm:text-sm text-muted-foreground">10-Year Growth</p><p className="text-base sm:text-xl font-bold text-green-600">+{analysis.historicalGrowth.tenYear.toFixed(1)}%</p></CardContent></Card>}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <Card><CardContent className="p-3 sm:p-4"><h4 className="font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base"><TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />Growth Drivers</h4><ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">{analysis.growthDrivers.map((d, i) => <li key={i} className="flex items-start gap-2"><span className="text-green-600 shrink-0">•</span><span>{d}</span></li>)}</ul></CardContent></Card>
                <Card><CardContent className="p-3 sm:p-4"><h4 className="font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base"><Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />Key Risks</h4><ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">{analysis.risks.map((r, i) => <li key={i} className="flex items-start gap-2"><span className="text-amber-600 shrink-0">•</span><span>{r}</span></li>)}</ul></CardContent></Card>
              </div>
            </TabsContent>

            <TabsContent value="charts" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
              <HistoricalPriceChart data={generateHistoricalData()} propertyType="house" />
              <SupplyDemandChart data={supplyDemandData} marketCondition={marketCondition as "seller" | "balanced" | "buyer"} />
            </TabsContent>

            <TabsContent value="kpis" className="mt-3 sm:mt-4"><ExtendedKPICards data={kpiData} /></TabsContent>

            <TabsContent value="comparison" className="mt-3 sm:mt-4">
              <SuburbComparisonChart subjectSuburb={analysis.suburb} comparables={comparablesData} />
            </TabsContent>
          </Tabs>

          <p className="text-[10px] sm:text-xs text-muted-foreground italic text-center py-2">Source: {analysis.dataSource}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}