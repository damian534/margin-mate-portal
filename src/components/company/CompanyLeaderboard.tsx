import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfYear, subMonths, isWithinInterval, startOfQuarter, endOfQuarter } from 'date-fns';

interface Lead {
  id: string;
  referral_partner_id: string | null;
  loan_amount: number | null;
  status: string;
  created_at: string;
}

interface Agent {
  id: string;
  user_id: string;
  full_name: string | null;
}

type TimePeriod = 'current_month' | 'previous_month' | 'current_quarter' | 'ytd' | 'all_time';

interface CompanyLeaderboardProps {
  leads: Lead[];
  agents: Agent[];
}

export function CompanyLeaderboard({ leads, agents }: CompanyLeaderboardProps) {
  const [period, setPeriod] = useState<TimePeriod>('current_month');

  const filteredLeads = useMemo(() => {
    if (period === 'all_time') return leads;
    const now = new Date();
    let start: Date;
    let end: Date;
    if (period === 'current_month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (period === 'previous_month') {
      const prev = subMonths(now, 1);
      start = startOfMonth(prev);
      end = endOfMonth(prev);
    } else if (period === 'current_quarter') {
      start = startOfQuarter(now);
      end = endOfQuarter(now);
    } else {
      start = startOfYear(now);
      end = now;
    }
    return leads.filter(l => isWithinInterval(new Date(l.created_at), { start, end }));
  }, [leads, period]);

  const leaderboard = useMemo(() => {
    return agents
      .map(agent => {
        const agentLeads = filteredLeads.filter(l => l.referral_partner_id === agent.user_id);
        const settledLeads = agentLeads.filter(l => l.status === 'settled');
        const loanVolume = settledLeads.reduce((sum, l) => sum + (l.loan_amount || 0), 0);
        return {
          id: agent.id,
          name: agent.full_name || 'Unnamed',
          leadsReferred: agentLeads.length,
          settledDeals: settledLeads.length,
          loanVolume,
          // Composite score for ranking
          score: agentLeads.length + (settledLeads.length * 3) + (loanVolume / 100000),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [agents, filteredLeads]);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 2) return <Award className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank + 1}</span>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Agent Leaderboard</CardTitle>
          </div>
          <Select value={period} onValueChange={(v: TimePeriod) => setPeriod(v)}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">This Month</SelectItem>
              <SelectItem value="previous_month">Last Month</SelectItem>
              <SelectItem value="current_quarter">This Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No agents to display</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Settled</TableHead>
                <TableHead className="text-right">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, i) => (
                <TableRow key={entry.id} className={i < 3 ? 'bg-primary/[0.02]' : ''}>
                  <TableCell>{getRankIcon(i)}</TableCell>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell className="text-right font-semibold">{entry.leadsReferred}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">{entry.settledDeals}</TableCell>
                  <TableCell className="text-right font-semibold">${entry.loanVolume.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
