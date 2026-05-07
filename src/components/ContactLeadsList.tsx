import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, CheckCircle2, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface ContactLead {
  id: string;
  opportunity_name: string | null;
  first_name: string;
  last_name: string;
  loan_amount: number | null;
  loan_purpose: string | null;
  status: string;
  settled_date: string | null;
  created_at: string;
}

interface Split {
  lead_id: string;
  lender: string | null;
  amount: number | null;
}

export function ContactLeadsList({
  contactId,
  isPreviewMode,
  onOpenLead,
}: {
  contactId: string;
  isPreviewMode: boolean;
  onOpenLead?: (leadId: string) => void;
}) {
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [splits, setSplits] = useState<Map<string, Split[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase
        .from('leads')
        .select('id, opportunity_name, first_name, last_name, loan_amount, loan_purpose, status, settled_date, created_at, source_contact_id, co_applicant_contact_id')
        .or(`source_contact_id.eq.${contactId},co_applicant_contact_id.eq.${contactId}`)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const list = (l as any[]) || [];
      setLeads(list);
      if (list.length) {
        const { data: s } = await supabase
          .from('loan_splits')
          .select('lead_id, lender, amount')
          .in('lead_id', list.map(x => x.id));
        const map = new Map<string, Split[]>();
        ((s as Split[]) || []).forEach(sp => {
          const arr = map.get(sp.lead_id) || [];
          arr.push(sp);
          map.set(sp.lead_id, arr);
        });
        if (!cancelled) setSplits(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [contactId, isPreviewMode]);

  if (loading) return <p className="text-xs text-muted-foreground">Loading loans…</p>;
  if (!leads.length) return <p className="text-xs text-muted-foreground">No loans linked to this contact yet.</p>;

  return (
    <div className="space-y-2">
      {leads.map(lead => {
        const isSettled = lead.status === 'settled' || !!lead.settled_date;
        const sp = splits.get(lead.id) || [];
        const lenders = Array.from(new Set(sp.map(x => x.lender).filter(Boolean))) as string[];
        return (
          <div
            key={lead.id}
            onClick={() => onOpenLead?.(lead.id)}
            className="border border-border rounded-lg p-3 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="font-semibold text-sm truncate">
                    {lead.opportunity_name || lead.loan_purpose || 'Loan Opportunity'}
                  </p>
                </div>
                {lead.loan_amount ? (
                  <p className="text-sm font-semibold tabular-nums mt-0.5">
                    ${lead.loan_amount.toLocaleString()}
                  </p>
                ) : null}
                {lenders.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{lenders.join(', ')}</span>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                {isSettled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Settled
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize">
                    {lead.status.replace(/_/g, ' ')}
                  </span>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(lead.settled_date || lead.created_at), 'd MMM yy')}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}