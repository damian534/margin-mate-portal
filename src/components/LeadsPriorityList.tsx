import { useMemo, useState } from 'react';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { format, isPast, isToday, differenceInCalendarDays } from 'date-fns';
import {
  ChevronRight,
  ChevronDown,
  AlarmClock,
  CalendarClock,
  Hourglass,
  CheckCircle2,
  Search,
  Sparkles,
} from 'lucide-react';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  opportunity_name?: string | null;
  email: string | null;
  phone: string | null;
  loan_amount: number | null;
  loan_purpose: string | null;
  status: string;
  source?: string | null;
  referral_partner_id?: string | null;
  created_at: string;
  assigned_to?: string | null;
  stage_entered_at?: string | null;
}

interface LeadSource {
  name: string;
  label: string;
}

interface LeadTask {
  id: string;
  lead_id: string;
  due_date: string | null;
  completed: boolean;
}

type Urgency = 'overdue' | 'today' | 'stale' | null;

interface LeadsPriorityListProps {
  leads: Lead[];
  statuses: LeadStatus[];
  leadSources?: LeadSource[];
  getReferrerName?: (partnerId: string | null) => string | null;
  onOpenLead: (lead: Lead) => void;
  tasksByLead?: Map<string, LeadTask[]>;
  userName?: string;
}

/** Stages where a lead is no longer active, so it should never appear in "Needs you today". */
function isTerminalStage(status: LeadStatus | undefined, statusName: string): boolean {
  const text = `${statusName} ${status?.label ?? ''}`.toLowerCase();
  return ['lost', 'park', 'not proceed', 'settle', 'archiv', 'withdrawn', 'dead'].some(k => text.includes(k));
}

/** A lead sitting this many calendar days in one stage is "needs you" — kept deliberately tight so the daily list stays short. */
const STALE_AFTER_DAYS = 14;

function getUrgency(lead: Lead, status: LeadStatus | undefined, tasksByLead?: Map<string, LeadTask[]>): Urgency {
  if (isTerminalStage(status, lead.status)) return null;
  const tasks = tasksByLead?.get(lead.id)?.filter(t => !t.completed) || [];
  const withDue = tasks.filter(t => t.due_date).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  if (withDue.length > 0) {
    const earliest = new Date(withDue[0].due_date!);
    if (isPast(earliest) && !isToday(earliest)) return 'overdue';
    if (isToday(earliest)) return 'today';
  }
  const entered = lead.stage_entered_at ? new Date(lead.stage_entered_at) : null;
  if (entered && !isNaN(entered.getTime()) && differenceInCalendarDays(new Date(), entered) >= STALE_AFTER_DAYS) return 'stale';
  return null;
}

