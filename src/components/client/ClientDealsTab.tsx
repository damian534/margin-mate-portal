import { format } from 'date-fns';
import { Briefcase, Building2, CheckCircle2 } from 'lucide-react';
import type { ClientDeal } from '@/hooks/useClientProfile';

interface Props {
  deals: ClientDeal[];
  onOpenDeal: (leadId: string) => void;
}

const ROLE_LABEL: Record<ClientDeal['role'], string> = {
  applicant: 'Applicant',
  'co-applicant': 'Co-applicant',
  referrer: 'Referrer',
};

export function ClientDealsTab({ deals, onOpenDeal }: Props) {
  if (!deals.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No deals linked to this client yet.</p>;
  }

  return (
    <div className="space-y-3">
      {deals.map(deal => {
        const isSettled = deal.status === 'settled' || !!deal.settled_date;
        const stage = deal.wip_status || deal.status;
        return (
          <button
            key={deal.id}
            onClick={() => onOpenDeal(deal.id)}
            className="w-full text-left rounded-xl border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary shrink-0" />
                  <p className="font-semibold truncate">
                    {deal.opportunity_name || deal.loan_purpose || `${deal.first_name} ${deal.last_name}`}
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                    {ROLE_LABEL[deal.role]}
                  </span>
                </div>
                {deal.loan_amount ? (
                  <p className="text-lg font-semibold tabular-nums mt-1">${Number(deal.loan_amount).toLocaleString()}</p>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {deal.lenders.length > 0 && (
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {deal.lenders.join(', ')}</span>
                  )}
                  {deal.source && <span>Source: {deal.source}</span>}
                  {deal.estimated_settlement_date && !isSettled && (
                    <span>Est. settlement {format(new Date(deal.estimated_settlement_date), 'd MMM yy')}</span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                {isSettled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Settled
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize">
                    {String(stage).replace(/_/g, ' ')}
                  </span>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(deal.settled_date || deal.created_at), 'd MMM yy')}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
