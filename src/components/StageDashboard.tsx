import { useMemo, useState } from 'react';
import { Search, ChevronRight, PauseCircle, CircleX, BadgeCheck, CheckCircle2, List, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AssigneeFilter, AssigneeBadge } from '@/components/AssigneePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { LeadsKanban } from '@/components/LeadsKanban';
import { stageDashboard } from '@/lib/crmDashboardGroups';
import { usePersistedState } from '@/hooks/usePersistedState';
import type { LeadStatus } from '@/hooks/useLeadStatuses';
import type { WipStatus } from '@/hooks/useWipStatuses';
import { hasOverdueTask } from '@/lib/dealTaskUrgency';

interface StageLead {
  id: string; first_name: string; last_name: string; email: string | null; phone: string | null;
  loan_amount: number | null; loan_purpose: string | null; status: string; created_at: string;
  source: string | null; referral_partner_id: string | null;
  assigned_to?: string | null; stage_entered_at?: string | null; updated_at: string;
  settled_date?: string | null;
  opportunity_name?: string | null; source_contact_id?: string | null; referred_by_contact_id?: string | null;
  wip_status?: string | null; lead_sort_order?: number | null;
}

interface StageTask { id: string; lead_id: string; due_date: string | null; completed: boolean }
interface StageDocs { requested: number; completed: number; files: { path: string; name: string; label?: string }[] }

interface Props<T extends StageLead> {
  stage: 'parked' | 'lost' | 'preapproved' | 'settled'; leads: T[]; loading: boolean; onOpenLead: (lead: T) => void;
  leadSources: { name: string; label: string }[];
  getReferrerName: (id: string | null) => string | null;
  statuses: LeadStatus[];
  onUpdateStatus: (leadId: string, status: string) => void;
  wipStatuses?: WipStatus[];
  onUpdateWipStatus?: (leadId: string, wipStatus: string) => void;
  getReferrerCompany?: (id: string | null) => string | null;
  getContactName?: (id: string | null) => string | null;
  tasksByLead?: Map<string, StageTask[]>;
  docsByLead?: Map<string, StageDocs>;
  onDownloadDocs?: (leadId: string) => void;
}

