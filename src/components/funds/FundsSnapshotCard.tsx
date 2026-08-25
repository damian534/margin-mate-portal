import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, History, Mail, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { downloadFundsPositionPdf } from '@/lib/pdf/fundsPositionPdf';
import { EmailFundsPositionDialog } from './EmailFundsPositionDialog';
import { ScenarioVersionsDialog } from './ScenarioVersionsDialog';
import { useFundsScenarios } from './useFundsScenarios';

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString('en-AU')}`;

interface Props {
  leadId: string;
  clientName?: string;
  referralPartnerId?: string | null;
  isPreviewMode?: boolean;
  className?: string;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'negative' | 'positive' }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'truncate text-sm font-semibold tabular-nums',
          tone === 'negative' && 'text-destructive',
          tone === 'positive' && 'text-success',
        )}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Compact funding-position snapshot for a Lead / WIP deal card — latest saved
 * scenario, its version history, a one-click partner update and a PDF export.
 */
export function FundsSnapshotCard({
  leadId,
  clientName,
  referralPartnerId,
  isPreviewMode,
  className,
}: Props) {
  const { groups, restore, remove } = useFundsScenarios(leadId, !isPreviewMode);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [partner, setPartner] = useState<{ email: string | null; name: string | null }>({
    email: null,
    name: null,
  });

  const group = groups[0] ?? null;
  const latest = group?.latest ?? null;

  useEffect(() => {
    if (!referralPartnerId || isPreviewMode) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', referralPartnerId)
        .maybeSingle();
      if (data && !cancelled) {
        setPartner({ email: (data as any).email ?? null, name: (data as any).full_name ?? null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [referralPartnerId, isPreviewMode]);

  const lmiLabel = useMemo(() => {
    if (!latest) return '—';
    const total = latest.result.lmi + latest.result.lmiStampDuty;
    if (total <= 0) return 'No LMI';
    return `${money(total)}${latest.inputs.capitaliseLMI ? ' (cap.)' : ''}`;
  }, [latest]);

  if (!latest || !group) return null;

  const exportPdf = async () => {
    try {
      await downloadFundsPositionPdf(latest.inputs, latest.result, {
        clientName,
        scenarioName: `${latest.name} v${latest.version}`,
      });
      toast.success('PDF downloaded');
    } catch {
      toast.error('Could not generate the PDF');
    }
  };

  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Wallet className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{latest.name}</p>
          <p className="text-[11px] text-muted-foreground">
            Saved {new Date(latest.createdAt).toLocaleDateString('en-AU')} ·{' '}
            {latest.inputs.lenderName ?? 'Market average'}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          v{latest.version}
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => setVersionsOpen(true)}>
          <History className="mr-1 h-3.5 w-3.5" /> History
        </Button>
        <Button variant="ghost" size="sm" onClick={exportPdf}>
          <Download className="mr-1 h-3.5 w-3.5" /> PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
          <Mail className="mr-1 h-3.5 w-3.5" /> Email partner
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-3 py-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Property" value={money(latest.result.propertyValue)} />
        <Stat label="Total loan" value={money(latest.result.totalLoan)} />
        <Stat label="Base LVR" value={`${latest.result.baseLVR.toFixed(2)}%`} />
        <Stat label="Total LVR" value={`${latest.result.totalLVR.toFixed(2)}%`} />
        <Stat label="LMI" value={lmiLabel} />
        <Stat
          label={latest.result.netSurplus < 0 ? 'Shortfall' : 'Surplus'}
          value={money(Math.abs(latest.result.netSurplus))}
          tone={latest.result.netSurplus < 0 ? 'negative' : 'positive'}
        />
      </div>

      <ScenarioVersionsDialog
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        group={group}
        clientName={clientName}
        onRestore={restore}
        onDelete={remove}
      />

      <EmailFundsPositionDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        inputs={latest.inputs}
        result={latest.result}
        warnings={[]}
        clientName={clientName}
        defaultTo={partner.email}
        defaultRecipientName={partner.name}
        scenarioName={latest.name}
        versionLabel={`v${latest.version}`}
      />
    </div>
  );
}
