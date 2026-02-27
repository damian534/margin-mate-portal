import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface SupplyDemandDataPoint { label: string; supply: number; demand: number; }

export function SupplyDemandChart({ data, marketCondition }: { data: SupplyDemandDataPoint[]; marketCondition: "seller" | "balanced" | "buyer" }) {
  const badges = { seller: { label: "Seller's Market", color: "bg-green-100 text-green-700" }, buyer: { label: "Buyer's Market", color: "bg-red-100 text-red-700" }, balanced: { label: "Balanced Market", color: "bg-yellow-100 text-yellow-700" } };
  const badge = badges[marketCondition];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Supply vs Demand</div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>{badge.label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Legend />
              <Bar dataKey="supply" name="Listings (Supply)" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="demand" name="Buyer Interest (Demand)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}