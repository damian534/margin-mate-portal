import { useMemo, useState } from 'react';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { SmsComposeDialog } from '@/components/lead/SmsComposeDialog';
import { hasOverdueTask } from '@/lib/dealTaskUrgency';
import { avatarTint } from '@/lib/avatarTint';
import { format, isToday, differenceInCalendarDays, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Phone,
  Mail,
  MessageSquare,
  AlarmClock,
  CalendarClock,
  CalendarPlus,
  Sparkles,
  Inbox,
  CheckCircle2,
  Facebook,
  Instagram,
  Linkedin,
  Globe,
  Users,
  Tag,
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

interface LeadsPriorityListProps {
  leads: Lead[];
  statuses: LeadStatus[];
  leadSources?: LeadSource[];
  getReferrerName?: (partnerId: string | null) => string | null;
  onOpenLead: (lead: Lead) => void;
  tasksByLead?: Map<string, LeadTask[]>;
  userName?: string;
}

/** Stages where a lead is no longer active, so it drops out of the follow-up inbox. */
function isTerminalStage(status: LeadStatus | undefined, statusName: string): boolean {
  const text = `${statusName} ${status?.label ?? ''}`.toLowerCase();
  return ['lost', 'park', 'not proceed', 'settle', 'archiv', 'withdrawn', 'dead'].some(k => text.includes(k));
}

/** A lead created within this window and with no follow-up scheduled is treated as "New". */
const NEW_LEAD_HOURS = 72;

type Bucket = 'overdue' | 'today' | 'new' | 'upcoming' | 'none' | 'closed';

function nextFollowUp(lead: Lead, tasksByLead?: Map<string, LeadTask[]>): Date | null {
  const tasks = tasksByLead?.get(lead.id)?.filter(t => !t.completed && t.due_date) || [];
  if (tasks.length === 0) return null;
  const earliest = tasks.reduce((a, b) => (new Date(a.due_date!) < new Date(b.due_date!) ? a : b));
  const d = new Date(earliest.due_date!);
  return isNaN(d.getTime()) ? null : d;
}

function getBucket(lead: Lead, status: LeadStatus | undefined, tasksByLead?: Map<string, LeadTask[]>): Bucket {
  if (isTerminalStage(status, lead.status)) return 'closed';
  const due = nextFollowUp(lead, tasksByLead);
  if (due) {
    if (isToday(due)) return 'today';
    if (due.getTime() < Date.now()) return 'overdue';
    return 'upcoming';
  }
  const created = new Date(lead.created_at);
  if (!isNaN(created.getTime()) && differenceInHours(new Date(), created) <= NEW_LEAD_HOURS) return 'new';
  return 'none';
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const mins = differenceInMinutes(now, d);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = differenceInHours(now, d);
  if (hrs < 24) return `${hrs}h ago`;
  const days = differenceInDays(now, d);
  if (days < 7) return `${days}d ago`;
  return format(d, 'd MMM');
}

function initials(lead: Lead): string {
  return `${lead.first_name?.[0] ?? ''}${lead.last_name?.[0] ?? ''}`.toUpperCase() || '?';
}

function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : null;
}

function sourceMeta(source: string | null | undefined, leadSources: LeadSource[]): { Icon: typeof Tag; label: string | null } {
  const label = source ? (leadSources.find(s => s.name === source)?.label || source) : null;
  const text = `${source ?? ''} ${label ?? ''}`.toLowerCase();
  if (text.includes('facebook')) return { Icon: Facebook, label };
  if (text.includes('instagram')) return { Icon: Instagram, label };
  if (text.includes('linkedin')) return { Icon: Linkedin, label };
  if (text.includes('referr') || text.includes('partner') || text.includes('existing client')) return { Icon: Users, label };
  if (text.includes('google') || text.includes('web') || text.includes('online')) return { Icon: Globe, label };
  return { Icon: Tag, label };
}

function followUpChip(bucket: Bucket, due: Date | null): { text: string; className: string } | null {
  if (!due || bucket === 'closed' || bucket === 'new' || bucket === 'none') return null;
  if (bucket === 'overdue') {
    const days = differenceInCalendarDays(new Date(), due);
    return {
      text: days <= 0 ? 'Follow-up overdue' : `Overdue by ${days}d`,
      className: 'bg-destructive/10 text-destructive',
    };
  }
  if (bucket === 'today') {
    return { text: 'Follow up today', className: 'bg-warning/10 text-warning' };
  }
  const days = differenceInCalendarDays(due, new Date());
  return {
    text: days <= 1 ? 'Follow up tomorrow' : `Follow up ${format(due, 'd MMM')}`,
    className: 'bg-info/10 text-info',
  };
}

