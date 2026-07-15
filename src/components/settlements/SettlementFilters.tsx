import { useState, useMemo } from 'react';
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

/** Get the current Australian FY start year (Jul 2025 – Jun 2026 => 2025) */
function getCurrentFYStartYear() {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

function fyLabel(startYear: number) {
  return `FY${(startYear + 1).toString().slice(-2)}`;
}

function getFYPeriodDates(period: string, fyStartYear: number): { from: string; to: string } | null {
  const fmt = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayIso = new Date().toISOString().slice(0, 10);
  const fyEnd = fmt(fyStartYear + 1, 6, 30);
  switch (period) {
    case 'fy':
      return { from: fmt(fyStartYear, 7, 1), to: fyEnd };
    case 'ytd':
      return { from: fmt(fyStartYear, 7, 1), to: todayIso < fyEnd ? todayIso : fyEnd };
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

const MONTH_NAMES = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export function SettlementFiltersBar({ filters, filterOptions, isSuperAdmin, brokers, updateFilter, resetFilters }: Props) {
  const currentFyStart = getCurrentFYStartYear();
  const [selectedFy, setSelectedFy] = useState<number>(currentFyStart);
  // Default to the full current FY so top-of-page KPIs immediately reflect
  // the selected financial year rather than all-time totals.
  const [selectedPeriod, setSelectedPeriod] = useState<string>('fy');

  // Apply the default FY range once on mount so KPIs are scoped from the start.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { applyPeriod('fy', currentFyStart); }, []);

  // Offer 5 past FYs + current + 2 future
  const fyOptions = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentFyStart + 2; y >= currentFyStart - 5; y--) arr.push(y);
    return arr;
  }, [currentFyStart]);

  const applyPeriod = (period: string, fyStart: number) => {
    if (period === 'all') {
      updateFilter('dateFrom', '');
      updateFilter('dateTo', '');
      updateFilter('month', '');
      return;
    }
    const dates = getFYPeriodDates(period, fyStart);
    if (dates) {
      updateFilter('month', '');
      updateFilter('dateFrom', dates.from);
      updateFilter('dateTo', dates.to);
    }
  };

  const handleFyChange = (v: string) => {
    const y = Number(v);
    setSelectedFy(y);
    // Always re-scope KPIs & table to the newly selected FY. If the user
    // was on "All Time", switch to Full FY so the dashboard reflects it.
    const period = selectedPeriod === 'all' ? 'fy' : selectedPeriod;
    if (selectedPeriod === 'all') setSelectedPeriod('fy');
    applyPeriod(period, y);
  };

  const handlePeriod = (period: string) => {
    setSelectedPeriod(period);
    applyPeriod(period, selectedFy);
  };

  const handleMonth = (v: string) => {
    if (v === 'all') {
      updateFilter('month', '');
      return;
    }
    // v is index 0-11 within FY (Jul=0 ... Jun=11)
    const idx = Number(v);
    const calMonth = ((idx + 6) % 12) + 1; // Jul->7 ... Jun->6
    const calYear = idx < 6 ? selectedFy : selectedFy + 1;
    updateFilter('dateFrom', '');
    updateFilter('dateTo', '');
    updateFilter('month', `${calYear}-${String(calMonth).padStart(2, '0')}`);
  };

  const currentMonthValue = (() => {
    if (!filters.month) return 'all';
    const [y, m] = filters.month.split('-').map(Number);
    const idx = m >= 7 ? m - 7 : m + 5;
    const fyStart = m >= 7 ? y : y - 1;
    if (fyStart !== selectedFy) return 'all';
    return String(idx);
  })();

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
        <Label className="text-xs text-muted-foreground">Financial Year</Label>
        <Select value={String(selectedFy)} onValueChange={handleFyChange}>
          <SelectTrigger className="w-[110px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {fyOptions.map(y => (
              <SelectItem key={y} value={String(y)}>
                {fyLabel(y)}{y === currentFyStart ? ' (current)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select value={selectedPeriod} onValueChange={handlePeriod}>
          <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="All Time" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="fy">Full {fyLabel(selectedFy)}</SelectItem>
            {selectedFy === currentFyStart && <SelectItem value="ytd">FYTD</SelectItem>}
            <SelectItem value="q1">Q1 (Jul–Sep)</SelectItem>
            <SelectItem value="q2">Q2 (Oct–Dec)</SelectItem>
            <SelectItem value="q3">Q3 (Jan–Mar)</SelectItem>
            <SelectItem value="q4">Q4 (Apr–Jun)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Month</Label>
        <Select value={currentMonthValue} onValueChange={handleMonth}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="All months" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {MONTH_NAMES.map((m, i) => {
              const calYear = i < 6 ? selectedFy : selectedFy + 1;
              return <SelectItem key={i} value={String(i)}>{m} {String(calYear).slice(-2)}</SelectItem>;
            })}
          </SelectContent>
        </Select>
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
