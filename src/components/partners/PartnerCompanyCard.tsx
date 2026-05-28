import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface PartnerCardLead {
  id: string;
  referral_partner_id: string | null;
  loan_amount: number | null;
  status: string;
  created_at: string;
}

export interface PartnerCardAgent {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  name: string;
  isVirtual?: boolean; // for "Independent Referrers" pseudo-card
  agents: PartnerCardAgent[];
  leads: PartnerCardLead[];
  onClick: () => void;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

function deriveHealth(lastReferralAt: Date | null): { label: string; cls: string } {
  if (!lastReferralAt) return { label: 'No referrals', cls: 'bg-muted text-muted-foreground border-border' };
  const days = (Date.now() - lastReferralAt.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 30) return { label: 'Hot', cls: 'bg-green-500/10 text-green-600 border-green-500/20' };
  if (days <= 60) return { label: 'Warm', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
  if (days <= 90) return { label: 'Cold', cls: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
  return { label: 'Dormant', cls: 'bg-red-500/10 text-red-600 border-red-500/20' };
}

export function PartnerCompanyCard({ name, isVirtual, agents, leads, onClick }: Props) {
  const stats = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const open = leads.filter(l => l.status !== 'settled' && l.status !== 'lost');
    const settledYtd = leads.filter(l => l.status === 'settled' && new Date(l.created_at) >= yearStart);
    const pipelineValue = open.reduce((s, l) => s + (l.loan_amount || 0), 0);
    const settledValue = settledYtd.reduce((s, l) => s + (l.loan_amount || 0), 0);
    const lastLead = leads.reduce<Date | null>((latest, l) => {
      const d = new Date(l.created_at);
      return !latest || d > latest ? d : latest;
    }, null);
    return {
      pipelineValue,
      pipelineCount: open.length,
      settledValue,
      settledCount: settledYtd.length,
      lastLead,
    };
  }, [leads]);

  const health = deriveHealth(stats.lastLead);
  const dormant = stats.lastLead && (Date.now() - stats.lastLead.getTime()) / (1000 * 60 * 60 * 24) > 60;

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isVirtual ? 'bg-muted' : 'bg-primary/10 text-primary'}`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3" />
              {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 text-[10px] ${health.cls}`}>{health.label}</Badge>
      </div>

      {/* Stacked KPIs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Active pipeline
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {fmt(stats.pipelineValue)}
            <span className="text-xs text-muted-foreground font-normal ml-1">({stats.pipelineCount})</span>
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-green-500/5 px-3 py-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            Settled YTD
          </span>
          <span className="text-sm font-semibold tabular-nums text-green-700">
            {fmt(stats.settledValue)}
            <span className="text-xs text-muted-foreground font-normal ml-1">({stats.settledCount})</span>
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Last referral
          </span>
          <span className="text-sm font-medium">
            {stats.lastLead ? formatDistanceToNow(stats.lastLead, { addSuffix: true }) : '—'}
          </span>
        </div>
      </div>

      {/* Footer: agent avatars + dormancy warning */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex -space-x-2">
          {agents.slice(0, 4).map((a) => {
            const initials = (a.full_name || a.email || '?')
              .split(' ')
              .map(s => s[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            return (
              <div
                key={a.id}
                className="w-7 h-7 rounded-full bg-primary/10 border-2 border-background text-[10px] font-semibold flex items-center justify-center text-primary"
                title={a.full_name || a.email || ''}
              >
                {initials}
              </div>
            );
          })}
          {agents.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-muted border-2 border-background text-[10px] font-semibold flex items-center justify-center text-muted-foreground">
              +{agents.length - 4}
            </div>
          )}
          {agents.length === 0 && (
            <span className="text-xs text-muted-foreground">No agents yet</span>
          )}
        </div>
        {dormant && (
          <span className="text-xs text-red-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Follow up
          </span>
        )}
      </div>
    </Card>
  );
}