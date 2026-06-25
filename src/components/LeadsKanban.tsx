import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, DollarSign, Users, ChevronsDownUp, ChevronsUpDown, ClipboardList, FileDown, FileText, MoreVertical, Maximize2, Minimize2, Plus } from 'lucide-react';
import { AssigneeBadge } from '@/components/AssigneePicker';
import { usePersistedState, usePersistedStringSet } from '@/hooks/usePersistedState';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { HorizontalScrollWithTopBar } from '@/components/HorizontalScrollWithTopBar';

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
  source_contact_id?: string | null;
  referred_by_contact_id?: string | null;
  wip_status?: string | null;
  created_at: string;
  assigned_to?: string | null;
  lead_sort_order?: number | null;
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

interface LeadsKanbanProps {
  leads: Lead[];
  statuses: LeadStatus[];
  leadSources?: LeadSource[];
  getReferrerName?: (partnerId: string | null) => string | null;
  getReferrerCompany?: (partnerId: string | null) => string | null;
  getContactName?: (contactId: string | null) => string | null;
  onOpenLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: string) => void;
  onUpdateWipStatus?: (leadId: string, wipStatus: string) => void;
  tasksByLead?: Map<string, LeadTask[]>;
  taskDueFilter?: string;
  docsByLead?: Map<string, { requested: number; completed: number; files: { path: string; name: string }[] }>;
  onDownloadDocs?: (leadId: string) => void;
  onAddInStage?: (statusName: string) => void;
}

