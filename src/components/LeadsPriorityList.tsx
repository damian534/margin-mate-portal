import { useMemo, useState } from 'react';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { ClipboardList, AlertCircle, Sparkles } from 'lucide-react';
import { getCardAging } from '@/lib/stageAging';
import { AssigneeBadge } from '@/components/AssigneePicker';

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
}

/** Stages where a lead is no longer active, so it should never appear in "Needs you today". */
function isTerminalStage(status: LeadStatus | undefined, statusName: string): boolean {
  const text = `${statusName} ${status?.label ?? ''}`.toLowerCase();
  return ['lost', 'park', 'not proceed', 'settle', 'archiv', 'withdrawn', 'dead'].some(k => text.includes(k));
}

function getUrgency(lead: Lead, status: LeadStatus | undefined, tasksByLead?: Map<string, LeadTask[]>): Urgency {
  if (isTerminalStage(status, lead.status)) return null;
  const tasks = tasksByLead?.get(lead.id)?.filter(t => !t.completed) || [];
  const withDue = tasks.filter(t => t.due_date).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  if (withDue.length > 0) {
    const earliest = new Date(withDue[0].due_date!);
    if (isPast(earliest) && !isToday(earliest)) return 'overdue';
    if (isToday(earliest)) return 'today';
  }
  const aging = getCardAging(lead.stage_entered_at, lead.status, status);
  if (aging?.level === 'red') return 'stale';
  return null;
}

const URGENCY_LABEL: Record<NonNullable<Urgency>, { text: string; className: string }> = {
  overdue: { text: 'Overdue task', className: 'bg-destructive/10 text-destructive' },
  today: { text: 'Due today', className: 'bg-warning/15 text-warning' },
  stale: { text: 'Sitting too long', className: 'bg-destructive/10 text-destructive' },
};

function LeadRow({
  lead,
  status,
  urgency,
  leadSources,
  getReferrerName,
  onOpenLead,
  showDate,
}: {
  lead: Lead;
  status: LeadStatus | undefined;
  urgency: Urgency;
  leadSources: LeadSource[];
  getReferrerName?: (partnerId: string | null) => string | null;
  onOpenLead: (lead: Lead) => void;
  showDate: boolean;
}) {
  const sourceLabel = lead.source ? (leadSources.find(s => s.name === lead.source)?.label || lead.source) : null;
  const referrer = getReferrerName?.(lead.referral_partner_id ?? null);
  const u = urgency ? URGENCY_LABEL[urgency] : null;

  return (
    <button
      type="button"
      onClick={() => onOpenLead(lead)}
      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-b-0"
    >
      {/* Name + opportunity */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">
          {lead.first_name} {lead.last_name}
          {lead.opportunity_name && (
            <span className="font-normal text-muted-foreground"> · {lead.opportunity_name}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {[
            lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : null,
            lead.loan_purpose,
            referrer ? `via ${referrer}` : sourceLabel,
          ].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Urgency chip */}
      {u && (
        <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${u.className}`}>
          <AlertCircle className="w-3 h-3" /> {u.text}
        </span>
      )}

      {/* Stage */}
      {status && (
        <span
          className="hidden md:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${status.color}18`, color: status.color }}
        >
          {status.label}
        </span>
      )}

      {/* Date / assignee */}
      <div className="flex items-center gap-2 shrink-0">
        {showDate && (
          <span className="text-xs text-muted-foreground tabular-nums">{format(new Date(lead.created_at), 'd MMM')}</span>
        )}
        <AssigneeBadge userId={lead.assigned_to ?? null} />
      </div>
    </button>
  );
}

const NEWEST_PAGE_SIZE = 25;

export function LeadsPriorityList({ leads, statuses, leadSources = [], getReferrerName, onOpenLead, tasksByLead }: LeadsPriorityListProps) {
  const statusByName = useMemo(() => new Map(statuses.map(s => [s.name, s])), [statuses]);
  const [showAllNewest, setShowAllNewest] = useState(false);

  const { needsYou, newest } = useMemo(() => {
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
    return { needsYou: needs, newest: rest };
  }, [leads, statusByName, tasksByLead]);

  if (leads.length === 0) {
    return <p className="text-muted-foreground text-center py-12">No leads found</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Needs you today */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Needs you today</h3>
          <span className="text-xs text-muted-foreground">({needsYou.length})</span>
        </div>
        {needsYou.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">Nothing overdue — you're on top of it.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {needsYou.map(({ lead, urgency }) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                status={statusByName.get(lead.status)}
                urgency={urgency}
                leadSources={leadSources}
                getReferrerName={getReferrerName}
                onOpenLead={onOpenLead}
                showDate={false}
              />
            ))}
          </div>
        )}
      </section>

      {/* Newest leads */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Newest leads</h3>
          <span className="text-xs text-muted-foreground">({newest.length})</span>
        </div>
        {newest.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">Every lead needs attention — see above.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {(showAllNewest ? newest : newest.slice(0, NEWEST_PAGE_SIZE)).map(lead => (
              <LeadRow
                key={lead.id}
                lead={lead}
                status={statusByName.get(lead.status)}
                urgency={null}
                leadSources={leadSources}
                getReferrerName={getReferrerName}
                onOpenLead={onOpenLead}
                showDate
              />
            ))}
            {!showAllNewest && newest.length > NEWEST_PAGE_SIZE && (
              <button
                type="button"
                onClick={() => setShowAllNewest(true)}
                className="w-full py-2.5 text-xs font-medium text-primary hover:bg-muted/40 transition-colors"
              >
                Show all {newest.length} leads
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
