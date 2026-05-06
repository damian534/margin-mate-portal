import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const WIP_STATUSES = [
  { name: 'onboarding', label: 'Onboarding', color: '#94a3b8' },
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

interface WIPLead {
  id: string;
  first_name: string;
  last_name: string;
  loan_amount: number | null;
  wip_status?: string | null;
  status: string;
}

interface WIPDashboardProps {
  leads: WIPLead[];
  isPreviewMode: boolean;
  onOpenLead: (lead: any) => void;
  onLocalUpdate: (leadId: string, wip_status: string | null) => void;
}

export function WIPDashboard({ leads, isPreviewMode, onOpenLead, onLocalUpdate }: WIPDashboardProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, WIPLead[]>();
    WIP_STATUSES.forEach(s => map.set(s.name, []));
    for (const l of leads) {
      const key = l.wip_status || '';
      if (map.has(key)) map.get(key)!.push(l);
    }
    return map;
  }, [leads]);

  const totals = useMemo(() => {
    const t = new Map<string, { count: number; volume: number }>();
    WIP_STATUSES.forEach(s => {
      const arr = grouped.get(s.name) || [];
      t.set(s.name, {
        count: arr.length,
        volume: arr.reduce((sum, l) => sum + (l.loan_amount || 0), 0),
      });
    });
    return t;
  }, [grouped]);

  const totalActive = leads.filter(l => l.wip_status && l.wip_status !== 'settled').length;
  const totalVolume = leads
    .filter(l => l.wip_status && l.wip_status !== 'settled')
    .reduce((s, l) => s + (l.loan_amount || 0), 0);

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Active in Pipeline</p>
            <p className="text-2xl font-bold">{totalActive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pipeline Volume</p>
            <p className="text-2xl font-bold">${totalVolume.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Settled (this view)</p>
            <p className="text-2xl font-bold">{(grouped.get('settled') || []).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {WIP_STATUSES.map(stage => {
            const stageLeads = grouped.get(stage.name) || [];
            const t = totals.get(stage.name)!;
            return (
              <div
                key={stage.name}
                className="w-64 shrink-0 rounded-lg border bg-muted/30"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const leadId = e.dataTransfer.getData('leadId');
                  if (leadId) update(leadId, stage.name);
                }}
              >
                <div className="p-3 border-b" style={{ borderTopColor: stage.color, borderTopWidth: 3 }}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-tight">{stage.label}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-background border">{t.count}</span>
                  </div>
                  {t.volume > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">${t.volume.toLocaleString()}</p>
                  )}
                </div>
                <div className="p-2 space-y-2 min-h-[100px]">
                  {stageLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Drop leads here</p>
                  ) : (
                    stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('leadId', lead.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={() => onOpenLead(lead)}
                        className="rounded-md border bg-card p-2 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors"
                      >
                        <p className="text-sm font-medium truncate">{lead.first_name} {lead.last_name}</p>
                        {lead.loan_amount ? (
                          <p className="text-xs text-muted-foreground">${lead.loan_amount.toLocaleString()}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}