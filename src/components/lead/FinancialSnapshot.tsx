import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchFactFindAggregates, fmtCurrency, type FactFindAggregates } from '@/lib/factFindAggregates';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Wallet, Coins, Scale, ChevronDown, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  leadId: string;
  loanAmount: number | null;
  referrerCommission: number | null;
  isPreviewMode?: boolean;
  onSendFactFind?: () => void;
}

const SAMPLE: FactFindAggregates = {
  hasData: true,
  totalIncome: 185000,
  totalAssets: 1450000,
  totalLiabilities: 620000,
  monthlyExpenses: 6200,
  netPosition: 830000,
};

export function FinancialSnapshot({ leadId, loanAmount, referrerCommission, isPreviewMode, onSendFactFind }: Props) {
  const { user } = useAuth();
  const [agg, setAgg] = useState<FactFindAggregates | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isPreviewMode) { setAgg(SAMPLE); return; }
    if (!user) return;
    fetchFactFindAggregates(leadId).then(setAgg).catch(() => setAgg(null));
  }, [leadId, isPreviewMode, user?.id]);

  // Pipeline value: prefer set referrer commission, otherwise estimate 0.65% upfront
  const pipelineValue = referrerCommission && referrerCommission > 0
    ? referrerCommission
    : (loanAmount ? loanAmount * 0.0065 : 0);

  const lvr = agg?.hasData && agg.totalAssets > 0 && loanAmount
    ? Math.min(100, (loanAmount / agg.totalAssets) * 100)
    : null;

  return (
    <div className="space-y-3">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2">
        <KpiTile
          icon={<Coins className="w-3.5 h-3.5" />}
          label="Loan amount"
          value={loanAmount ? fmtCurrency(loanAmount) : '—'}
        />
        <KpiTile
          icon={<Wallet className="w-3.5 h-3.5" />}
          label="Pipeline value"
          value={pipelineValue > 0 ? fmtCurrency(pipelineValue) : '—'}
          tone="primary"
        />
        <KpiTile
          icon={agg?.hasData && agg.netPosition >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          label="Net position"
          value={agg?.hasData ? fmtCurrency(agg.netPosition, { compact: true }) : '—'}
          tone={agg?.hasData ? (agg.netPosition >= 0 ? 'success' : 'destructive') : 'muted'}
        />
      </div>

      {/* Full position card */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Financial position</span>
            {agg?.hasData && (
              <span className="text-[10px] text-muted-foreground">· from fact find</span>
            )}
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>

        {open && (
          <div className="px-3.5 pb-3.5 pt-1 border-t border-border/60">
            {!agg?.hasData ? (
              <div className="py-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">No fact-find responses yet.</p>
                {onSendFactFind && (
                  <button
                    onClick={onSendFactFind}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Send className="w-3 h-3" /> Send fact-find to client
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <Row label="Total income (annual)" value={fmtCurrency(agg.totalIncome)} />
                  <Row label="Monthly expenses" value={fmtCurrency(agg.monthlyExpenses)} />
                  <Row label="Total assets" value={fmtCurrency(agg.totalAssets)} />
                  <Row label="Total liabilities" value={fmtCurrency(agg.totalLiabilities)} tone="destructive" />
                  <Row
                    label="Net position"
                    value={fmtCurrency(agg.netPosition)}
                    tone={agg.netPosition >= 0 ? 'success' : 'destructive'}
                    bold
                  />
                  {lvr !== null && <Row label="Estimated LVR" value={`${lvr.toFixed(1)}%`} />}
                </div>
                {lvr !== null && (
                  <div className="space-y-1">
                    <Progress value={lvr} className="h-1.5" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0%</span><span>80%</span><span>100%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiTile({ icon, label, value, tone = 'default' }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'default' | 'primary' | 'success' | 'destructive' | 'muted';
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className={cn(
        'text-lg font-semibold tabular-nums mt-0.5 leading-tight',
        tone === 'primary' && 'text-primary',
        tone === 'success' && 'text-success',
        tone === 'destructive' && 'text-destructive',
        tone === 'muted' && 'text-muted-foreground',
      )}>
        {value}
      </p>
    </div>
  );
}

function Row({ label, value, tone, bold }: { label: string; value: string; tone?: 'success' | 'destructive'; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn(
        'tabular-nums',
        bold ? 'font-semibold' : 'font-medium',
        tone === 'success' && 'text-success',
        tone === 'destructive' && 'text-destructive',
      )}>
        {value}
      </span>
    </div>
  );
}
