import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PriceDataPoint { year: string; housePrice: number; unitPrice: number; }

const formatCurrency = (value: number) => value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : `$${(value / 1000).toFixed(0)}K`;

export function HistoricalPriceChart({ data, propertyType }: { data: PriceDataPoint[]; propertyType: "house" | "unit" }) {
  const key = propertyType === "house" ? "housePrice" : "unitPrice";
  const currentPrice = data[data.length - 1]?.[key] || 0;
  const startPrice = data[0]?.[key] || 0;
  const totalGrowth = startPrice > 0 ? ((currentPrice - startPrice) / startPrice) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Historical Price Trend</div>
          <div className="text-right"><p className="text-sm font-normal text-muted-foreground">10-Year Growth</p><p className={`text-lg font-bold ${totalGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>{totalGrowth >= 0 ? "+" : ""}{totalGrowth.toFixed(1)}%</p></div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="houseGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                <linearGradient id="unitGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} className="text-muted-foreground" width={60} />
              <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === "housePrice" ? "House Median" : "Unit Median"]} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Legend formatter={(value) => (value === "housePrice" ? "House" : "Unit")} />
              <Area type="monotone" dataKey="housePrice" stroke="hsl(var(--primary))" fill="url(#houseGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="unitPrice" stroke="hsl(var(--muted-foreground))" fill="url(#unitGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}