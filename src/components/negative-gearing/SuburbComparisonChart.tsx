import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

interface ComparableSuburb { name: string; medianPrice: number; growthRate: number; yield: number; isSubject?: boolean; }

export function SuburbComparisonChart({ subjectSuburb, comparables }: { subjectSuburb: string; comparables: ComparableSuburb[] }) {
  const chartData = comparables.map((s) => ({ name: s.name, growth: s.growthRate, yield: s.yield, price: s.medianPrice, isSubject: s.isSubject || s.name === subjectSuburb }));

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Suburb Growth Comparison</CardTitle></CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} className="text-muted-foreground" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} className="text-muted-foreground" />
              <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === "growth" ? "Growth Rate" : "Rental Yield"]} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Legend />
              <Bar dataKey="growth" name="Growth Rate" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.isSubject ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} />))}
              </Bar>
              <Bar dataKey="yield" name="Rental Yield" fill="hsl(142.1 76.2% 36.3%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary" /><span className="text-muted-foreground">{subjectSuburb} (Subject)</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-muted-foreground" /><span className="text-muted-foreground">Comparable Suburbs</span></div>
        </div>
      </CardContent>
    </Card>
  );
}