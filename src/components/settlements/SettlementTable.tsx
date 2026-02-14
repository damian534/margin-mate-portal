import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import type { Settlement } from '@/hooks/useSettlements';

const STATUS_STYLES: Record<string, string> = {
  settled: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  booked: 'bg-blue-100 text-blue-800 border-blue-200',
  docs_issue: 'bg-red-100 text-red-800 border-red-200',
  docs_returned: 'bg-purple-100 text-purple-800 border-purple-200',
  docs_issued: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  pending_approval: 'bg-amber-100 text-amber-800 border-amber-200',
};

const STATUS_LABELS: Record<string, string> = {
  settled: 'Settled',
  booked: 'Booked',
  docs_issue: 'Docs Issue',
  docs_returned: 'Docs Returned',
  docs_issued: 'Docs Issued',
  pending_approval: 'Pending Approval',
};

const APP_TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  refinance: 'Refinance',
  top_up: 'Top Up',
  purchase_refinance: 'P&R',
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function SettlementTable({ settlements }: { settlements: Settlement[] }) {
  if (settlements.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No settlements found</p>
        <p className="text-sm mt-1">Add your first settlement or adjust filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="text-xs font-semibold">Date</TableHead>
            <TableHead className="text-xs font-semibold">Client</TableHead>
            <TableHead className="text-xs font-semibold text-right">Loan Amount</TableHead>
            <TableHead className="text-xs font-semibold">Lender</TableHead>
            <TableHead className="text-xs font-semibold">Type</TableHead>
            <TableHead className="text-xs font-semibold">Source</TableHead>
            <TableHead className="text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold hidden lg:table-cell">Security Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settlements.map(s => (
            <TableRow key={s.id} className="hover:bg-muted/20">
              <TableCell className="text-sm">{format(parseISO(s.settlement_date), 'dd MMM yyyy')}</TableCell>
              <TableCell className="text-sm font-medium">{s.client_name}</TableCell>
              <TableCell className="text-sm font-mono text-right font-semibold">{formatAmount(Number(s.loan_amount))}</TableCell>
              <TableCell className="text-sm">{s.lender || '—'}</TableCell>
              <TableCell className="text-sm">{APP_TYPE_LABELS[s.application_type || ''] || s.application_type || '—'}</TableCell>
              <TableCell className="text-sm">{s.lead_source || '—'}</TableCell>
              <TableCell>
              <Badge variant="outline" className={`text-xs ${STATUS_STYLES[s.status] || ''}`}>
                  {STATUS_LABELS[s.status] || s.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">{s.security_address || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
