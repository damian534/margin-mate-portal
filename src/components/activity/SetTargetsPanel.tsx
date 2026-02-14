import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target } from 'lucide-react';
import type { ActivityTargets } from '@/hooks/useBrokerActivity';

interface Props {
  targets: ActivityTargets | null;
  brokers: { id: string; name: string }[];
  onSave: (data: { meetings_target_week: number; outbound_calls_target_week: number; referral_meetings_target_week: number }, brokerId: string) => void;
}

export function SetTargetsPanel({ targets, brokers, onSave }: Props) {
  const [selectedBroker, setSelectedBroker] = useState(brokers[0]?.id || '');
  const [meetings, setMeetings] = useState(0);
  const [calls, setCalls] = useState(0);
  const [referral, setReferral] = useState(0);

  useEffect(() => {
    if (targets) {
      setMeetings(targets.meetings_target_week);
      setCalls(targets.outbound_calls_target_week);
      setReferral(targets.referral_meetings_target_week);
    }
  }, [targets]);

  useEffect(() => {
    if (brokers.length && !selectedBroker) setSelectedBroker(brokers[0].id);
  }, [brokers, selectedBroker]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Set Weekly Targets</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {brokers.length > 1 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Broker</Label>
            <Select value={selectedBroker} onValueChange={setSelectedBroker}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Meetings Target</Label>
            <Input type="number" min={0} value={meetings} onChange={e => setMeetings(Math.max(0, parseInt(e.target.value) || 0))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Calls Target</Label>
            <Input type="number" min={0} value={calls} onChange={e => setCalls(Math.max(0, parseInt(e.target.value) || 0))} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Referral Meetings Target</Label>
            <Input type="number" min={0} value={referral} onChange={e => setReferral(Math.max(0, parseInt(e.target.value) || 0))} className="h-9" />
          </div>
        </div>
        <Button size="sm" onClick={() => onSave({ meetings_target_week: meetings, outbound_calls_target_week: calls, referral_meetings_target_week: referral }, selectedBroker)}>
          Save Targets
        </Button>
      </CardContent>
    </Card>
  );
}
