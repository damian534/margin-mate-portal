import { LeadStatus } from '@/hooks/useLeadStatuses';
import { usePersistedState, usePersistedStringSet } from '@/hooks/usePersistedState';
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileDown, FileText, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search, X, MoreVertical, Maximize2, Minimize2, List, Columns, CalendarClock, ClipboardList } from 'lucide-react';
import { AssigneeBadge, AssigneeFilter } from '@/components/AssigneePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { Users } from 'lucide-react';
import { HorizontalScrollWithTopBar } from '@/components/HorizontalScrollWithTopBar';
import { useWipStatuses } from '@/hooks/useWipStatuses';
import { StatusSettings } from '@/components/StatusSettings';

export const WIP_STATUSES = [
  { name: 'pending_fact_find', label: 'Pending Fact Find', color: '#cbd5e1' },
  { name: 'onboarding', label: 'Onboarding', color: '#94a3b8' },
  { name: 'pending_additional_docs', label: 'Pending Additional Documents', color: '#84cc16' },
  { name: 'sent_for_onboarding', label: 'Sent for Onboarding', color: '#7c9eb2' },
  { name: 'researching', label: 'Researching', color: '#64748b' },
  { name: 'proposal_sent', label: 'Proposal Sent', color: '#0ea5e9' },
  { name: 'new_application', label: 'New Application', color: '#3b82f6' },
  { name: 'app_sent_signing', label: 'Application Sent for Signing', color: '#6366f1' },
  { name: 'lodged', label: 'Lodged', color: '#8b5cf6' },
  { name: 'preapproved', label: 'Preapproved', color: '#a855f7' },
  { name: 'mir_issued', label: 'MIR Issued', color: '#f59e0b' },
  { name: 'mir_resolved', label: 'MIR Resolved', color: '#eab308' },
  { name: 'aip_not_lodged', label: 'AIP > Full Not Yet Lodged', color: '#f97316' },
  { name: 'conditional_approval', label: 'Conditional Approval', color: '#14b8a6' },
  { name: 'formal_approval', label: 'Formal Approval', color: '#10b981' },
  { name: 'loan_docs_issued', label: 'Loan Docs Issued', color: '#06b6d4' },
  { name: 'loan_docs_returned', label: 'Loan Docs Returned to Lender', color: '#0891b2' },
  { name: 'loan_docs_certified', label: 'Loan Docs Certified', color: '#0e7490' },
  { name: 'pending_settlement_conditions', label: 'Pending Settlement Conditions', color: '#d97706' },
  { name: 'pending_settlement', label: 'Pending Settlement', color: '#ca8a04' },
  { name: 'settled', label: 'Settled', color: '#22c55e' },
] as const;

export type WIPStatusName = typeof WIP_STATUSES[number]['name'];

type WipTaskDueFilter = 'all_leads' | 'overdue' | 'today' | 'tomorrow' | 'later' | 'no_tasks';

interface WipLeadTask {
  id: string;
  lead_id: string;
  due_date: string | null;
  completed: boolean;
}

function getWipLeadTaskDueCategory(leadId: string, tasksByLead?: Map<string, WipLeadTask[]>): WipTaskDueFilter {
  const tasks = tasksByLead?.get(leadId);
  if (!tasks || tasks.length === 0) return 'no_tasks';
  const active = tasks.filter(t => !t.completed);
  if (active.length === 0) return 'no_tasks';
  const withDue = active.filter(t => t.due_date).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  if (withDue.length === 0) return 'later';
  const earliest = new Date(withDue[0].due_date!);
  if (isToday(earliest)) return 'today';
  if (isTomorrow(earliest)) return 'tomorrow';
  if (isPast(earliest)) return 'overdue';
  return 'later';
}

