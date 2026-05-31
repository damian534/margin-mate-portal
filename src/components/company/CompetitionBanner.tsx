import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Medal } from 'lucide-react';
import { format, parseISO, isWithinInterval, differenceInCalendarDays } from 'date-fns';

interface Competition {
  id: string;
  name: string;
  prize: string;
  metric: string;
  start_date: string;
  end_date: string;
  description: string | null;
  company_id: string;
}

interface LeaderboardEntry {
  user_id: string;
  name: string;
  leads_count: number;
  settled_count: number;
  loan_volume: number;
}

interface Props {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
}

const METRIC_LABELS: Record<string, string> = {
  referrals: 'referrals',
  settled: 'settled deals',
  loan_volume: 'loan volume',
};

export function CompetitionBanner({ leaderboard, currentUserId }: Props) {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();
      const companyId = (profile as any)?.company_id;
      if (!companyId) return;
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await (supabase as any)
        .from('competitions')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('end_date', { ascending: true });
      setCompetitions((data as Competition[]) || []);
    };
    load();
  }, [user?.id]);

  if (competitions.length === 0) return null;

  const rankedFor = (metric: string) => {
    const sorted = [...leaderboard].sort((a, b) => {
      const av = metric === 'settled' ? a.settled_count : metric === 'loan_volume' ? a.loan_volume : a.leads_count;
      const bv = metric === 'settled' ? b.settled_count : metric === 'loan_volume' ? b.loan_volume : b.leads_count;
      return bv - av;
    });
    const myIdx = sorted.findIndex(e => e.user_id === currentUserId);
    const myEntry = sorted[myIdx];
    const myScore = myEntry ? (metric === 'settled' ? myEntry.settled_count : metric === 'loan_volume' ? myEntry.loan_volume : myEntry.leads_count) : 0;
    const top3 = sorted.slice(0, 3).map(e => ({
      ...e,
      score: metric === 'settled' ? e.settled_count : metric === 'loan_volume' ? e.loan_volume : e.leads_count,
    }));
    return { top3, myRank: myIdx >= 0 ? myIdx + 1 : null, myScore };
  };

  return (
    <div className="space-y-3">
      {competitions.map(c => {
        const end = parseISO(c.end_date);
        const daysLeft = differenceInCalendarDays(end, new Date());
        const { top3, myRank, myScore } = rankedFor(c.metric);
        const metricLabel = METRIC_LABELS[c.metric] || 'referrals';

        return (
          <Card key={c.id} className="border-amber-400/60 bg-gradient-to-br from-amber-50 to-white shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-md">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-lg">{c.name}</h3>
                      <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Live</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Win <span className="font-semibold text-foreground">{c.prize}</span> for the most {metricLabel} this period.
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Ends {format(end, 'd MMM yyyy')}</span>
                      <span className="font-semibold text-amber-700">{daysLeft} day{daysLeft === 1 ? '' : 's'} left</span>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground italic mt-1">{c.description}</p>}
                  </div>
                </div>

                <div className="md:w-72 shrink-0 rounded-lg bg-white border border-amber-200 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Leaderboard</p>
                  {top3.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No entries yet. Be first!</p>
                  ) : (
                    <div className="space-y-1">
                      {top3.map((e, i) => (
                        <div key={e.user_id} className={`flex items-center gap-2 text-sm ${e.user_id === currentUserId ? 'font-semibold' : ''}`}>
                          <span className="w-4 text-center">
                            {i === 0 ? <Medal className="w-3.5 h-3.5 text-amber-500 inline" /> : i + 1}
                          </span>
                          <span className="flex-1 truncate">{e.name}{e.user_id === currentUserId ? ' (you)' : ''}</span>
                          <span className="font-bold">{c.metric === 'loan_volume' ? `$${e.score.toLocaleString()}` : e.score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {myRank && myRank > 3 && (
                    <div className="mt-2 pt-2 border-t border-amber-100 text-xs text-muted-foreground">
                      You're <span className="font-bold text-foreground">#{myRank}</span> with {c.metric === 'loan_volume' ? `$${myScore.toLocaleString()}` : myScore}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}