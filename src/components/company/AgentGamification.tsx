import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Trophy, Medal, Award, Flame, Star, Target, Zap, Crown, Gem, Rocket, TrendingUp, ArrowUp } from 'lucide-react';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface LeaderboardEntry {
  user_id: string;
  name: string;
  leads_count: number;
  settled_count: number;
  loan_volume: number;
  score: number;
  lead_dates: string[];
}

interface AgentGamificationProps {
  leaderboard: LeaderboardEntry[];
  myRank: number | null;
  totalAgents: number;
  companyName: string | null;
  currentUserId: string;
}

interface BadgeInfo {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

interface NextGoal {
  label: string;
  current: number;
  target: number;
  icon: React.ReactNode;
}

function computeStreak(leadDates: string[]): number {
  if (leadDates.length === 0) return 0;
  const now = new Date();
  let streak = 0;
  for (let i = 0; i <= 24; i++) {
    const checkDate = subMonths(now, i);
    const s = startOfMonth(checkDate);
    const e = endOfMonth(checkDate);
    const hasLead = leadDates.some(d => isWithinInterval(new Date(d), { start: s, end: e }));
    if (hasLead) {
      streak++;
    } else {
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

function computeBadges(entry: LeaderboardEntry): BadgeInfo[] {
  const badges: BadgeInfo[] = [];
  const { leads_count, settled_count, loan_volume, lead_dates } = entry;

  // Referral milestones
  if (leads_count >= 1) badges.push({ icon: <Rocket className="w-3.5 h-3.5" />, label: 'First Referral', description: 'Submitted your first referral', color: 'bg-blue-500/15 text-blue-700 border-blue-200' });
  if (leads_count >= 10) badges.push({ icon: <Star className="w-3.5 h-3.5" />, label: '10 Referrals', description: '10 referrals submitted', color: 'bg-purple-500/15 text-purple-700 border-purple-200' });
  if (leads_count >= 25) badges.push({ icon: <Gem className="w-3.5 h-3.5" />, label: '25 Referrals', description: '25 referrals — rising star', color: 'bg-indigo-500/15 text-indigo-700 border-indigo-200' });
  if (leads_count >= 50) badges.push({ icon: <Crown className="w-3.5 h-3.5" />, label: '50 Club', description: '50+ referrals — elite status', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-200' });

  // Settlement milestones
  if (settled_count >= 1) badges.push({ icon: <Target className="w-3.5 h-3.5" />, label: 'First Settle', description: 'First deal settled', color: 'bg-green-500/15 text-green-700 border-green-200' });
  if (settled_count >= 5) badges.push({ icon: <Zap className="w-3.5 h-3.5" />, label: '5 Settled', description: '5 deals settled', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-200' });
  if (settled_count >= 10) badges.push({ icon: <Trophy className="w-3.5 h-3.5" />, label: '10 Settled', description: '10 deals settled — top performer', color: 'bg-amber-500/15 text-amber-700 border-amber-200' });

  // Volume milestones
  if (loan_volume >= 1_000_000) badges.push({ icon: <Star className="w-3.5 h-3.5" />, label: '$1M Volume', description: 'Settled over $1M in loans', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-200' });
  if (loan_volume >= 5_000_000) badges.push({ icon: <Crown className="w-3.5 h-3.5" />, label: '$5M Volume', description: 'Settled over $5M — legendary', color: 'bg-orange-500/15 text-orange-700 border-orange-200' });

  // Streak
  const streak = computeStreak(lead_dates);
  if (streak >= 2) badges.push({ icon: <Flame className="w-3.5 h-3.5" />, label: `${streak}mo streak`, description: `${streak} consecutive months with referrals`, color: 'bg-red-500/15 text-red-700 border-red-200' });

  return badges;
}

function computeNextGoals(entry: LeaderboardEntry): NextGoal[] {
  const goals: NextGoal[] = [];
  const { leads_count, settled_count, loan_volume } = entry;

  // Referral goals
  const referralMilestones = [1, 10, 25, 50];
  const nextRefMilestone = referralMilestones.find(m => leads_count < m);
  if (nextRefMilestone) {
    goals.push({ label: `${nextRefMilestone} Referrals`, current: leads_count, target: nextRefMilestone, icon: <Star className="w-4 h-4 text-purple-600" /> });
  }

  // Settlement goals
  const settleMilestones = [1, 5, 10];
  const nextSettleMilestone = settleMilestones.find(m => settled_count < m);
  if (nextSettleMilestone) {
    goals.push({ label: `${nextSettleMilestone} Settled`, current: settled_count, target: nextSettleMilestone, icon: <Target className="w-4 h-4 text-green-600" /> });
  }

  // Volume goals
  const volumeMilestones = [1_000_000, 5_000_000];
  const nextVolMilestone = volumeMilestones.find(m => loan_volume < m);
  if (nextVolMilestone) {
    goals.push({ label: `$${(nextVolMilestone / 1_000_000).toFixed(0)}M Volume`, current: loan_volume, target: nextVolMilestone, icon: <TrendingUp className="w-4 h-4 text-yellow-600" /> });
  }

  return goals.slice(0, 2); // Show max 2 goals
}

export function AgentGamification({ leaderboard, myRank, totalAgents, companyName, currentUserId }: AgentGamificationProps) {
  const myEntry = useMemo(() => leaderboard.find(e => e.user_id === currentUserId), [leaderboard, currentUserId]);
  const myBadges = useMemo(() => myEntry ? computeBadges(myEntry) : [], [myEntry]);
  const myStreak = useMemo(() => myEntry ? computeStreak(myEntry.lead_dates) : 0, [myEntry]);
  const nextGoals = useMemo(() => myEntry ? computeNextGoals(myEntry) : [], [myEntry]);

  if (!myEntry) return null;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-700" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Achievement Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Rank circle */}
              <div className="w-16 h-16 rounded-2xl bg-background border-2 border-primary/20 flex flex-col items-center justify-center shadow-sm">
                {getRankIcon(myRank || 0)}
                <span className="text-[9px] text-muted-foreground font-medium">of {totalAgents}</span>
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Your Rank</h3>
                <p className="text-sm text-muted-foreground">
                  {companyName || 'Your Company'} leaderboard
                </p>
              </div>
            </div>

            {/* Streak */}
            {myStreak >= 1 && (
              <div className="flex items-center gap-1.5 bg-red-500/10 text-red-700 px-3 py-1.5 rounded-full">
                <Flame className="w-4 h-4" />
                <span className="font-bold text-sm">{myStreak}mo</span>
                <span className="text-xs">streak</span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-background/80 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{myEntry.leads_count}</p>
              <p className="text-[11px] text-muted-foreground">Referrals</p>
            </div>
            <div className="bg-background/80 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-600">{myEntry.settled_count}</p>
              <p className="text-[11px] text-muted-foreground">Settled</p>
            </div>
            <div className="bg-background/80 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">${(myEntry.loan_volume / 1000).toFixed(0)}k</p>
              <p className="text-[11px] text-muted-foreground">Volume</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        {myBadges.length > 0 && (
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your Badges</p>
            <div className="flex flex-wrap gap-1.5">
              {myBadges.map((badge, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border cursor-default ${badge.color}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{badge.description}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        )}

        {/* Next Goals */}
        {nextGoals.length > 0 && (
          <CardContent className="pt-0 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Next Goals</p>
            <div className="space-y-2.5">
              {nextGoals.map((goal, i) => {
                const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
                return (
                  <div key={i} className="flex items-center gap-3">
                    {goal.icon}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{goal.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {goal.target >= 1_000_000
                            ? `$${(goal.current / 1_000_000).toFixed(1)}M / $${(goal.target / 1_000_000).toFixed(0)}M`
                            : `${goal.current} / ${goal.target}`
                          }
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Mini Leaderboard */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">{companyName || 'Company'} Leaderboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-0">
            {leaderboard.map((entry, i) => {
              const isMe = entry.user_id === currentUserId;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''} ${isMe ? 'bg-primary/[0.04] -mx-2 px-2 rounded-lg' : ''}`}
                >
                  <div className="w-6 shrink-0 flex justify-center">
                    {i === 0 ? <Trophy className="w-4 h-4 text-yellow-500" /> :
                     i === 1 ? <Medal className="w-4 h-4 text-slate-400" /> :
                     i === 2 ? <Award className="w-4 h-4 text-amber-700" /> :
                     <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>}
                  </div>
                  <span className={`flex-1 text-sm truncate ${isMe ? 'font-bold' : 'font-medium'}`}>
                    {entry.name} {isMe && <span className="text-xs text-primary">(you)</span>}
                  </span>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span className="font-semibold">{entry.leads_count}</span>
                    <span className="text-green-600 font-semibold">{entry.settled_count}</span>
                    <span className="font-semibold w-16 text-right">${entry.loan_volume.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2 justify-end">
            <span>Leads</span>
            <span>Settled</span>
            <span className="w-16 text-right">Volume</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
