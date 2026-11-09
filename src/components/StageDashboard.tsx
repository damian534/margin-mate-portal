import { useMemo, useState } from 'react';
import { Search, ChevronRight, PauseCircle, CircleX, BadgeCheck, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AssigneeFilter, AssigneeBadge } from '@/components/AssigneePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface StageLead {
  id: string; first_name: string; last_name: string; email: string | null; phone: string | null;
  loan_amount: number | null; source: string | null; referral_partner_id: string | null;
  assigned_to?: string | null; stage_entered_at?: string | null; updated_at: string;
  settled_date?: string | null;
}

interface Props<T extends StageLead> {
  stage: 'parked' | 'lost' | 'preapproved' | 'settled'; leads: T[]; loading: boolean; onOpenLead: (lead: T) => void;
  leadSources: { name: string; label: string }[];
  getReferrerName: (id: string | null) => string | null;
}

export function StageDashboard<T extends StageLead>({ stage, leads, loading, onOpenLead, leadSources, getReferrerName }: Props<T>) {
  const [search, setSearch] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const { title, Icon } = {
    parked: { title: 'Parked', Icon: PauseCircle },
    lost: { title: 'Lost', Icon: CircleX },
    preapproved: { title: 'Pre-approved', Icon: BadgeCheck },
    settled: { title: 'Settled', Icon: CheckCircle2 },
  }[stage];
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(lead => {
      if (assignees.length && !assignees.includes(lead.assigned_to || '__unassigned__')) return false;
      return !q || [lead.first_name, lead.last_name, lead.email, lead.phone, getReferrerName(lead.referral_partner_id)].join(' ').toLowerCase().includes(q);
    });
  }, [leads, search, assignees, getReferrerName]);

  return (
    <section className="space-y-6" aria-label={`${title} dashboard`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-xl font-semibold">{title}</h2>
          <span className="text-sm tabular-nums text-muted-foreground">{visible.length} deals</span>
        </div>
        <p className="text-lg font-semibold tabular-nums">${visible.reduce((sum, lead) => sum + (lead.loan_amount || 0), 0).toLocaleString('en-AU')}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={`Search ${title.toLowerCase()} deals`} placeholder={`Search ${title.toLowerCase()} deals…`} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <AssigneeFilter value={assignees} onChange={setAssignees} />
      </div>
      {loading ? <p className="py-12 text-center text-muted-foreground">Loading deals…</p> : visible.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{search || assignees.length ? 'No matching deals' : `No ${title.toLowerCase()} deals`}</p>
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Client</TableHead><TableHead>Contact</TableHead><TableHead>Source / referrer</TableHead>
            <TableHead>Amount</TableHead><TableHead>Assignee</TableHead><TableHead>{stage === 'settled' ? 'Settlement date' : `${title} since`}</TableHead><TableHead className="w-10" />
          </TableRow></TableHeader>
          <TableBody>{visible.map(lead => (
            <TableRow key={lead.id} onClick={() => onOpenLead(lead)} className="cursor-pointer">
              <TableCell className="font-medium"><Button variant="link" className="h-auto p-0 text-foreground text-left whitespace-normal" onClick={e => { e.stopPropagation(); onOpenLead(lead); }}>{lead.first_name} {lead.last_name}</Button></TableCell>
              <TableCell><div>{lead.email || '—'}</div><div className="text-xs text-muted-foreground">{lead.phone}</div></TableCell>
              <TableCell><div>{leadSources.find(s => s.name === lead.source)?.label || lead.source || '—'}</div><div className="text-xs text-muted-foreground">{getReferrerName(lead.referral_partner_id)}</div></TableCell>
              <TableCell className="tabular-nums">{lead.loan_amount ? `$${lead.loan_amount.toLocaleString('en-AU')}` : '—'}</TableCell>
              <TableCell><AssigneeBadge userId={lead.assigned_to ?? null} /></TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">{stage === 'settled' ? (lead.settled_date ? format(new Date(lead.settled_date), 'dd MMM yyyy') : '—') : format(new Date(lead.stage_entered_at || lead.updated_at), 'dd MMM yyyy')}</TableCell>
              <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </section>
  );
}