interface WIPLead {
  id: string;
  first_name: string;
  opportunity_name?: string | null;
  last_name: string;
  loan_amount: number | null;
  wip_status?: string | null;
  status: string;
  lodged_date?: string | null;
  approved_date?: string | null;
  settled_date?: string | null;
  assigned_to?: string | null;
  loan_purpose?: string | null;
  source?: string | null;
  referral_partner_id?: string | null;
  source_contact_id?: string | null;
  referred_by_contact_id?: string | null;
  created_at?: string | null;
  email?: string | null;
  phone?: string | null;
  wip_sort_order?: number | null;
}

interface LeadSource {
  name: string;
  label: string;
}

interface WIPDashboardProps {
  leads: WIPLead[];
  leadStatuses?: LeadStatus[];
  isPreviewMode: boolean;
  onOpenLead: (lead: any) => void;
  onLocalUpdate: (leadId: string, wip_status: string | null) => void;
  onSendBackToLead?: (leadId: string, leadStatus: string) => void;
  docsByLead?: Map<string, { requested: number; completed: number; files: { path: string; name: string }[] }>;
  onDownloadDocs?: (leadId: string) => void;
  leadSources?: LeadSource[];
  getReferrerName?: (partnerId: string | null) => string | null;
  getReferrerCompany?: (partnerId: string | null) => string | null;
  getContactName?: (contactId: string | null) => string | null;
  externalSearch?: string;
  tasksByLead?: Map<string, WipLeadTask[]>;
}

