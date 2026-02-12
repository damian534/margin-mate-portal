import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, DollarSign, Users, ChevronsDownUp, ChevronsUpDown, ClipboardList } from 'lucide-react';

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
  tasksByLead?: Map<string, LeadTask[]>;
  taskDueFilter?: string;
}

export function LeadsKanban({ leads, statuses, leadSources = [], getReferrerName, getReferrerCompany, getContactName, onOpenLead, onUpdateStatus, tasksByLead, taskDueFilter }: LeadsKanbanProps) {
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
    <div>
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

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
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
                <>
                  <div
                    className="flex items-center gap-2 mb-1 px-1 cursor-pointer group"
                    onClick={() => toggleCollapse(status.name)}
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="text-sm font-semibold">{status.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{columnLeads.length}</span>
                  </div>

                  {/* Total deal value */}
                  <div className="flex items-center gap-1 px-1 mb-3">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {totalAmount > 0 ? `$${totalAmount.toLocaleString()}` : '$0'}
                    </span>
                  </div>

                  {/* Cards */}
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 pr-2">
                      {columnLeads.map(lead => {
                        const hasTask = getLeadHasActiveTasks(lead.id);
                        return (
                          <Card
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onClick={() => onOpenLead(lead)}
                            className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                            style={{ borderLeftColor: status.color }}
                          >
                            <CardContent className="p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{lead.first_name} {lead.last_name}</p>
                                {hasTask && (
                                  <ClipboardList className="w-3.5 h-3.5 text-primary shrink-0" />
                                )}
                              </div>
                              {lead.loan_purpose && (
                                <p className="text-xs text-muted-foreground">{lead.loan_purpose}</p>
                              )}
                              {lead.loan_amount && (
                                <p className="text-xs font-medium">${lead.loan_amount.toLocaleString()}</p>
                              )}
                              {lead.source && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground inline-block">
                                  {leadSources.find(s => s.name === lead.source)?.label || lead.source}
                                </span>
                              )}
                              {/* Attribution: referral partner or client referral */}
                              {lead.referral_partner_id && getReferrerName?.(lead.referral_partner_id) && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
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
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Users className="w-3 h-3 shrink-0" />
                                  <span className="truncate">Referred by {getContactName(lead.source_contact_id)}</span>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">{format(new Date(lead.created_at), 'dd MMM')}</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {columnLeads.length === 0 && (
                        <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                          Drop leads here
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
