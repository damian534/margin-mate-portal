import { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  Icon: LucideIcon;
  accent: string;
  volume: number;
  count: number;
  period?: string;
}

const TONES: Record<string, string> = {
  primary: 'from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.75)]',
  info: 'from-[hsl(var(--info))] to-[hsl(var(--info)/0.75)]',
  success: 'from-[hsl(var(--success))] to-[hsl(var(--success)/0.75)]',
  warning: 'from-[hsl(var(--warning))] to-[hsl(var(--warning)/0.75)]',
  accent: 'from-[hsl(var(--brand-black))] to-[hsl(var(--brand-black)/0.8)]',
};

export function PipelineKpiCard({ label, Icon, accent, volume, count, period = 'This Month' }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden border shadow-sm">
      <div className={`bg-gradient-to-br ${TONES[accent] ?? TONES.primary} text-primary-foreground px-5 pt-4 pb-6`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-wide uppercase opacity-90">{label}</p>
          <Icon className="w-4 h-4 opacity-80" />
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
