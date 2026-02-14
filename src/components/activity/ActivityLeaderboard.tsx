import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy } from 'lucide-react';

interface LeaderboardEntry {
  broker_id: string;
  broker_name: string;
  meetings_held: number;
  outbound_calls: number;
  referral_meetings_booked: number;
}

export function ActivityLeaderboard({ data }: { data: LeaderboardEntry[] }) {
  if (!data.length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Broker Activity Leaderboard (This Week)</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Broker</TableHead>
              <TableHead className="text-right">Meetings</TableHead>
              <TableHead className="text-right">Calls</TableHead>
              <TableHead className="text-right">Referral Meetings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry, i) => (
              <TableRow key={entry.broker_id}>
                <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{entry.broker_name}</TableCell>
                <TableCell className="text-right font-heading font-bold">{entry.meetings_held}</TableCell>
                <TableCell className="text-right">{entry.outbound_calls}</TableCell>
                <TableCell className="text-right">{entry.referral_meetings_booked}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
