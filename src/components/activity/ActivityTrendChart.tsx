import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { BrokerActivity } from '@/hooks/useBrokerActivity';

export function ActivityTrendChart({ activities }: { activities: BrokerActivity[] }) {
  const chartData = useMemo(() =>
    activities.map(a => ({
      date: format(parseISO(a.activity_date), 'dd MMM'),
      meetings: a.meetings_held,
      calls: a.outbound_calls,
    }))
  , [activities]);

  const chartConfig = {
    meetings: { label: 'Meetings Held', color: 'hsl(var(--primary))' },
    calls: { label: 'Outbound Calls', color: 'hsl(var(--foreground))' },
  };

  if (!chartData.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">30-Day Activity Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="meetings" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="calls" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} opacity={0.5} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