const URGENCY_META: Record<NonNullable<Urgency>, { label: string; Icon: typeof AlarmClock; iconClass: string; chipClass: string }> = {
  overdue: {
    label: 'Follow-up overdue',
    Icon: AlarmClock,
    iconClass: 'bg-destructive/10 text-destructive',
    chipClass: 'bg-destructive/10 text-destructive',
  },
  today: {
    label: 'Due today',
    Icon: CalendarClock,
    iconClass: 'bg-warning/10 text-warning',
    chipClass: 'bg-warning/10 text-warning',
  },
  stale: {
    label: `In stage ${STALE_AFTER_DAYS}+ days`,
    Icon: Hourglass,
    iconClass: 'bg-info/10 text-info',
    chipClass: 'bg-info/10 text-info',
  },
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function initials(lead: Lead): string {
  return `${lead.first_name?.[0] ?? ''}${lead.last_name?.[0] ?? ''}`.toUpperCase();
}

function FocusRow({
  lead,
  urgency,
  status,
  onOpenLead,
}: {
  lead: Lead;
  urgency: NonNullable<Urgency>;
  status: LeadStatus | undefined;
  onOpenLead: (lead: Lead) => void;
}) {
  const meta = URGENCY_META[urgency];
  return (
    <button
      type="button"
      onClick={() => onOpenLead(lead)}
      className="w-full text-left flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-muted/40 active:bg-muted/60 transition-colors group"
    >
      <span className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${meta.iconClass}`}>
        <meta.Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-semibold tracking-tight truncate">
            {lead.first_name} {lead.last_name}
          </p>
          <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0 ${meta.chipClass}`}>
            {meta.label}
          </span>
        </div>
        <p className="text-[13px] text-muted-foreground truncate mt-0.5">
          {[lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : null, status?.label]
            .filter(Boolean)
            .join(' · ')}
          <span className="sm:hidden">{lead.loan_amount || status?.label ? ' · ' : ''}{meta.label}</span>
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

function QuietRow({
  lead,
  status,
  leadSources,
  getReferrerName,
  onOpenLead,
}: {
  lead: Lead;
  status: LeadStatus | undefined;
  leadSources: LeadSource[];
  getReferrerName?: (partnerId: string | null) => string | null;
  onOpenLead: (lead: Lead) => void;
}) {
  const sourceLabel = lead.source ? (leadSources.find(s => s.name === lead.source)?.label || lead.source) : null;
  const referrer = getReferrerName?.(lead.referral_partner_id ?? null);
  return (
    <button
      type="button"
      onClick={() => onOpenLead(lead)}
      className="w-full text-left flex items-center gap-3.5 px-5 sm:px-6 py-3.5 hover:bg-muted/40 transition-colors group"
    >
      <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0">
        {initials(lead)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium tracking-tight truncate">
          {lead.first_name} {lead.last_name}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {[
            lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : null,
            referrer ? `via ${referrer}` : sourceLabel,
            status?.label,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <span className="text-xs text-muted-foreground/70 tabular-nums shrink-0">{format(new Date(lead.created_at), 'd MMM')}</span>
    </button>
  );
}

type Filter = 'all' | NonNullable<Urgency>;

export function LeadsPriorityList({ leads, statuses, leadSources = [], getReferrerName, onOpenLead, tasksByLead, userName }: LeadsPriorityListProps) {
  const statusByName = useMemo(() => new Map(statuses.map(s => [s.name, s])), [statuses]);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const { needsYou, rest, counts } = useMemo(() => {
    const needs: { lead: Lead; urgency: NonNullable<Urgency> }[] = [];
    const rest: Lead[] = [];
    for (const lead of leads) {
      const urgency = getUrgency(lead, statusByName.get(lead.status), tasksByLead);
      if (urgency) needs.push({ lead, urgency });
      else rest.push(lead);
    }
    const rank = { overdue: 0, today: 1, stale: 2 };
    needs.sort((a, b) => rank[a.urgency] - rank[b.urgency] || new Date(b.lead.created_at).getTime() - new Date(a.lead.created_at).getTime());
    rest.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const counts = {
      overdue: needs.filter(n => n.urgency === 'overdue').length,
      today: needs.filter(n => n.urgency === 'today').length,
      stale: needs.filter(n => n.urgency === 'stale').length,
    };
    return { needsYou: needs, rest, counts };
  }, [leads, statusByName, tasksByLead]);

  const visibleNeeds = filter === 'all' ? needsYou : needsYou.filter(n => n.urgency === filter);

  const filteredRest = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rest;
    return rest.filter(l =>
      `${l.first_name} ${l.last_name} ${l.opportunity_name ?? ''} ${l.loan_purpose ?? ''}`.toLowerCase().includes(q),
    );
  }, [rest, query]);

  const filters: { key: Filter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: needsYou.length },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
    { key: 'today', label: 'Today', count: counts.today },
    { key: 'stale', label: 'Stale', count: counts.stale },
  ];

  return (
    <div className="max-w-3xl pt-6 pb-16">
      {/* Greeting */}
      <div className="px-1">
        <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-tight">
          {greeting()}{userName ? `, ${userName}` : ''}
        </h2>
        <p className="text-[15px] text-muted-foreground mt-1.5">
          {needsYou.length === 0
            ? "Nothing needs you right now — you're on top of it."
            : `You have ${needsYou.length} ${needsYou.length === 1 ? 'lead' : 'leads'} that ${needsYou.length === 1 ? 'needs' : 'need'} attention`}
        </p>
      </div>

      {/* Focus card */}
      {needsYou.length > 0 ? (
        <div className="mt-7 rounded-3xl border border-border/70 bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_8px_24px_-12px_hsl(var(--foreground)/0.08)] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-4">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Needs your attention
            </h3>
            {/* Segmented filter */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-muted/70">
              {filters.map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    filter === f.key
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                  {f.count !== undefined && f.count > 0 && (
                    <span className="ml-1 tabular-nums opacity-60">{f.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border/50 border-t border-border/50">
            {visibleNeeds.map(({ lead, urgency }) => (
              <FocusRow
                key={lead.id}
                lead={lead}
                urgency={urgency}
                status={statusByName.get(lead.status)}
                onOpenLead={onOpenLead}
              />
            ))}
            {visibleNeeds.length === 0 && (
              <p className="px-6 py-8 text-sm text-muted-foreground text-center">Nothing in this group right now.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-7 rounded-3xl border border-border/70 bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] px-6 py-14 text-center">
          <span className="mx-auto w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" strokeWidth={1.8} />
          </span>
          <p className="mt-4 text-lg font-semibold tracking-tight">You're all caught up</p>
          <p className="mt-1 text-sm text-muted-foreground">No overdue follow-ups and no leads sitting idle.</p>
        </div>
      )}

      {/* Everything else */}
      {rest.length > 0 && (
        <div className="mt-6 rounded-3xl border border-border/70 bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAll(s => !s)}
            className="w-full flex items-center justify-between gap-3 px-5 sm:px-6 py-4 hover:bg-muted/30 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-muted-foreground/60" />
              <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                All other leads
              </span>
              <span className="text-xs text-muted-foreground/70 tabular-nums">{rest.length}</span>
            </span>
            {showAll ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {showAll && (
            <div className="border-t border-border/50">
              <div className="px-5 sm:px-6 py-3 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search leads…"
                    className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted/60 text-sm placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-ring/30 transition-shadow"
                  />
                </div>
              </div>
              <div className="divide-y divide-border/50 max-h-[480px] overflow-y-auto">
                {filteredRest.map(lead => (
                  <QuietRow
                    key={lead.id}
                    lead={lead}
                    status={statusByName.get(lead.status)}
                    leadSources={leadSources}
                    getReferrerName={getReferrerName}
                    onOpenLead={onOpenLead}
                  />
                ))}
                {filteredRest.length === 0 && (
                  <p className="px-6 py-8 text-sm text-muted-foreground text-center">No leads match “{query}”.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {leads.length === 0 && (
        <p className="text-muted-foreground py-16 text-center text-sm">No leads found</p>
      )}
    </div>
  );
}
