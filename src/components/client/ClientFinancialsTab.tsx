import { useCallback, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Banknote, Landmark, PiggyBank, Scale, TrendingUp } from 'lucide-react';
import { FinancialPositionEditor } from '@/components/financial-position/FinancialPositionEditor';
import { fmtCurrency, type FactFindAggregates } from '@/lib/factFindAggregates';
import { cn } from '@/lib/utils';

interface Props {
  contactId: string;
  clientName: string;
  isPreviewMode?: boolean;
}

const EMPTY: FactFindAggregates = {
  hasData: false,
  totalIncome: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  monthlyExpenses: 0,
  netPosition: 0,
};

function MetricCard({
  icon: Icon, label, value, sub, tone = 'neutral',
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 relative overflow-hidden">
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-0.5',
          tone === 'positive' && 'bg-emerald-500',
          tone === 'negative' && 'bg-destructive',
          tone === 'neutral' && 'bg-primary/50',
        )}
      />
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/**
 * Bank-grade financial position for a contact — works with or without a deal.
 * Data is stored against the contact, so a client can have a full balance sheet
 * before any application exists.
 */
export function ClientFinancialsTab({ contactId, clientName, isPreviewMode }: Props) {
  const [agg, setAgg] = useState<FactFindAggregates>(EMPTY);

  const onAggregates = useCallback((a: FactFindAggregates) => setAgg(a), []);

  const gross = agg.totalAssets + agg.totalLiabilities;
  const assetPct = gross > 0 ? (agg.totalAssets / gross) * 100 : 0;
  const lvr = agg.totalAssets > 0 ? (agg.totalLiabilities / agg.totalAssets) * 100 : 0;
  const surplusMonthly = agg.totalIncome / 12 - agg.monthlyExpenses;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Net position</p>
            <p
              className={cn(
                'text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight mt-1',
                agg.netPosition < 0 ? 'text-destructive' : 'text-foreground',
              )}
            >
              {fmtCurrency(agg.netPosition)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{clientName} · live balance sheet</p>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">LVR</p>
              <p className="font-semibold tabular-nums">{gross > 0 ? `${lvr.toFixed(0)}%` : '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Monthly surplus</p>
              <p className={cn('font-semibold tabular-nums', surplusMonthly < 0 && 'text-destructive')}>
                {fmtCurrency(surplusMonthly)}
              </p>
            </div>
          </div>
        </div>

        {/* Assets vs liabilities bar */}
        <div className="mt-5">
          <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
            <div className="h-full bg-emerald-500/80" style={{ width: `${assetPct}%` }} />
            <div className="h-full bg-destructive/70" style={{ width: `${100 - assetPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              Assets {fmtCurrency(agg.totalAssets)}
            </span>
            <span className="flex items-center gap-1.5">
              Liabilities {fmtCurrency(agg.totalLiabilities)}
              <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
            </span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={PiggyBank} label="Total assets" value={fmtCurrency(agg.totalAssets)} tone="positive" />
        <MetricCard icon={Landmark} label="Total liabilities" value={fmtCurrency(agg.totalLiabilities)} tone="negative" />
        <MetricCard icon={TrendingUp} label="Gross income" value={fmtCurrency(agg.totalIncome)} sub="per year" />
        <MetricCard icon={Scale} label="Living expenses" value={fmtCurrency(agg.monthlyExpenses)} sub="per month" />
      </div>

      {/* Editor */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Banknote className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Financial position
          </h3>
        </div>
        <FinancialPositionEditor
          contactId={contactId}
          isPreviewMode={isPreviewMode}
          hideHeader
          onAggregates={onAggregates}
        />
      </div>
    </div>
  );
}
