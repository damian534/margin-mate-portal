import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { parseISO, format } from 'date-fns';
import type { Settlement } from '@/hooks/useSettlements';

const COLORS = ['hsl(2, 76%, 48%)', 'hsl(0, 0%, 45%)', 'hsl(152, 60%, 42%)', 'hsl(38, 92%, 50%)', 'hsl(210, 60%, 50%)', 'hsl(280, 50%, 55%)', 'hsl(170, 50%, 45%)'];

export function SettlementCharts({ settlements }: { settlements: Settlement[] }) {
  const settled = settlements.filter(s => s.status === 'settled');

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    settled.forEach(s => {
      const key = format(parseISO(s.settlement_date), 'MMM yyyy');
      map[key] = (map[key] || 0) + Number(s.loan_amount);
    });
    return Object.entries(map).map(([month, volume]) => ({ month, volume })).slice(-12);
  }, [settled]);

  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    const labels: Record<string, string> = { purchase: 'Purchase', refinance: 'Refinance', top_up: 'Top Up', purchase_refinance: 'P&R' };
    settled.forEach(s => {
      const t = s.application_type || 'Other';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([type, count]) => ({ name: labels[type] || type, value: count }));
  }, [settled]);

  const lenderData = useMemo(() => {
    const map: Record<string, number> = {};
    settled.forEach(s => { if (s.lender) map[s.lender] = (map[s.lender] || 0) + Number(s.loan_amount); });
    return Object.entries(map).map(([lender, volume]) => ({ lender, volume })).sort((a, b) => b.volume - a.volume).slice(0, 7);
  }, [settled]);

  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    settled.forEach(s => { if (s.lead_source) map[s.lead_source] = (map[s.lead_source] || 0) + 1; });
    return Object.entries(map).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 7);
  }, [settled]);

  const chartConfig = { volume: { label: 'Volume', color: 'hsl(2, 76%, 48%)' }, count: { label: 'Count', color: 'hsl(2, 76%, 48%)' } };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Settled Volume</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="volume" fill="hsl(2, 76%, 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Loan Type Breakdown</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Lender Distribution</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={lenderData} layout="vertical">
              <XAxis type="number" tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="lender" width={80} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="volume" fill="hsl(0, 0%, 35%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Lead Source Breakdown</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={sourceData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="source" width={100} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(152, 60%, 42%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
