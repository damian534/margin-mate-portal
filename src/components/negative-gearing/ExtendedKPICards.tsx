import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, Gavel, Percent, Home, Users } from "lucide-react";

interface KPIData { daysOnMarket: number; auctionClearance: number; rentalYield: number; vacancyRate: number; ownerOccupierRatio: number; populationGrowth: number; }

export function ExtendedKPICards({ data }: { data: KPIData }) {
  const kpis = [
    { label: "Days on Market", value: data.daysOnMarket.toString(), subtitle: data.daysOnMarket < 30 ? "Fast-moving" : data.daysOnMarket < 60 ? "Moderate" : "Slow", icon: <Clock className="h-5 w-5" />, color: data.daysOnMarket < 30 ? "text-green-600" : data.daysOnMarket < 60 ? "text-yellow-600" : "text-red-600" },
    { label: "Auction Clearance", value: `${data.auctionClearance}%`, subtitle: data.auctionClearance >= 70 ? "Strong" : data.auctionClearance >= 50 ? "Moderate" : "Weak", icon: <Gavel className="h-5 w-5" />, color: data.auctionClearance >= 70 ? "text-green-600" : data.auctionClearance >= 50 ? "text-yellow-600" : "text-red-600" },
    { label: "Rental Yield", value: `${data.rentalYield.toFixed(1)}%`, subtitle: data.rentalYield >= 4 ? "High yield" : data.rentalYield >= 3 ? "Moderate" : "Growth focus", icon: <Percent className="h-5 w-5" />, color: data.rentalYield >= 4 ? "text-green-600" : data.rentalYield >= 3 ? "text-yellow-600" : "text-muted-foreground" },
    { label: "Vacancy Rate", value: `${data.vacancyRate.toFixed(1)}%`, subtitle: data.vacancyRate < 2 ? "Very tight" : data.vacancyRate < 3 ? "Tight" : "Balanced", icon: <Home className="h-5 w-5" />, color: data.vacancyRate < 2 ? "text-green-600" : data.vacancyRate < 3 ? "text-yellow-600" : "text-red-600" },
    { label: "Owner-Occupier %", value: `${data.ownerOccupierRatio}%`, subtitle: data.ownerOccupierRatio >= 60 ? "Stable base" : "Investor heavy", icon: <Users className="h-5 w-5" />, color: "text-foreground" },
    { label: "Population Growth", value: `${data.populationGrowth >= 0 ? "+" : ""}${data.populationGrowth.toFixed(1)}%`, subtitle: "Annual", icon: <Activity className="h-5 w-5" />, color: data.populationGrowth >= 1.5 ? "text-green-600" : data.populationGrowth >= 0 ? "text-yellow-600" : "text-red-600" },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Key Market Indicators</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi, index) => (
            <div key={index} className="bg-muted/50 rounded-lg p-4 text-center border border-border/50 hover:border-primary/30 transition-colors">
              <div className="flex justify-center mb-2 text-primary">{kpi.icon}</div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              <p className={`text-xs mt-1 ${kpi.color}`}>{kpi.subtitle}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}