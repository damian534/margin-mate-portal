import { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  Icon: LucideIcon;
  volume: number;
  count: number;
  period?: string;
}

export function PipelineKpiCard({ label, Icon, volume, count, period = 'This Month' }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden border shadow-sm">
      <div className="bg-card text-card-foreground px-5 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{label}</p>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="mt-6 text-4xl font-semibold tabular-nums leading-none">
          <span className="text-2xl align-top opacity-80">$</span>
          {volume.toLocaleString()}
        </p>
        <p className="mt-3 text-sm opacity-90">
          {count} {count === 1 ? 'Transaction' : 'Transactions'}
        </p>
      </div>
      <div className="bg-muted/60 px-5 py-2.5 text-center text-xs font-medium text-muted-foreground">
        {period}
      </div>
    </div>
  );
}
