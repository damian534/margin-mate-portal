import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, DollarSign } from 'lucide-react';

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
  created_at: string;
}

interface LeadSource {
  name: string;
  label: string;
}

interface LeadsKanbanProps {
  leads: Lead[];
  statuses: LeadStatus[];
  leadSources?: LeadSource[];
  onOpenLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: string) => void;
}

export function LeadsKanban({ leads, statuses, leadSources = [], onOpenLead, onUpdateStatus }: LeadsKanbanProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  const toggleCollapse = (statusName: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(statusName)) next.delete(statusName);
      else next.add(statusName);
      return next;
    });
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
                    {columnLeads.map(lead => (
                      <Card
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => onOpenLead(lead)}
                        className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                        style={{ borderLeftColor: status.color }}
                      >
                        <CardContent className="p-3 space-y-1.5">
                          <p className="font-medium text-sm">{lead.first_name} {lead.last_name}</p>
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
                          <p className="text-xs text-muted-foreground">{format(new Date(lead.created_at), 'dd MMM')}</p>
                        </CardContent>
                      </Card>
                    ))}
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
  );
}
