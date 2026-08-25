import { format } from 'date-fns';
import { Activity, CheckCircle2, MessageSquare } from 'lucide-react';
import { SectionCard } from '@/components/lead/SectionCard';
import type { ClientContact, ClientDeal, ClientTask, ClientTimelineEntry } from '@/hooks/useClientProfile';

interface Props {
  contact: ClientContact;
  deals: ClientDeal[];
  tasks: ClientTask[];
  timeline: ClientTimelineEntry[];
  onOpenDeal: (leadId: string) => void;
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

export function ClientOverviewTab({ contact, deals, tasks, timeline, onOpenDeal }: Props) {
  const settled = deals.filter(d => d.status === 'settled' || !!d.settled_date);
  const active = deals.filter(d => !(d.status === 'settled' || !!d.settled_date));
  const totalLending = deals.reduce((s, d) => s + Number(d.loan_amount || 0), 0);
  const settledValue = settled.reduce((s, d) => s + Number(d.loan_amount || 0), 0);
  const openTasks = tasks.filter(t => !t.completed);
  const lastContact = timeline[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Lifetime lending" value={money(totalLending)} hint={`${deals.length} deal${deals.length === 1 ? '' : 's'}`} />
        <Stat label="Settled" value={money(settledValue)} hint={`${settled.length} settled`} />
        <Stat label="Active deals" value={String(active.length)} hint={active[0] ? String(active[0].wip_status || active[0].status).replace(/_/g, ' ') : 'None in progress'} />
        <Stat
          label="Last contact"
          value={lastContact ? format(new Date(lastContact.occurred_at), 'd MMM yy') : '—'}
          hint={lastContact ? lastContact.title : 'No activity logged'}
        />
      </div>

      <SectionCard icon={CheckCircle2} title="Open tasks" tone="neutral" subtitle={`${openTasks.length} outstanding`}>
        {openTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">Nothing outstanding for this client.</p>
        ) : (
          <div className="space-y-2">
            {openTasks.slice(0, 8).map(t => (
              <button
                key={t.id}
                onClick={() => t.lead_id && onOpenDeal(t.lead_id)}
                className="w-full flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-left hover:bg-muted/50"
              >
                <span className="text-sm truncate">{t.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {t.due_date ? format(new Date(t.due_date), 'd MMM yy') : 'No due date'}
                </span>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard icon={Activity} title="Recent activity" tone="neutral" subtitle="Across every deal">
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">Nothing logged yet.</p>
        ) : (
          <div className="space-y-3">
            {timeline.slice(0, 12).map(e => (
              <div key={e.id} className="flex gap-3">
                <div className="mt-1 w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {format(new Date(e.occurred_at), 'd MMM yy')}
                    </span>
                  </div>
                  {e.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{e.body}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {contact.notes && (
        <SectionCard icon={MessageSquare} title="Contact notes" tone="neutral">
          <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
        </SectionCard>
      )}
    </div>
  );
}
