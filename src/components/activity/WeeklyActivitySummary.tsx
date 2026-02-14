import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ActivityTargets } from '@/hooks/useBrokerActivity';

interface Props {
  weeklyTotals: { meetings_held: number; meetings_booked: number; outbound_calls: number; referral_meetings_booked: number };
  targets: ActivityTargets | null;
}

export function WeeklyActivitySummary({ weeklyTotals, targets }: Props) {
  const items = [
    { label: 'Meetings Held', value: weeklyTotals.meetings_held, target: targets?.meetings_target_week },
    { label: 'Meetings Booked', value: weeklyTotals.meetings_booked, target: undefined },
    { label: 'Outbound Calls', value: weeklyTotals.outbound_calls, target: targets?.outbound_calls_target_week },
    { label: 'Referral Meetings', value: weeklyTotals.referral_meetings_booked, target: targets?.referral_meetings_target_week },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Weekly Activity Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map(item => {
            const pct = item.target && item.target > 0 ? Math.min(Math.round((item.value / item.target) * 100), 100) : null;
            return (
              <div key={item.label} className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                <p className="text-xl font-bold font-heading">{item.value}</p>
                {pct !== null && (
                  <div className="space-y-1">
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">{pct}% of target ({item.target})</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
