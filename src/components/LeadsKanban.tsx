import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, DollarSign, Users, ChevronsDownUp, ChevronsUpDown, ClipboardList, FileDown, FileText } from 'lucide-react';
import { WIP_STATUSES } from './WIPDashboard';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  loan_amount: number | null;
  loan_purpose: string | null;
  status: string;
  source?: string | null;
  referral_partner_id?: string | null;
  source_contact_id?: string | null;
  wip_status?: string | null;
  created_at: string;
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
}

export function LeadsKanban({ leads, statuses, leadSources = [], getReferrerName, getReferrerCompany, getContactName, onOpenLead, onUpdateStatus, onUpdateWipStatus, tasksByLead, taskDueFilter, docsByLead, onDownloadDocs }: LeadsKanbanProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

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
    if (leadId) {
      onUpdateStatus(leadId, statusName);
    }
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
      </div>

      <div className="flex gap-3 pb-4 overflow-x-auto" style={{ minHeight: '60vh', minWidth: 0 }}>
        {statuses.map(status => {
          const columnLeads = leads.filter(l => l.status === status.name);
          const totalAmount = columnLeads.reduce((sum, l) => sum + (l.loan_amount || 0), 0);
          const isCollapsed = collapsedColumns.has(status.name);

          return (
            <div
              key={status.name}
              className={`flex-shrink-0 flex flex-col transition-all ${isCollapsed ? 'w-12' : 'w-64'}`}
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

                  {/* Cards */}
                  <ScrollArea className="flex-1">
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
                            onClick={() => onOpenLead(lead)}
                            className="cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors border bg-card"
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
                                  {lead.first_name[0]}{lead.last_name?.[0] || ''}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm leading-tight truncate">{lead.first_name} {lead.last_name}</p>
                                  {lead.loan_purpose && (
                                    <p className="text-[11px] text-muted-foreground truncate">{lead.loan_purpose}</p>
                                  )}
                                </div>
                                {hasTask && (
                                  <ClipboardList className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                )}
                              </div>
                              {lead.loan_amount ? (
                                <p className="text-base font-semibold tabular-nums leading-none">
                                  ${lead.loan_amount.toLocaleString()}
                                </p>
                              ) : null}
                              {lead.source && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground inline-block">
                                  {leadSources.find(s => s.name === lead.source)?.label || lead.source}
                                </span>
                              )}
                              {/* Attribution: referral partner or client referral */}
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
                              {lead.source_contact_id && getContactName?.(lead.source_contact_id) && !lead.referral_partner_id && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/40">
                                  <Users className="w-3 h-3 shrink-0" />
                                  <span className="truncate">Referred by {getContactName(lead.source_contact_id)}</span>
                                </div>
                              )}
                              <p className="text-[10px] text-muted-foreground/70">{format(new Date(lead.created_at), 'dd MMM')}</p>
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
                                <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                  <Select
                                    value={lead.wip_status ? `wip:${lead.wip_status}` : `lead:${lead.status}`}
                                    onValueChange={(v) => {
                                      if (v.startsWith('wip:')) {
                                        onUpdateWipStatus?.(lead.id, v.slice(4));
                                      } else {
                                        onUpdateStatus(lead.id, v.slice(5));
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-[11px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">Lead Status</div>
                                      {statuses.map(s => (
                                        <SelectItem key={`lead-${s.name}`} value={`lead:${s.name}`} className="text-xs">
                                          <span className="inline-flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                            {s.label}
                                          </span>
                                        </SelectItem>
                                      ))}
                                      <div className="px-2 py-1 mt-1 text-[10px] font-semibold uppercase text-muted-foreground border-t">Move to WIP</div>
                                      {WIP_STATUSES.map(s => (
                                        <SelectItem key={`wip-${s.name}`} value={`wip:${s.name}`} className="text-xs">
                                          <span className="inline-flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                            {s.label}
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
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
    </div>
  );
}