export function StageDashboard<T extends StageLead>({ stage, leads, loading, onOpenLead, leadSources, getReferrerName, statuses, onUpdateStatus, wipStatuses = [], onUpdateWipStatus, getReferrerCompany, getContactName, tasksByLead, docsByLead, onDownloadDocs }: Props<T>) {
  const [search, setSearch] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [view, setView] = usePersistedState<'list' | 'board'>(`crm.stage.${stage}.view`, 'list');
  const { title, Icon } = {
    parked: { title: 'Parked', Icon: PauseCircle },
    lost: { title: 'Lost', Icon: CircleX },
    preapproved: { title: 'Pre-approved', Icon: BadgeCheck },
    settled: { title: 'Settled', Icon: CheckCircle2 },
  }[stage];
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(lead => {
      if (assignees.length && !assignees.includes(lead.assigned_to || '__unassigned__')) return false;
      return !q || [lead.first_name, lead.last_name, lead.email, lead.phone, getReferrerName(lead.referral_partner_id)].join(' ').toLowerCase().includes(q);
    });
  }, [leads, search, assignees, getReferrerName]);

  // Board columns mirror getDealDashboard's grouping: a lead-status column when the lead's
  // status maps to this dashboard, otherwise a wip column (prefixed) for the wip stage that
  // maps here — settled/pre-approved deals are grouped by their wip stage, not lead status.
  const WIP_PREFIX = 'wip:';
  const columnKeyFor = (lead: StageLead): string => {
    if (stageDashboard(lead.status, statuses) === stage) return lead.status;
    if (lead.wip_status && stageDashboard(lead.wip_status, wipStatuses) === stage) return `${WIP_PREFIX}${lead.wip_status}`;
    return lead.status;
  };
  const groupStatuses = useMemo<LeadStatus[]>(() => {
    const cols: LeadStatus[] = [
      ...statuses.filter(s => stageDashboard(s.name, statuses) === stage),
      ...wipStatuses.filter(w => stageDashboard(w.name, wipStatuses) === stage).map(w => ({ ...w, name: `${WIP_PREFIX}${w.name}` })),
    ];
    const known = new Set(cols.map(c => c.name));
    const missing = [...new Set(leads.map(columnKeyFor).filter(key => key && !known.has(key)))];
    return [...cols, ...missing.map(name => ({ id: `missing-${name}`, name, label: name.startsWith(WIP_PREFIX) ? name.slice(WIP_PREFIX.length) : name, color: 'hsl(var(--muted-foreground))', display_order: 999 }))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses, wipStatuses, leads, stage]);

  // Cards can move to any lead status or wip stage; wip targets are labelled to disambiguate.
  const moveStatuses = useMemo<LeadStatus[]>(() => [
    ...statuses,
    ...wipStatuses.map(w => ({ ...w, name: `${WIP_PREFIX}${w.name}`, label: `${w.label} (WIP)` })),
  ], [statuses, wipStatuses]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const boardLeads = useMemo(() => visible.map(lead => ({ ...lead, status: columnKeyFor(lead) })), [visible, statuses, wipStatuses, stage]);

  const handleMove = (leadId: string, columnKey: string) => {
    if (columnKey.startsWith(WIP_PREFIX)) onUpdateWipStatus?.(leadId, columnKey.slice(WIP_PREFIX.length));
    else onUpdateStatus(leadId, columnKey);
  };

  return (
    <section className="space-y-6" aria-label={`${title} dashboard`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-xl font-semibold">{title}</h2>
          <span className="text-sm tabular-nums text-muted-foreground">{visible.length} deals</span>
        </div>
        <p className="text-lg font-semibold tabular-nums">${visible.reduce((sum, lead) => sum + (lead.loan_amount || 0), 0).toLocaleString('en-AU')}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={`Search ${title.toLowerCase()} deals`} placeholder={`Search ${title.toLowerCase()} deals…`} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <AssigneeFilter value={assignees} onChange={setAssignees} />
        <div className="flex rounded-lg border p-0.5 sm:ml-auto" role="group" aria-label={`${title} view`}>
          <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1.5" onClick={() => setView('list')} aria-pressed={view === 'list'}>
            <List className="h-3.5 w-3.5" /> List
          </Button>
          <Button variant={view === 'board' ? 'secondary' : 'ghost'} size="sm" className="h-7 gap-1.5" onClick={() => setView('board')} aria-pressed={view === 'board'}>
            <LayoutGrid className="h-3.5 w-3.5" /> Board
          </Button>
        </div>
      </div>
      {loading ? <p className="py-12 text-center text-muted-foreground">Loading deals…</p> : visible.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{search || assignees.length ? 'No matching deals' : `No ${title.toLowerCase()} deals`}</p>
      ) : view === 'board' ? (
        <LeadsKanban
          leads={boardLeads}
          colourMode={stage === 'settled' || stage === 'preapproved' ? 'overdue' : 'aging'}
          statuses={groupStatuses}
          moveStatuses={moveStatuses}
          persistKeyPrefix={`crm.stage.${stage}.kanban`}
          leadSources={leadSources}
          getReferrerName={getReferrerName}
          getReferrerCompany={getReferrerCompany}
          getContactName={getContactName}
          onOpenLead={(lead) => onOpenLead(lead as T)}
          onUpdateStatus={handleMove}
          tasksByLead={tasksByLead}
          docsByLead={docsByLead}
          onDownloadDocs={onDownloadDocs}
        />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Client</TableHead><TableHead>Contact</TableHead><TableHead>Source / referrer</TableHead>
            <TableHead>Amount</TableHead><TableHead>Assignee</TableHead><TableHead>{stage === 'settled' ? 'Settlement date' : `${title} since`}</TableHead><TableHead className="w-10" />
          </TableRow></TableHeader>
          <TableBody>{visible.map(lead => (
            <TableRow key={lead.id} onClick={() => onOpenLead(lead)} className={`cursor-pointer ${(stage === 'settled' || stage === 'preapproved') && hasOverdueTask(tasksByLead?.get(lead.id)) ? 'bg-destructive/10 hover:bg-destructive/15' : ''}`}>
              <TableCell className="font-medium"><Button variant="link" className="h-auto p-0 text-foreground text-left whitespace-normal" onClick={e => { e.stopPropagation(); onOpenLead(lead); }}>{lead.first_name} {lead.last_name}</Button></TableCell>
              <TableCell><div>{lead.email || '—'}</div><div className="text-xs text-muted-foreground">{lead.phone}</div></TableCell>
              <TableCell><div>{leadSources.find(s => s.name === lead.source)?.label || lead.source || '—'}</div><div className="text-xs text-muted-foreground">{getReferrerName(lead.referral_partner_id)}</div></TableCell>
              <TableCell className="tabular-nums">{lead.loan_amount ? `$${lead.loan_amount.toLocaleString('en-AU')}` : '—'}</TableCell>
              <TableCell><AssigneeBadge userId={lead.assigned_to ?? null} /></TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">{stage === 'settled' ? (lead.settled_date ? format(new Date(lead.settled_date), 'dd MMM yyyy') : '—') : format(new Date(lead.stage_entered_at || lead.updated_at), 'dd MMM yyyy')}</TableCell>
              <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </section>
  );
}
