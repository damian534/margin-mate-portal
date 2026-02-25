import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy, Medal, Award, TrendingUp, Flame, Star, Target, Zap, Crown, Gem, Rocket } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfYear, subMonths, isWithinInterval, startOfQuarter, endOfQuarter, differenceInCalendarMonths } from 'date-fns';

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

interface AgentBadge {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

function computeBadges(allTimeLeads: Lead[], agentUserId: string): AgentBadge[] {
  const badges: AgentBadge[] = [];
  const agentLeads = allTimeLeads.filter(l => l.referral_partner_id === agentUserId);
  const settledLeads = agentLeads.filter(l => l.status === 'settled');
  const totalVolume = settledLeads.reduce((s, l) => s + (l.loan_amount || 0), 0);

  // --- Milestone badges ---
  if (agentLeads.length >= 1) badges.push({ icon: <Rocket className="w-3.5 h-3.5" />, label: 'First Referral', description: 'Submitted their first referral', color: 'bg-blue-500/15 text-blue-700 border-blue-200' });
  if (agentLeads.length >= 10) badges.push({ icon: <Star className="w-3.5 h-3.5" />, label: '10 Referrals', description: 'Submitted 10 referrals', color: 'bg-purple-500/15 text-purple-700 border-purple-200' });
  if (agentLeads.length >= 25) badges.push({ icon: <Gem className="w-3.5 h-3.5" />, label: '25 Referrals', description: 'Submitted 25 referrals', color: 'bg-indigo-500/15 text-indigo-700 border-indigo-200' });
  if (agentLeads.length >= 50) badges.push({ icon: <Crown className="w-3.5 h-3.5" />, label: '50 Club', description: 'Submitted 50+ referrals — elite status', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-200' });

  // --- Settlement milestones ---
  if (settledLeads.length >= 1) badges.push({ icon: <Target className="w-3.5 h-3.5" />, label: 'First Settle', description: 'First deal settled', color: 'bg-green-500/15 text-green-700 border-green-200' });
  if (settledLeads.length >= 5) badges.push({ icon: <Zap className="w-3.5 h-3.5" />, label: '5 Settled', description: '5 deals settled', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-200' });
  if (settledLeads.length >= 10) badges.push({ icon: <Trophy className="w-3.5 h-3.5" />, label: '10 Settled', description: '10 deals settled — top performer', color: 'bg-amber-500/15 text-amber-700 border-amber-200' });

  // --- Volume milestones ---
  if (totalVolume >= 1_000_000) badges.push({ icon: <Star className="w-3.5 h-3.5" />, label: '$1M Volume', description: 'Settled over $1M in loans', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-200' });
  if (totalVolume >= 5_000_000) badges.push({ icon: <Crown className="w-3.5 h-3.5" />, label: '$5M Volume', description: 'Settled over $5M in loans — legendary', color: 'bg-orange-500/15 text-orange-700 border-orange-200' });

  // --- Streak: consecutive months with at least 1 referral ---
  const streak = computeStreak(agentLeads);
  if (streak >= 2) badges.push({ icon: <Flame className="w-3.5 h-3.5" />, label: `${streak}mo streak`, description: `${streak} consecutive months with referrals`, color: 'bg-red-500/15 text-red-700 border-red-200' });

  return badges;
}

function computeStreak(agentLeads: Lead[]): number {
  if (agentLeads.length === 0) return 0;
  const now = new Date();
  let streak = 0;
  // Check current month first, then go backwards
  for (let i = 0; i <= 24; i++) {
    const checkDate = subMonths(now, i);
    const s = startOfMonth(checkDate);
    const e = endOfMonth(checkDate);
    const hasLead = agentLeads.some(l => isWithinInterval(new Date(l.created_at), { start: s, end: e }));
    if (hasLead) {
      streak++;
    } else {
      // If current month has no leads yet, that's okay — check from previous
      if (i === 0) continue;
      break;
    }
  }
  return streak;
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
        const badges = computeBadges(leads, agent.user_id); // badges always computed from ALL leads
        return {
          id: agent.id,
          userId: agent.user_id,
          name: agent.full_name || 'Unnamed',
          leadsReferred: agentLeads.length,
          settledDeals: settledLeads.length,
          loanVolume,
          score: agentLeads.length + (settledLeads.length * 3) + (loanVolume / 100000),
          badges,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [agents, filteredLeads, leads]);

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
          <div className="space-y-0">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-start gap-3 py-3 px-2 rounded-lg ${i < 3 ? 'bg-primary/[0.03]' : ''} ${i > 0 ? 'border-t border-border' : ''}`}
              >
                {/* Rank */}
                <div className="pt-0.5 shrink-0">{getRankIcon(i)}</div>

                {/* Name + Badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{entry.name}</span>
                    {i === 0 && filteredLeads.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-yellow-500/15 text-yellow-700 border-yellow-200">
                        👑 #1
                      </Badge>
                    )}
                  </div>
                  {entry.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {entry.badges.map((badge, bi) => (
                        <Tooltip key={bi}>
                          <TooltipTrigger asChild>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${badge.color} cursor-default`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-48">
                            {badge.description}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm shrink-0 pt-0.5">
                  <div className="text-center">
                    <p className="font-bold">{entry.leadsReferred}</p>
                    <p className="text-[10px] text-muted-foreground">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-green-600">{entry.settledDeals}</p>
                    <p className="text-[10px] text-muted-foreground">Settled</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">${entry.loanVolume.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Volume</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
