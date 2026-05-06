import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  Icon: LucideIcon;
  accent: string;
  volume: number;
  count: number;
  initialTarget: number;
  onTargetChange: (v: number) => void;
}

export function PipelineKpiCard({ label, Icon, accent, volume, count, initialTarget, onTargetChange }: Props) {
  const [target, setTarget] = useState<number>(initialTarget);
  const diff = volume - target;
  const surplus = diff >= 0;

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-${accent}/10 flex items-center justify-center`}>
            <Icon className={`w-5 h-5 text-${accent}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold leading-tight truncate">${volume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{label} · {count} {count === 1 ? 'application' : 'applications'}</p>
          </div>
        </div>
        <div className="pt-2 border-t space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Target</label>
            <div className="relative w-32">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                type="text"
                inputMode="numeric"
                className="h-7 pl-5 pr-2 text-xs text-right"
                value={target ? target.toLocaleString() : ''}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const v = raw ? parseInt(raw, 10) : 0;
                  setTarget(v);
                  onTargetChange(v);
                }}
              />
            </div>
          </div>
          {target > 0 && (
            <p className={`text-xs font-medium ${surplus ? 'text-success' : 'text-destructive'}`}>
              {surplus ? 'Surplus' : 'Deficit'}: ${Math.abs(diff).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}