function QuickActions({ lead, onSms }: { lead: Lead; onSms: (lead: Lead) => void }) {
  const tel = telHref(lead.phone);
  const email = lead.email ? `mailto:${lead.email}` : null;
  if (!tel && !lead.phone && !email) return null;
  const btn =
    'w-9 h-9 rounded-full flex items-center justify-center border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-foreground/25 hover:bg-muted/50 transition-colors';
  return (
    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
      {tel && (
        <a href={tel} aria-label={`Call ${lead.first_name}`} title="Call" className={btn}>
          <Phone className="w-4 h-4" strokeWidth={2} />
        </a>
      )}
      {lead.phone && (
        <button
          type="button"
          onClick={() => onSms(lead)}
          aria-label={`Text ${lead.first_name}`}
          title="Text"
          className={btn}
        >
          <MessageSquare className="w-4 h-4" strokeWidth={2} />
        </button>
      )}
      {email && (
        <a href={email} aria-label={`Email ${lead.first_name}`} title="Email" className={btn}>
          <Mail className="w-4 h-4" strokeWidth={2} />
        </a>
      )}
    </div>
  );
}

function LeadRow({
  lead,
  bucket,
  status,
  leadSources,
  getReferrerName,
  tasksByLead,
  onOpenLead,
  onSms,
}: {
  lead: Lead;
  bucket: Bucket;
  status: LeadStatus | undefined;
  leadSources: LeadSource[];
  getReferrerName?: (partnerId: string | null) => string | null;
  tasksByLead?: Map<string, LeadTask[]>;
  onOpenLead: (lead: Lead) => void;
  onSms: (lead: Lead) => void;
}) {
  const { Icon: SourceIcon, label: sourceLabel } = sourceMeta(lead.source, leadSources);
  const referrer = getReferrerName?.(lead.referral_partner_id ?? null);
  const due = nextFollowUp(lead, tasksByLead);
  const chip = followUpChip(bucket, due);
  const isNew = bucket === 'new';
  const overdue = hasOverdueTask(tasksByLead?.get(lead.id));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenLead(lead)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenLead(lead);
        }
      }}
      className={`w-full text-left flex items-center gap-3.5 px-4 sm:px-5 py-3.5 ${overdue ? 'bg-destructive/10 hover:bg-destructive/15' : 'hover:bg-muted/40 active:bg-muted/60'} transition-colors cursor-pointer group`}
    >
      <span className={`w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 ${avatarTint(`${lead.first_name} ${lead.last_name ?? ''}`)}`}>
        {initials(lead)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[15px] font-semibold tracking-tight truncate">
            {lead.first_name} {lead.last_name}
          </p>
          {isNew && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold tracking-wide shrink-0">
              NEW
            </span>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
          {(sourceLabel || referrer) && <SourceIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
          <span className="truncate">
            {[
              referrer ? `via ${referrer}` : sourceLabel,
              lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : null,
              status?.label,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </p>
        {chip && (
          <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${chip.className}`}>
            <AlarmClock className="w-3 h-3" strokeWidth={2.4} />
            {chip.text}
          </span>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[11px] text-muted-foreground/70 tabular-nums">{timeAgo(lead.created_at)}</span>
        <div className="hidden sm:flex">
          <QuickActions lead={lead} onSms={onSms} />
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
    </div>
  );
}

const SECTIONS: Record<
  Bucket,
  { title: string; Icon: typeof AlarmClock; iconClass: string; collapsible: boolean; defaultOpen: boolean }
> = {
  overdue: { title: 'Overdue follow-ups', Icon: AlarmClock, iconClass: 'bg-destructive/10 text-destructive', collapsible: false, defaultOpen: true },
  today: { title: 'Due today', Icon: CalendarClock, iconClass: 'bg-warning/10 text-warning', collapsible: false, defaultOpen: true },
  new: { title: 'New leads', Icon: Sparkles, iconClass: 'bg-primary/10 text-primary', collapsible: false, defaultOpen: true },
  upcoming: { title: 'Coming up', Icon: CalendarPlus, iconClass: 'bg-info/10 text-info', collapsible: false, defaultOpen: true },
  none: { title: 'No follow-up set', Icon: Inbox, iconClass: 'bg-muted text-muted-foreground', collapsible: true, defaultOpen: false },
  closed: { title: 'Settled & closed', Icon: CheckCircle2, iconClass: 'bg-success/10 text-success', collapsible: true, defaultOpen: false },
};

const SECTION_ORDER: Bucket[] = ['overdue', 'today', 'new', 'upcoming', 'none', 'closed'];

type Filter = 'all' | Bucket;

export function LeadsPriorityList({ leads, statuses, leadSources = [], getReferrerName, onOpenLead, tasksByLead, userName }: LeadsPriorityListProps) {
  const statusByName = useMemo(() => new Map(statuses.map(s => [s.name, s])), [statuses]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [smsLead, setSmsLead] = useState<Lead | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.entries(SECTIONS).map(([k, v]) => [k, v.defaultOpen])),
  );

  const bucketed = useMemo(() => {
    const map = new Map<Bucket, Lead[]>(SECTION_ORDER.map(b => [b, []]));
    const q = query.trim().toLowerCase();
    for (const lead of leads) {
      if (q) {
        const haystack = `${lead.first_name} ${lead.last_name} ${lead.opportunity_name ?? ''} ${lead.loan_purpose ?? ''} ${lead.email ?? ''} ${lead.phone ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      const bucket = getBucket(lead, statusByName.get(lead.status), tasksByLead);
      map.get(bucket)!.push(lead);
    }
    // Sort inside each bucket: by next follow-up where there is one, otherwise newest first.
    for (const [bucket, arr] of map) {
      arr.sort((a, b) => {
        const da = nextFollowUp(a, tasksByLead)?.getTime();
        const db = nextFollowUp(b, tasksByLead)?.getTime();
        if ((bucket === 'overdue' || bucket === 'today' || bucket === 'upcoming') && da && db) return da - db;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    return map;
  }, [leads, statusByName, tasksByLead, query]);

  const counts = useMemo(() => {
    const c = {} as Record<Bucket, number>;
    for (const b of SECTION_ORDER) c[b] = bucketed.get(b)!.length;
    return c;
  }, [bucketed]);

  const totalActive = counts.overdue + counts.today + counts.new + counts.upcoming + counts.none;

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalActive },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
    { key: 'today', label: 'Today', count: counts.today },
    { key: 'new', label: 'New', count: counts.new },
    { key: 'upcoming', label: 'Coming up', count: counts.upcoming },
    { key: 'none', label: 'No follow-up', count: counts.none },
  ];

  const visibleSections = SECTION_ORDER.filter(b => (filter === 'all' ? true : b === filter) && bucketed.get(b)!.length > 0);

  return (
    <div className="max-w-3xl pt-6 pb-16">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-tight">
          {userName ? `${userName}'s leads` : 'Leads'}
        </h2>
        <p className="text-[15px] text-muted-foreground mt-1.5">
          {totalActive === 0
            ? 'No active leads right now.'
            : counts.overdue > 0
              ? `${totalActive} active · ${counts.overdue} ${counts.overdue === 1 ? 'follow-up' : 'follow-ups'} overdue`
              : `${totalActive} active · you're on top of your follow-ups`}
        </p>
      </div>

      {/* Search */}
      <div className="mt-5 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search name, phone, email…"
          className="w-full h-11 pl-10 pr-4 rounded-2xl border border-border/70 bg-card text-sm placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-ring/30 transition-shadow shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]"
        />
      </div>

      {/* Filter pills */}
      <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[13px] font-medium whitespace-nowrap transition-all border ${
              filter === f.key
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border/70 hover:text-foreground hover:border-foreground/25'
            }`}
          >
            {f.label}
            <span className={`tabular-nums text-[11px] ${filter === f.key ? 'opacity-70' : 'opacity-50'}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="mt-5 space-y-4">
        {visibleSections.map(bucket => {
          const meta = SECTIONS[bucket];
          const sectionLeads = bucketed.get(bucket)!;
          const open = !meta.collapsible || (openSections[bucket] ?? meta.defaultOpen);
          return (
            <div
              key={bucket}
              className="rounded-3xl border border-border/70 bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_8px_24px_-12px_hsl(var(--foreground)/0.08)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => meta.collapsible && setOpenSections(s => ({ ...s, [bucket]: !open }))}
                className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 ${meta.collapsible ? 'hover:bg-muted/30 transition-colors' : 'cursor-default'}`}
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.iconClass}`}>
                  <meta.Icon className="w-4 h-4" strokeWidth={2.2} />
                </span>
                <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground flex-1 text-left">
                  {meta.title}
                </span>
                <span className="text-xs text-muted-foreground/70 tabular-nums">{sectionLeads.length}</span>
                {meta.collapsible &&
                  (open ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  ))}
              </button>
              {open && (
                <div className="divide-y divide-border/50 border-t border-border/50">
                  {sectionLeads.map(lead => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      bucket={bucket}
                      status={statusByName.get(lead.status)}
                      leadSources={leadSources}
                      getReferrerName={getReferrerName}
                      tasksByLead={tasksByLead}
                      onOpenLead={onOpenLead}
                      onSms={setSmsLead}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {visibleSections.length === 0 && (
          <div className="rounded-3xl border border-border/70 bg-card shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] px-6 py-14 text-center">
            <span className="mx-auto w-14 h-14 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-lg font-semibold tracking-tight">
              {query ? 'No leads match your search' : "You're all caught up"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query ? `Nothing found for “${query}”.` : 'No overdue follow-ups and no new leads waiting.'}
            </p>
          </div>
        )}
      </div>

      {leads.length === 0 && <p className="text-muted-foreground py-16 text-center text-sm">No leads found</p>}

      <SmsComposeDialog lead={smsLead} onClose={() => setSmsLead(null)} />
    </div>
  );
}
