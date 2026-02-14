import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw } from 'lucide-react';
import type { SettlementFilters as Filters } from '@/hooks/useSettlements';

interface Props {
  filters: Filters;
  filterOptions: {
    lenders: string[];
    applicationTypes: string[];
    leadSources: string[];
    statuses: string[];
  };
  isSuperAdmin: boolean;
  brokers: { id: string; name: string }[];
  updateFilter: (key: keyof Filters, value: string) => void;
  resetFilters: () => void;
}

const APP_TYPES: Record<string, string> = {
  purchase: 'Purchase',
  refinance: 'Refinance',
  top_up: 'Top Up',
  purchase_refinance: 'P&R',
};

export function SettlementFiltersBar({ filters, filterOptions, isSuperAdmin, brokers, updateFilter, resetFilters }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {isSuperAdmin && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Broker</Label>
          <Select value={filters.brokerId} onValueChange={v => updateFilter('brokerId', v)}>
            <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="All Brokers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brokers</SelectItem>
              {brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Month</Label>
        <Input type="month" className="w-[160px] h-9 text-sm" value={filters.month} onChange={e => updateFilter('month', e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input type="date" className="w-[140px] h-9 text-sm" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input type="date" className="w-[140px] h-9 text-sm" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={filters.status} onValueChange={v => updateFilter('status', v)}>
          <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="docs_issue">Docs Issue</SelectItem>
            <SelectItem value="docs_returned">Docs Returned</SelectItem>
            <SelectItem value="docs_issued">Docs Issued</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Lender</Label>
        <Select value={filters.lender} onValueChange={v => updateFilter('lender', v)}>
          <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lenders</SelectItem>
            {filterOptions.lenders.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <Select value={filters.applicationType} onValueChange={v => updateFilter('applicationType', v)}>
          <SelectTrigger className="w-[120px] h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(APP_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Source</Label>
        <Select value={filters.leadSource} onValueChange={v => updateFilter('leadSource', v)}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {filterOptions.leadSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9">
        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
      </Button>
    </div>
  );
}
