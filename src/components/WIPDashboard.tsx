import { LeadStatus } from '@/hooks/useLeadStatuses';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileDown, FileText } from 'lucide-react';

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
  lodged_date?: string | null;
  approved_date?: string | null;
  settled_date?: string | null;
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
}

export function WIPDashboard({ leads, leadStatuses = [], isPreviewMode, onOpenLead, onLocalUpdate, onSendBackToLead, docsByLead, onDownloadDocs }: WIPDashboardProps) {
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

  return (
    <div className="space-y-4">
      {/* Monthly KPIs are shown at the top of the CRM page */}

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
                      (() => {
                      const docs = docsByLead?.get(lead.id);
                      const docsPct = docs && docs.requested > 0 ? Math.round((docs.completed / docs.requested) * 100) : null;
                      return (
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
                        {docs && docs.requested > 0 && (
                          <div className="mt-2 space-y-1">
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
                        <div className="mt-2" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                          <Select
                            value={`wip:${lead.wip_status || ''}`}
                            onValueChange={(v) => {
                              if (v.startsWith('wip:')) update(lead.id, v.slice(4));
                              else if (v.startsWith('lead:')) onSendBackToLead?.(lead.id, v.slice(5));
                            }}
                          >
                            <SelectTrigger className="h-7 text-[11px]">
                              <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">WIP Stage</div>
                              {WIP_STATUSES.map(s => (
                                <SelectItem key={`wip-${s.name}`} value={`wip:${s.name}`} className="text-xs">
                                  <span className="inline-flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                    {s.label}
                                  </span>
                                </SelectItem>
                              ))}
                              {leadStatuses.length > 0 && (
                                <>
                                  <div className="px-2 py-1 mt-1 text-[10px] font-semibold uppercase text-muted-foreground border-t">Send Back to Lead</div>
                                  {leadStatuses.map(s => (
                                    <SelectItem key={`lead-${s.name}`} value={`lead:${s.name}`} className="text-xs">
                                      <span className="inline-flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                        {s.label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      );
                      })()
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