export function WIPDashboard({ leads, leadStatuses = [], isPreviewMode, onOpenLead, onLocalUpdate, onSendBackToLead, docsByLead, onDownloadDocs, leadSources = [], getReferrerName, getReferrerCompany, getContactName, externalSearch, tasksByLead }: WIPDashboardProps) {
  const { statuses: wipStatusesDynamic, addStatus, updateStatus: updateWipStatusConfig, deleteStatus, reorderStatuses } = useWipStatuses();
  const wipStatuses = wipStatusesDynamic.length > 0 ? wipStatusesDynamic : (WIP_STATUSES as unknown as { name: string; label: string; color: string }[]);
  const [assigneeFilter, setAssigneeFilter] = usePersistedState<string[]>('crm.wip.assigneeFilterMulti', []);
  const [collapsedColumns, setCollapsedColumns] = usePersistedStringSet('crm.wip.collapsedColumns', []);
  const [search, setSearch] = usePersistedState<string>('crm.wip.search', '');
  const [sortOverrides, setSortOverrides] = useState<Record<string, number>>({});
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});
  const [dragOverCard, setDragOverCard] = useState<{ leadId: string; position: 'before' | 'after' } | null>(null);

  const getSort = (l: WIPLead) => sortOverrides[l.id] ?? l.wip_sort_order ?? null;
  const getStage = (l: WIPLead) => stageOverrides[l.id] ?? l.wip_status ?? '';
  const sortLeadsArr = (arr: WIPLead[]) => [...arr].sort((a, b) => {
    const av = getSort(a); const bv = getSort(b);
    if (av == null && bv == null) return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv;
  });
  const [compact, setCompact] = usePersistedState<boolean>('crm.wip.compact', false);
  const [view, setView] = usePersistedState<'kanban' | 'list'>('crm.wip.view', 'kanban');
  const [taskDueFilter, setTaskDueFilter] = usePersistedState<WipTaskDueFilter>('crm.wip.taskDueFilter', 'all_leads');

  const toggleCollapse = (name: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const collapseAll = () => setCollapsedColumns(new Set(wipStatuses.map(s => s.name)));
  const expandAll = () => setCollapsedColumns(new Set());
  const allCollapsed = collapsedColumns.size === wipStatuses.length;

  const visibleLeads = useMemo(() => {
    let result = leads;
    if (assigneeFilter.length > 0) {
      const wantUnassigned = assigneeFilter.includes('__unassigned__');
      result = result.filter(l => {
        if (!l.assigned_to) return wantUnassigned;
        return assigneeFilter.includes(l.assigned_to);
      });
    }
    const effective = (externalSearch && externalSearch.trim()) ? externalSearch : search;
    const q = effective.trim().toLowerCase();
    if (q) {
      result = result.filter(l =>
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
        (l.opportunity_name || '').toLowerCase().includes(q) ||
        String(l.loan_amount || '').includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (getReferrerName?.(l.referral_partner_id ?? null) || '').toLowerCase().includes(q)
      );
    }
    if (taskDueFilter !== 'all_leads') {
      result = result.filter(l => getWipLeadTaskDueCategory(l.id, tasksByLead) === taskDueFilter);
    }
    return result;
  }, [leads, assigneeFilter, search, externalSearch, getReferrerName, taskDueFilter, tasksByLead]);

  const grouped = useMemo(() => {
    const map = new Map<string, WIPLead[]>();
    wipStatuses.forEach(s => map.set(s.name, []));
    for (const l of visibleLeads) {
      const key = getStage(l);
      if (map.has(key)) map.get(key)!.push(l);
    }
    // Sort each column by manual order
    for (const [k, arr] of map.entries()) map.set(k, sortLeadsArr(arr));
    return map;
  }, [visibleLeads, wipStatuses, sortOverrides, stageOverrides]);

  const totals = useMemo(() => {
    const t = new Map<string, { count: number; volume: number }>();
    wipStatuses.forEach(s => {
      const arr = grouped.get(s.name) || [];
      t.set(s.name, {
        count: arr.length,
        volume: arr.reduce((sum, l) => sum + (l.loan_amount || 0), 0),
      });
    });
    return t;
  }, [grouped, wipStatuses]);

  const totalActive = leads.filter(l => l.wip_status && l.wip_status !== 'settled').length;
  const totalVolume = leads
    .filter(l => l.wip_status && l.wip_status !== 'settled')
    .reduce((s, l) => s + (l.loan_amount || 0), 0);

  const monthly = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const inThisMonth = (d?: string | null) => {
      if (!d) return false;
      const dt = new Date(d);
      return dt.getFullYear() === y && dt.getMonth() === m;
    };
    const acc = (key: 'lodged_date' | 'approved_date' | 'settled_date') => {
      const arr = leads.filter(l => inThisMonth(l[key]));
      return {
        count: arr.length,
        volume: arr.reduce((s, l) => s + (l.loan_amount || 0), 0),
      };
    };
    return {
      lodged: acc('lodged_date'),
      approved: acc('approved_date'),
      settled: acc('settled_date'),
    };
  }, [leads]);

  const monthLabel = new Date().toLocaleString('en-AU', { month: 'long', year: 'numeric' });

  const update = async (leadId: string, wip_status: string) => {
    onLocalUpdate(leadId, wip_status);
    if (isPreviewMode) {
      toast.success('WIP status updated (preview)');
      return;
    }
    const { error } = await supabase.from('leads').update({ wip_status } as any).eq('id', leadId);
    if (error) {
      toast.error('Failed to update WIP status');
    } else {
      toast.success('WIP status updated');
    }
  };

  const reorderToEnd = async (leadId: string, stageName: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const sorted = sortLeadsArr(leads.filter(l => getStage(l) === stageName && l.id !== leadId));
    const lastSort = sorted.length > 0 ? (getSort(sorted[sorted.length - 1]) ?? 0) : 0;
    const newSort = lastSort + 1000;
    setSortOverrides(prev => ({ ...prev, [leadId]: newSort }));
    if (getStage(lead) !== stageName) {
      setStageOverrides(prev => ({ ...prev, [leadId]: stageName }));
      await update(leadId, stageName);
    }
    if (!isPreviewMode) {
      await supabase.from('leads').update({ wip_sort_order: newSort } as any).eq('id', leadId);
    }
  };

  const reorderBeforeCard = async (e: React.DragEvent, target: WIPLead, stageName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const leadId = e.dataTransfer.getData('leadId');
    setDragOverCard(null);
    if (!leadId || leadId === target.id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dropAfter = e.clientY > rect.top + rect.height / 2;
    const sorted = sortLeadsArr(leads.filter(l => getStage(l) === stageName && l.id !== leadId));
    const targetIdx = sorted.findIndex(l => l.id === target.id);
    if (targetIdx === -1) return;
    const prevIdx = dropAfter ? targetIdx : targetIdx - 1;
    const nextIdx = dropAfter ? targetIdx + 1 : targetIdx;
    const prevSort = prevIdx >= 0 ? (getSort(sorted[prevIdx]) ?? null) : null;
    const nextSort = nextIdx < sorted.length ? (getSort(sorted[nextIdx]) ?? null) : null;
    let newSort: number;
    if (prevSort != null && nextSort != null) newSort = (prevSort + nextSort) / 2;
    else if (prevSort != null) newSort = prevSort + 1000;
    else if (nextSort != null) newSort = nextSort - 1000;
    else newSort = 1000;
    setSortOverrides(prev => ({ ...prev, [leadId]: newSort }));
    const moving = leads.find(l => l.id === leadId);
    if (moving && getStage(moving) !== stageName) {
      setStageOverrides(prev => ({ ...prev, [leadId]: stageName }));
      await update(leadId, stageName);
    }
    if (!isPreviewMode) {
      await supabase.from('leads').update({ wip_sort_order: newSort } as any).eq('id', leadId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Monthly KPIs are shown at the top of the CRM page */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search WIP by name, opportunity, or amount..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex justify-end gap-2 sm:ml-auto">
        <div className="flex items-center border rounded-md">
          <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setView('list')} title="List view">
            <List className="w-4 h-4" />
          </Button>
          <Button variant={view === 'kanban' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setView('kanban')} title="Board view">
            <Columns className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground"
          onClick={allCollapsed ? expandAll : collapseAll}
          disabled={view === 'list'}
        >
          {allCollapsed ? (
            <><ChevronsUpDown className="w-3.5 h-3.5" /> Expand All</>
          ) : (
            <><ChevronsDownUp className="w-3.5 h-3.5" /> Collapse All</>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground"
          onClick={() => setCompact(c => !c)}
        >
          {compact ? (<><Maximize2 className="w-3.5 h-3.5" /> Normal</>) : (<><Minimize2 className="w-3.5 h-3.5" /> Compact</>)}
        </Button>
        <AssigneeFilter value={assigneeFilter} onChange={setAssigneeFilter} className="w-full sm:w-56" />
        <StatusSettings
          statuses={wipStatuses as any}
          onAdd={addStatus}
          onUpdate={updateWipStatusConfig}
          onDelete={deleteStatus}
          onReorder={reorderStatuses as any}
          title="WIP Statuses"
          triggerLabel="Manage WIP Statuses"
        />
        </div>
      </div>

      {/* Task due date filter */}
      <div className="flex items-center gap-1 flex-wrap">
        <CalendarClock className="w-4 h-4 text-muted-foreground mr-1" />
        {([
          { value: 'all_leads' as WipTaskDueFilter, label: 'All Deals' },
          { value: 'overdue' as WipTaskDueFilter, label: 'Overdue Tasks' },
          { value: 'today' as WipTaskDueFilter, label: 'Due Today' },
          { value: 'tomorrow' as WipTaskDueFilter, label: 'Due Tomorrow' },
          { value: 'later' as WipTaskDueFilter, label: 'Due Later' },
          { value: 'no_tasks' as WipTaskDueFilter, label: 'No Tasks' },
        ]).map(opt => {
          const wipLeads = leads.filter(l => l.wip_status);
          const count = opt.value === 'all_leads'
            ? wipLeads.length
            : wipLeads.filter(l => getWipLeadTaskDueCategory(l.id, tasksByLead) === opt.value).length;
          return (
            <Button
              key={opt.value}
              variant={taskDueFilter === opt.value ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-7 text-xs gap-1.5 ${opt.value === 'overdue' && count > 0 && taskDueFilter !== opt.value ? 'text-destructive' : ''}`}
              onClick={() => setTaskDueFilter(opt.value)}
            >
              {opt.label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  taskDueFilter === opt.value ? 'bg-background text-foreground' :
                  opt.value === 'overdue' && count > 0 ? 'bg-destructive/10 text-destructive' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {view === 'list' ? (
        visibleLeads.filter(l => l.wip_status).length === 0 ? (
          <Card><CardContent className="p-0"><p className="text-muted-foreground text-center py-12">No deals in WIP</p></CardContent></Card>
        ) : (
          <div className="space-y-6">
            {wipStatuses.map(stage => {
              const stageLeads = sortLeadsArr(visibleLeads.filter(l => getStage(l) === stage.name));
              const stageTotal = stageLeads.reduce((s, l) => s + (l.loan_amount || 0), 0);
              return (
                <div
                  key={stage.name}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const leadId = e.dataTransfer.getData('leadId');
                    if (leadId) reorderToEnd(leadId, stage.name);
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="text-sm font-semibold">{stage.label}</h3>
                    {stageTotal > 0 && (
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        ${stageTotal.toLocaleString()}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">({stageLeads.length})</span>
                  </div>
                  {stageLeads.length === 0 ? (
                    <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                      Drop deals here
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Client</TableHead>
                              <TableHead>Opportunity</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Assignee</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stageLeads.map(lead => {
                              const activeTasks = tasksByLead?.get(lead.id)?.filter(t => !t.completed) || [];
                              const hasTask = activeTasks.length > 0;
                              return (
                              <TableRow
                                key={lead.id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('leadId', lead.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  const after = e.clientY > rect.top + rect.height / 2;
                                  setDragOverCard({ leadId: lead.id, position: after ? 'after' : 'before' });
                                }}
                                onDragLeave={(e) => { e.stopPropagation(); setDragOverCard(prev => prev?.leadId === lead.id ? null : prev); }}
                                onDrop={(e) => reorderBeforeCard(e, lead, stage.name)}
                                className={`cursor-grab active:cursor-grabbing hover:bg-muted/50 ${
                                  dragOverCard?.leadId === lead.id && dragOverCard.position === 'before' ? 'border-t-2 border-t-primary' : ''
                                } ${
                                  dragOverCard?.leadId === lead.id && dragOverCard.position === 'after' ? 'border-b-2 border-b-primary' : ''
                                }`}
                                onClick={() => onOpenLead(lead)}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-1.5">
                                    {lead.first_name} {lead.last_name}
                                    {hasTask && (
                                      <span title={`${activeTasks.length} active task${activeTasks.length > 1 ? 's' : ''}`}>
                                        <ClipboardList className="w-3.5 h-3.5 text-primary shrink-0" />
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{lead.opportunity_name || '—'}</TableCell>
                                <TableCell className="tabular-nums">{lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '—'}</TableCell>
                                <TableCell><AssigneeBadge userId={lead.assigned_to ?? null} /></TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Move to stage">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="max-h-[60vh] overflow-y-auto bg-popover z-50">
                                      <DropdownMenuLabel className="text-xs">Move to stage</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {wipStatuses.map(s => (
                                        <DropdownMenuItem
                                          key={s.name}
                                          disabled={s.name === lead.wip_status}
                                          onClick={() => update(lead.id, s.name)}
                                          className="text-xs"
                                        >
                                          <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                                          {s.label}
                                          {s.name === lead.wip_status && <span className="ml-auto text-muted-foreground">(current)</span>}
                                        </DropdownMenuItem>
                                      ))}
                                      {onSendBackToLead && leadStatuses.length > 0 && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuLabel className="text-xs">Send back to Leads</DropdownMenuLabel>
                                          {leadStatuses.map(ls => (
                                            <DropdownMenuItem
                                              key={ls.name}
                                              onClick={() => onSendBackToLead(lead.id, ls.name)}
                                              className="text-xs"
                                            >
                                              <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: ls.color }} />
                                              {ls.label}
                                            </DropdownMenuItem>
                                          ))}
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
      <HorizontalScrollWithTopBar style={{ minHeight: '60vh' }}>
        <div className="flex gap-3 pb-4" style={{ minWidth: 'max-content' }}>
          {wipStatuses.map(stage => {
            const stageLeads = grouped.get(stage.name) || [];
            const t = totals.get(stage.name)!;
            const isCollapsed = collapsedColumns.has(stage.name);
            return (
              <div
                key={stage.name}
                className={`flex-shrink-0 flex flex-col transition-all ${isCollapsed ? 'w-10' : compact ? 'w-44' : 'w-64'}`}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const leadId = e.dataTransfer.getData('leadId');
                  if (leadId) reorderToEnd(leadId, stage.name);
                }}
              >
                {isCollapsed ? (
                  <div
                    className="flex flex-col items-center gap-2 cursor-pointer py-2 px-1 rounded-lg bg-muted/50 h-full"
                    onClick={() => toggleCollapse(stage.name)}
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold [writing-mode:vertical-lr] rotate-180">{stage.label}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{t.count}</span>
                    {t.volume > 0 && (
                      <span className="text-[10px] text-muted-foreground font-medium [writing-mode:vertical-lr] rotate-180">
                        ${(t.volume / 1000).toFixed(0)}k
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col rounded-lg border bg-muted/30 h-full">
                    <div
                      className="p-3 border-b cursor-pointer group"
                      style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
                      onClick={() => toggleCollapse(stage.name)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                          <h3 className="text-sm font-semibold leading-tight truncate">{stage.label}</h3>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-background border shrink-0">{t.count}</span>
                      </div>
                      {t.volume > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">${t.volume.toLocaleString()}</p>
                      )}
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-2">
                        {stageLeads.map(lead => {
                          const docs = docsByLead?.get(lead.id);
                          const docsPct = docs && docs.requested > 0 ? Math.round((docs.completed / docs.requested) * 100) : null;
                          const displayTitle = lead.opportunity_name?.trim() || `${lead.first_name} ${lead.last_name}`;
                          const fullName = `${lead.first_name} ${lead.last_name}`;
                          const hasOpportunity = !!lead.opportunity_name?.trim();
                          const activeTasks = tasksByLead?.get(lead.id)?.filter(t => !t.completed) || [];
                          const hasTask = activeTasks.length > 0;
                          return (
                            <Card
                              key={lead.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('leadId', lead.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const after = e.clientY > rect.top + rect.height / 2;
                                setDragOverCard({ leadId: lead.id, position: after ? 'after' : 'before' });
                              }}
                              onDragLeave={(e) => { e.stopPropagation(); setDragOverCard(prev => prev?.leadId === lead.id ? null : prev); }}
                              onDrop={(e) => reorderBeforeCard(e, lead, stage.name)}
                              onClick={() => onOpenLead(lead)}
                              className={`cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors border bg-card ${
                                dragOverCard?.leadId === lead.id && dragOverCard.position === 'before' ? 'border-t-2 border-t-primary' : ''
                              } ${
                                dragOverCard?.leadId === lead.id && dragOverCard.position === 'after' ? 'border-b-2 border-b-primary' : ''
                              }`}
                            >
                              <CardContent className={compact ? "p-2 space-y-1" : "p-3 space-y-2"}>
                                <div className="flex items-start gap-2">
                                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
                                    {lead.first_name?.[0] || ''}{lead.last_name?.[0] || ''}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {hasOpportunity ? (
                                      <>
                                        <p className="font-semibold text-sm leading-tight break-words text-foreground" title={displayTitle}>{displayTitle}</p>
                                        <p className="text-xs text-muted-foreground leading-tight truncate">{fullName}</p>
                                      </>
                                    ) : (
                                      <p className="font-semibold text-sm leading-tight break-words" title={fullName}>{fullName}</p>
                                    )}
                                    {lead.loan_purpose && (
                                      <p className="text-[11px] text-muted-foreground truncate">{lead.loan_purpose}</p>
                                    )}
                                  </div>
                                  {hasTask && (
                                    <span title={`${activeTasks.length} active task${activeTasks.length > 1 ? 's' : ''}`}>
                                      <ClipboardList className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                    </span>
                                  )}
                                  <AssigneeBadge userId={lead.assigned_to ?? null} />
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1" title="Move to stage">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="max-h-[60vh] overflow-y-auto bg-popover z-50">
                                      <DropdownMenuLabel className="text-xs">Move to stage</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {wipStatuses.map(s => (
                                        <DropdownMenuItem
                                          key={s.name}
                                          disabled={s.name === stage.name}
                                          onClick={(e) => { e.stopPropagation(); update(lead.id, s.name); }}
                                          className="text-xs"
                                        >
                                          <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                                          {s.label}
                                          {s.name === stage.name && <span className="ml-auto text-muted-foreground">(current)</span>}
                                        </DropdownMenuItem>
                                      ))}
                                      {onSendBackToLead && leadStatuses.length > 0 && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuLabel className="text-xs">Send back to Leads</DropdownMenuLabel>
                                          {leadStatuses.map(ls => (
                                            <DropdownMenuItem
                                              key={ls.name}
                                              onClick={(e) => { e.stopPropagation(); onSendBackToLead(lead.id, ls.name); }}
                                              className="text-xs"
                                            >
                                              <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: ls.color }} />
                                              {ls.label}
                                            </DropdownMenuItem>
                                          ))}
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                {lead.loan_amount ? (
                                  <p className="text-xs font-semibold tabular-nums leading-none text-muted-foreground">
                                    ${lead.loan_amount.toLocaleString()}
                                  </p>
                                ) : null}
                                {lead.source && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground inline-block">
                                    {leadSources.find(s => s.name === lead.source)?.label || lead.source}
                                  </span>
                                )}
                                {lead.referral_partner_id && getReferrerName?.(lead.referral_partner_id) && (
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/40">
                                    <Users className="w-3 h-3 shrink-0" />
                                    <span className="truncate">
                                      {getReferrerName(lead.referral_partner_id)}
                                      {getReferrerCompany?.(lead.referral_partner_id) && (
                                        <span className="opacity-70"> · {getReferrerCompany(lead.referral_partner_id)}</span>
                                      )}
                                    </span>
                                  </div>
                                )}
                                {lead.referred_by_contact_id && getContactName?.(lead.referred_by_contact_id) && !lead.referral_partner_id && (
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/40">
                                    <Users className="w-3 h-3 shrink-0" />
                                    <span className="truncate">Referred by {getContactName(lead.referred_by_contact_id)}</span>
                                  </div>
                                )}
                                <p className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border/40">
                                  {lead.created_at ? format(new Date(lead.created_at), 'dd MMM') : ''}
                                </p>
                                {docs && docs.requested > 0 && (
                                  <div className="pt-1 border-t border-border/40 space-y-1">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Docs {docsPct}%</span>
                                      {docs.files.length > 0 && onDownloadDocs && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); onDownloadDocs(lead.id); }}
                                          className="text-primary hover:underline inline-flex items-center gap-0.5"
                                          title="Download all uploaded documents as ZIP"
                                        >
                                          <FileDown className="w-3 h-3" /> ZIP
                                        </button>
                                      )}
                                    </div>
                                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                                      <div className="h-full bg-primary transition-all" style={{ width: `${docsPct}%` }} />
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                        {stageLeads.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">Drop leads here</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </HorizontalScrollWithTopBar>
      )}
    </div>
  );
}