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

/** Get the current Australian FY label e.g. "FY26" for Jul 2025 – Jun 2026 */
function getCurrentFY() {
  const now = new Date();
  const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return { fyStartYear, label: `FY${(fyStartYear + 1).toString().slice(-2)}` };
}

function getFYPeriodDates(period: string): { from: string; to: string } | null {
  const { fyStartYear } = getCurrentFY();
  const fmt = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  switch (period) {
    case 'ytd':
      return { from: fmt(fyStartYear, 7, 1), to: new Date().toISOString().slice(0, 10) };
    case 'q1': // Jul-Sep
      return { from: fmt(fyStartYear, 7, 1), to: fmt(fyStartYear, 9, 30) };
    case 'q2': // Oct-Dec
      return { from: fmt(fyStartYear, 10, 1), to: fmt(fyStartYear, 12, 31) };
    case 'q3': // Jan-Mar
      return { from: fmt(fyStartYear + 1, 1, 1), to: fmt(fyStartYear + 1, 3, 31) };
    case 'q4': // Apr-Jun
      return { from: fmt(fyStartYear + 1, 4, 1), to: fmt(fyStartYear + 1, 6, 30) };
    default:
      return null;
  }
}

export function SettlementFiltersBar({ filters, filterOptions, isSuperAdmin, brokers, updateFilter, resetFilters }: Props) {
  const { label: fyLabel } = getCurrentFY();

  const handlePeriod = (period: string) => {
    if (period === 'all') {
      updateFilter('dateFrom', '');
      updateFilter('dateTo', '');
      updateFilter('month', '');
      return;
    }
    const dates = getFYPeriodDates(period);
    if (dates) {
      updateFilter('month', '');
      updateFilter('dateFrom', dates.from);
      updateFilter('dateTo', dates.to);
    }
  };

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
        <Label className="text-xs text-muted-foreground">Period ({fyLabel})</Label>
        <Select defaultValue="all" onValueChange={handlePeriod}>
          <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="All Time" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="ytd">FYTD</SelectItem>
            <SelectItem value="q1">Q1 (Jul–Sep)</SelectItem>
            <SelectItem value="q2">Q2 (Oct–Dec)</SelectItem>
            <SelectItem value="q3">Q3 (Jan–Mar)</SelectItem>
            <SelectItem value="q4">Q4 (Apr–Jun)</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {filterOptions.applicationTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
