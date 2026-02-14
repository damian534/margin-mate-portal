import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface Props {
  todayActivity: { outbound_calls: number; meetings_held: number; meetings_booked: number; referral_meetings_booked: number } | null;
  onSave: (data: { outbound_calls: number; meetings_held: number; meetings_booked: number; referral_meetings_booked: number }) => void;
}

export function LogActivityPanel({ todayActivity, onSave }: Props) {
  const [calls, setCalls] = useState(0);
  const [held, setHeld] = useState(0);
  const [booked, setBooked] = useState(0);
  const [referral, setReferral] = useState(0);

  useEffect(() => {
    if (todayActivity) {
      setCalls(todayActivity.outbound_calls);
      setHeld(todayActivity.meetings_held);
      setBooked(todayActivity.meetings_booked);
      setReferral(todayActivity.referral_meetings_booked);
    }
  }, [todayActivity]);

  const handleSave = () => {
    onSave({ outbound_calls: calls, meetings_held: held, meetings_booked: booked, referral_meetings_booked: referral });
  };

  const fields = [
    { label: 'Outbound Calls', value: calls, set: setCalls },
    { label: 'Meetings Held', value: held, set: setHeld },
    { label: 'Meetings Booked', value: booked, set: setBooked },
    { label: 'Referral Meetings', value: referral, set: setReferral },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Log Today's Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {fields.map(f => (
            <div key={f.label} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <Input
                type="number"
                min={0}
                value={f.value}
                onChange={e => f.set(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9"
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSave} className="mt-4" size="sm">
          <Save className="w-4 h-4 mr-1" /> Save Today's Activity
        </Button>
      </CardContent>
    </Card>
  );
}
