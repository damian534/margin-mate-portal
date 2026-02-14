import { Card, CardContent } from '@/components/ui/card';
import { Phone, Users, CalendarCheck, Handshake } from 'lucide-react';

interface Props {
  todayActivity: { outbound_calls: number; meetings_held: number; meetings_booked: number; referral_meetings_booked: number } | null;
  weeklyReferralMeetings: number;
}

export function DailyActivityKPIs({ todayActivity, weeklyReferralMeetings }: Props) {
  const cards = [
    { label: 'Meetings Held Today', value: todayActivity?.meetings_held ?? 0, icon: Users },
    { label: 'Meetings Booked Today', value: todayActivity?.meetings_booked ?? 0, icon: CalendarCheck },
    { label: 'Outbound Calls Today', value: todayActivity?.outbound_calls ?? 0, icon: Phone },
    { label: 'Referral Meetings This Week', value: weeklyReferralMeetings, icon: Handshake },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.label} className="border-border/50">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center">
                <c.icon className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
            </div>
            <p className="text-2xl font-bold font-heading">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
