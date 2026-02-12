import { Card, CardContent } from '@/components/ui/card';
import { LeadStatus } from '@/hooks/useLeadStatuses';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  loan_amount: number | null;
  loan_purpose: string | null;
  status: string;
  created_at: string;
}

interface LeadsKanbanProps {
  leads: Lead[];
  statuses: LeadStatus[];
  onOpenLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: string) => void;
}

export function LeadsKanban({ leads, statuses, onOpenLead, onUpdateStatus }: LeadsKanbanProps) {
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
        return (
          <div
            key={status.name}
            className="flex-shrink-0 w-64 flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.name)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-sm font-semibold">{status.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{columnLeads.length}</span>
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
          </div>
        );
      })}
    </div>
  );
}