export function LeadsKanban({ leads, statuses, leadSources = [], getReferrerName, getReferrerCompany, getContactName, onOpenLead, onUpdateStatus, onUpdateWipStatus, tasksByLead, taskDueFilter, docsByLead, onDownloadDocs, onAddInStage }: LeadsKanbanProps) {
  const [collapsedColumns, setCollapsedColumns] = usePersistedStringSet('crm.leads.kanban.collapsedColumns', []);
  const [compact, setCompact] = usePersistedState<boolean>('crm.leads.kanban.compact', false);
  // Local optimistic overrides for sort_order and status to keep DnD snappy.
  const [sortOverrides, setSortOverrides] = useState<Record<string, number>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [dragOverCard, setDragOverCard] = useState<{ leadId: string; position: 'before' | 'after' } | null>(null);

  const getSort = (l: Lead) => sortOverrides[l.id] ?? l.lead_sort_order ?? null;
  const getStatus = (l: Lead) => statusOverrides[l.id] ?? l.status;
  const sortLeads = (arr: Lead[]) => [...arr].sort((a, b) => {
    const av = getSort(a); const bv = getSort(b);
    if (av == null && bv == null) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (av == null) return 1;
    if (bv == null) return -1;
    return av - bv;
  });

  // Auto-expand columns that have leads when a task filter is applied
  useEffect(() => {
    if (taskDueFilter && taskDueFilter !== 'all_leads') {
      const statusesWithLeads = new Set(leads.map(l => l.status));
      setCollapsedColumns(prev => {
        const next = new Set(prev);
        // Expand columns that have matching leads
        for (const s of statusesWithLeads) {
          next.delete(s);
        }
        return next;
      });
    }
  }, [taskDueFilter, leads]);

  const toggleCollapse = (statusName: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(statusName)) next.delete(statusName);
      else next.add(statusName);
      return next;
    });
  };

  const collapseAll = () => {
    setCollapsedColumns(new Set(statuses.map(s => s.name)));
  };

  const expandAll = () => {
    setCollapsedColumns(new Set());
  };

  const allCollapsed = statuses.length > 0 && collapsedColumns.size === statuses.length;

  const getLeadHasActiveTasks = (leadId: string): boolean => {
    if (!tasksByLead) return false;
    const tasks = tasksByLead.get(leadId);
    if (!tasks) return false;
    return tasks.some(t => !t.completed);
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, statusName: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;
    // Drop at end of column
    const sorted = sortLeads(leads.filter(l => getStatus(l) === statusName && l.id !== leadId));
    const lastSort = sorted.length > 0 ? (getSort(sorted[sorted.length - 1]) ?? 0) : 0;
    const newSort = lastSort + 1000;
    setSortOverrides(prev => ({ ...prev, [leadId]: newSort }));
    const movingLead = leads.find(l => l.id === leadId);
    if (movingLead && getStatus(movingLead) !== statusName) {
      setStatusOverrides(prev => ({ ...prev, [leadId]: statusName }));
      onUpdateStatus(leadId, statusName);
    }
    supabase.from('leads').update({ lead_sort_order: newSort } as any).eq('id', leadId).then(({ error }) => {
      if (error) console.error('Failed to save lead order', error);
    });
    setDragOverCard(null);
  };

  const handleCardDrop = (e: React.DragEvent, targetLead: Lead, statusName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId || leadId === targetLead.id) { setDragOverCard(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dropAfter = e.clientY > rect.top + rect.height / 2;
    const sorted = sortLeads(leads.filter(l => getStatus(l) === statusName && l.id !== leadId));
    const targetIdx = sorted.findIndex(l => l.id === targetLead.id);
    if (targetIdx === -1) { setDragOverCard(null); return; }
    // Find neighbours
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
    const movingLead = leads.find(l => l.id === leadId);
    if (movingLead && getStatus(movingLead) !== statusName) {
      setStatusOverrides(prev => ({ ...prev, [leadId]: statusName }));
      onUpdateStatus(leadId, statusName);
    }
    supabase.from('leads').update({ lead_sort_order: newSort } as any).eq('id', leadId).then(({ error }) => {
      if (error) console.error('Failed to save lead order', error);
    });
    setDragOverCard(null);
  };

  return (
    <div className="min-w-0 overflow-hidden">
      {/* Collapse/Expand All toggle */}
      <div className="flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground"
          onClick={allCollapsed ? expandAll : collapseAll}
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
          className="h-7 text-xs gap-1.5 text-muted-foreground ml-1"
          onClick={() => setCompact(c => !c)}
        >
          {compact ? (<><Maximize2 className="w-3.5 h-3.5" /> Normal</>) : (<><Minimize2 className="w-3.5 h-3.5" /> Compact</>)}
        </Button>
      </div>

      <HorizontalScrollWithTopBar style={{ minHeight: '60vh' }}>
        <div className="flex gap-3 pb-4" style={{ minWidth: 'max-content' }}>
        {statuses.map(status => {
          const columnLeads = sortLeads(leads.filter(l => getStatus(l) === status.name));
          const totalAmount = columnLeads.reduce((sum, l) => sum + (l.loan_amount || 0), 0);
          const isCollapsed = collapsedColumns.has(status.name);

          return (
            <div
              key={status.name}
              className={`flex-shrink-0 flex flex-col transition-all ${isCollapsed ? 'w-10' : compact ? 'w-44' : 'w-64'}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status.name)}
            >
              {/* Column header */}
              {isCollapsed ? (
                <div
                  className="flex flex-col items-center gap-2 cursor-pointer py-2 px-1 rounded-lg bg-muted/50 h-full"
                  onClick={() => toggleCollapse(status.name)}
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                  <span className="text-xs font-semibold [writing-mode:vertical-lr] rotate-180">{status.label}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{columnLeads.length}</span>
                  {totalAmount > 0 && (
                    <span className="text-[10px] text-muted-foreground font-medium [writing-mode:vertical-lr] rotate-180">
                      ${(totalAmount / 1000).toFixed(0)}k
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col rounded-lg border bg-muted/30 h-full">
                  <div
                    className="p-3 border-b cursor-pointer group"
                    style={{ borderTopColor: status.color, borderTopWidth: 3 }}
                    onClick={() => toggleCollapse(status.name)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                        <h3 className="text-sm font-semibold leading-tight truncate">{status.label}</h3>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-background border shrink-0">{columnLeads.length}</span>
                    </div>
                    {totalAmount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">${totalAmount.toLocaleString()}</p>
                    )}
                  </div>
                  {onAddInStage && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAddInStage(status.name); }}
                      className="mx-2 mt-2 inline-flex items-center justify-center gap-1 py-1.5 rounded-md border border-dashed border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-background/60 transition"
                    >
                      <Plus className="w-3 h-3" /> Add card
                    </button>
                  )}

                  {/* Cards */}
                  <ScrollArea className="flex-1 max-h-[calc(100vh-340px)]">
                    <div className="p-2 space-y-2">
                      {columnLeads.map(lead => {
                        const hasTask = getLeadHasActiveTasks(lead.id);
                        const docs = docsByLead?.get(lead.id);
                        const docsPct = docs && docs.requested > 0 ? Math.round((docs.completed / docs.requested) * 100) : null;
                        return (
                          <Card
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const after = e.clientY > rect.top + rect.height / 2;
                              setDragOverCard({ leadId: lead.id, position: after ? 'after' : 'before' });
                            }}
                            onDragLeave={(e) => {
                              e.stopPropagation();
                              setDragOverCard(prev => prev?.leadId === lead.id ? null : prev);
                            }}
                            onDrop={(e) => handleCardDrop(e, lead, status.name)}
                            onClick={() => onOpenLead(lead)}
                            className={`cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors border bg-card ${
                              dragOverCard?.leadId === lead.id && dragOverCard.position === 'before' ? 'border-t-2 border-t-primary' : ''
                            } ${
                              dragOverCard?.leadId === lead.id && dragOverCard.position === 'after' ? 'border-b-2 border-b-primary' : ''
                            }`}
                          >
                            <CardContent className={compact ? "p-2 space-y-1.5" : "p-3 space-y-2"}>
                              <div className="flex items-start gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
                                  {lead.first_name[0]}{lead.last_name?.[0] || ''}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {lead.opportunity_name && (
                                    <p className="font-semibold text-sm leading-tight truncate text-foreground">{lead.opportunity_name}</p>
                                  )}
                                  <p className={`${lead.opportunity_name ? 'text-xs text-muted-foreground' : 'font-semibold text-sm'} leading-tight truncate`}>
                                    {lead.first_name} {lead.last_name}
                                  </p>
                                  {lead.loan_purpose && (
                                    <p className="text-[11px] text-muted-foreground truncate">{lead.loan_purpose}</p>
                                  )}
                                </div>
                                {hasTask && (
                                  <ClipboardList className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                )}
                                <AssigneeBadge userId={lead.assigned_to ?? null} />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1" title="Move to status">
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="max-h-[60vh] overflow-y-auto bg-popover z-50">
                                    <DropdownMenuLabel className="text-xs">Move to status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {statuses.map(s => (
                                      <DropdownMenuItem
                                        key={s.name}
                                        disabled={s.name === status.name}
                                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(lead.id, s.name); }}
                                        className="text-xs"
                                      >
                                        <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: s.color }} />
                                        {s.label}
                                        {s.name === status.name && <span className="ml-auto text-muted-foreground">(current)</span>}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              {/* Primary meta — loan amount and source on one row */}
                              {(lead.loan_amount || lead.source) && (
                                <div className="flex items-center justify-between gap-2">
                                  {lead.loan_amount ? (
                                    <span className="text-xs font-semibold tabular-nums text-foreground">
                                      ${lead.loan_amount.toLocaleString()}
                                    </span>
                                  ) : <span />}
                                  {lead.source && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[60%]">
                                      {leadSources.find(s => s.name === lead.source)?.label || lead.source}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Footer meta — attribution + date on one divided row */}
                              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                  {lead.referral_partner_id && getReferrerName?.(lead.referral_partner_id) ? (
                                    <>
                                      <Users className="w-3 h-3 shrink-0" />
                                      <span className="truncate">
                                        {getReferrerName(lead.referral_partner_id)}
                                        {getReferrerCompany?.(lead.referral_partner_id) && (
                                          <span className="opacity-70"> · {getReferrerCompany(lead.referral_partner_id)}</span>
                                        )}
                                      </span>
                                    </>
                                  ) : lead.referred_by_contact_id && getContactName?.(lead.referred_by_contact_id) ? (
                                    <>
                                      <Users className="w-3 h-3 shrink-0" />
                                      <span className="truncate">Referred by {getContactName(lead.referred_by_contact_id)}</span>
                                    </>
                                  ) : (
                                    <span className="opacity-60">Direct</span>
                                  )}
                                </div>
                                <span className="shrink-0 opacity-70 tabular-nums">{format(new Date(lead.created_at), 'dd MMM')}</span>
                              </div>

                              {docs && docs.requested > 0 && (
                                <div className="pt-1.5 border-t border-border/40 space-y-1">
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
                      {columnLeads.length === 0 && (
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
    </div>
  );
}
