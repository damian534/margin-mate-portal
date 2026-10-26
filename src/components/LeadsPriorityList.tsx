import { useMemo, useState } from 'react';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { format, isPast, isToday, differenceInCalendarDays } from 'date-fns';
import { ChevronRight, ChevronDown } from 'lucide-react';

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
const STALE_AFTER_DAYS = 7;

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

const URGENCY_TEXT: Record<NonNullable<Urgency>, string> = {
  overdue: 'Follow-up overdue',
  today: 'Follow-up due today',
  stale: 'In this stage for 7+ days',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function FocusRow({ lead, detail, onOpenLead }: { lead: Lead; detail: string; onOpenLead: (lead: Lead) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpenLead(lead)}
      className="w-full text-left flex items-center gap-4 py-5 border-b border-border/40 last:border-b-0 group"
    >
      <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium truncate">{lead.first_name} {lead.last_name}</p>
        <p className="text-sm text-muted-foreground truncate">{detail}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
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
      className="w-full text-left flex items-center gap-3 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors px-1"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{lead.first_name} {lead.last_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[
            lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : null,
            referrer ? `via ${referrer}` : sourceLabel,
            status?.label,
          ].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{format(new Date(lead.created_at), 'd MMM')}</span>
    </button>
  );
}

export function LeadsPriorityList({ leads, statuses, leadSources = [], getReferrerName, onOpenLead, tasksByLead, userName }: LeadsPriorityListProps) {
  const statusByName = useMemo(() => new Map(statuses.map(s => [s.name, s])), [statuses]);
  const [showAll, setShowAll] = useState(false);

  const { needsYou, rest } = useMemo(() => {
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
    return { needsYou: needs, rest };
  }, [leads, statusByName, tasksByLead]);

  return (
    <div className="max-w-3xl pt-4 pb-12">
      {/* Greeting */}
      <h2 className="text-2xl font-semibold tracking-tight">
        {greeting()}{userName ? `, ${userName}` : ''}
      </h2>
      <p className="text-muted-foreground mt-1 mb-8">
        {needsYou.length === 0
          ? "Nothing needs you right now — you're on top of it."
          : `${needsYou.length} ${needsYou.length === 1 ? 'thing needs' : 'things need'} you today`}
      </p>

      {/* Focus list */}
      <div>
        {needsYou.map(({ lead, urgency }) => (
          <FocusRow key={lead.id} lead={lead} detail={URGENCY_TEXT[urgency]} onOpenLead={onOpenLead} />
        ))}
      </div>

      {/* Everything else, tucked away */}
      {rest.length > 0 && (
        <div className="mt-10">
          <button
            type="button"
            onClick={() => setShowAll(s => !s)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAll ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            All other leads ({rest.length})
          </button>
          {showAll && (
            <div className="mt-3">
              {rest.map(lead => (
                <QuietRow
                  key={lead.id}
                  lead={lead}
                  status={statusByName.get(lead.status)}
                  leadSources={leadSources}
                  getReferrerName={getReferrerName}
                  onOpenLead={onOpenLead}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {leads.length === 0 && (
        <p className="text-muted-foreground py-12 text-center">No leads found</p>
      )}
    </div>
  );
}
