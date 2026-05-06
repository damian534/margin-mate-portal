import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { fetchFactFindAggregates, fmtCurrency, type FactFindAggregates } from '@/lib/factFindAggregates';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Wallet, Coins, Scale, ChevronDown, ChevronRight, Send, Pencil, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { FactFindWizardDialog } from './FactFindWizardDialog';

interface Props {
  leadId: string;
  loanAmount: number | null;
  referrerCommission: number | null;
  isPreviewMode?: boolean;
  onSendFactFind?: () => void;
  prefill?: { email?: string; phone?: string; firstName?: string; lastName?: string };
}

const SAMPLE: FactFindAggregates = {
  hasData: true,
  totalIncome: 185000,
  totalAssets: 1450000,
  totalLiabilities: 620000,
  monthlyExpenses: 6200,
  netPosition: 830000,
};

export function FinancialSnapshot({ leadId, loanAmount, referrerCommission, isPreviewMode, onSendFactFind, prefill }: Props) {
  const { user } = useAuth();
  const [agg, setAgg] = useState<FactFindAggregates | null>(null);
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sendInfo, setSendInfo] = useState<{ last_sent_at: string | null; last_send_mode: string | null; last_send_error: string | null; send_count: number } | null>(null);

  const refresh = () => {
    if (isPreviewMode) { setAgg(SAMPLE); return; }
    if (!user) return;
    fetchFactFindAggregates(leadId).then(setAgg).catch(() => setAgg(null));
    supabase
      .from('client_portal_tokens')
      .select('last_sent_at, last_send_mode, last_send_error, send_count')
      .eq('lead_id', leadId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSendInfo((data as any) ?? null));
  };

  useEffect(() => { refresh(); }, [leadId, isPreviewMode, user?.id]);

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
            <SendStatus sendInfo={sendInfo} onSend={onSendFactFind} />
            {!agg?.hasData ? (
              <div className="py-4 text-center space-y-3">
                <p className="text-sm text-muted-foreground">No fact-find responses yet.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setWizardOpen(true)}>
                    <Pencil className="w-3.5 h-3.5" /> Fill out as broker
                  </Button>
                  {onSendFactFind && (
                    <Button size="sm" className="gap-1.5" onClick={onSendFactFind}>
                      <Send className="w-3.5 h-3.5" /> Send to client
                    </Button>
                  )}
                </div>
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
                <div className="pt-1">
                  <Button size="sm" variant="outline" className="gap-1.5 w-full" onClick={() => setWizardOpen(true)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit financial position
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <FactFindWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        leadId={leadId}
        isPreviewMode={isPreviewMode}
        prefill={prefill}
        onComplete={refresh}
      />
    </div>
  );
}

function SendStatus({ sendInfo, onSend }: { sendInfo: { last_sent_at: string | null; last_send_mode: string | null; last_send_error: string | null; send_count: number } | null; onSend?: () => void }) {
  if (!sendInfo || (!sendInfo.last_sent_at && !sendInfo.last_send_error)) return null;
  if (sendInfo.last_send_error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 mt-2 text-xs">
        <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-destructive">Last send failed</p>
          <p className="text-muted-foreground truncate">{sendInfo.last_send_error}</p>
        </div>
        {onSend && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onSend}>Retry</Button>}
      </div>
    );
  }
  if (sendInfo.last_sent_at) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 mt-2 text-xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
        <div className="flex-1">
          <span className="font-medium text-foreground">Sent {formatDistanceToNow(new Date(sendInfo.last_sent_at), { addSuffix: true })}</span>
          {sendInfo.last_send_mode && <span className="text-muted-foreground"> · {sendInfo.last_send_mode === 'documents' ? 'documents request' : 'fact find'}</span>}
          {sendInfo.send_count > 1 && <span className="text-muted-foreground"> · {sendInfo.send_count}× total</span>}
        </div>
      </div>
    );
  }
  return null;
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
