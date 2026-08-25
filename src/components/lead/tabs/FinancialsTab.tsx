import { SectionCard } from '@/components/lead/SectionCard';
import { Label } from '@/components/ui/label';
import { Wallet, CreditCard, Receipt, Target } from 'lucide-react';
import { useFactFind } from './useFactFind';

const money = (v: any) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && n !== 0 ? `$${n.toLocaleString()}` : '—';
};

const numeric = (v: any) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

interface Props {
  leadId: string;
  isPreviewMode: boolean;
}

export function FinancialsTab({ leadId, isPreviewMode }: Props) {
  const { factFind } = useFactFind(leadId, isPreviewMode);
  const assets = factFind['assets'] || {};
  const liabilities = factFind['liabilities'] || {};
  const expenses = factFind['expenses'] || {};
  const goals = factFind['goals'] || {};

  const totalAssets = Object.values(assets).reduce<number>((s, v) => s + numeric(v), 0);
  const totalLiabilities = Object.values(liabilities).reduce<number>((s, v) => s + numeric(v), 0);
  const netPosition = totalAssets - totalLiabilities;

  const renderGrid = (data: Record<string, any>, asMoney = true) => {
    const entries = Object.entries(data).filter(([, v]) => v !== '' && v != null);
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground py-3 text-center">Nothing captured in the fact find yet.</p>;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {entries.map(([k, v]) => (
          <div key={k}>
            <Label className="text-[11px] text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</Label>
            <p className="font-medium">{asMoney && numeric(v) ? money(v) : String(v)}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <SectionCard
        icon={Wallet}
        title="Position snapshot"
        tone={netPosition > 0 ? 'success' : 'neutral'}
        subtitle="Totalled from the fact find"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total assets</p>
            <p className="text-lg font-bold text-success">${totalAssets.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total liabilities</p>
            <p className="text-lg font-bold text-destructive">${totalLiabilities.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Net position</p>
            <p className={`text-lg font-bold ${netPosition >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${netPosition.toLocaleString()}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Wallet} title="Assets" tone="neutral">{renderGrid(assets)}</SectionCard>
      <SectionCard icon={CreditCard} title="Liabilities" tone="neutral">{renderGrid(liabilities)}</SectionCard>
      <SectionCard icon={Receipt} title="Living expenses" tone="neutral">{renderGrid(expenses)}</SectionCard>
      <SectionCard icon={Target} title="Goals & objectives" tone="neutral">{renderGrid(goals, false)}</SectionCard>
    </>
  );
}
