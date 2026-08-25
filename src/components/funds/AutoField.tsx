import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { AutoValue } from '@/lib/fundsPosition/types';

interface AutoFieldProps {
  label: string;
  field: AutoValue;
  computed: number;
  onChange: (field: AutoValue) => void;
  suffix?: '$' | '%';
  decimals?: number;
  hint?: string;
}

const fmt = (n: number, suffix: '$' | '%', decimals: number) =>
  suffix === '$'
    ? `$${Math.round(n).toLocaleString('en-AU')}`
    : `${n.toFixed(decimals)}%`;

/**
 * A figure that is either auto-calculated by the engine or manually driven.
 * Toggle on to type your own number, toggle off to let the model solve it.
 */
export function AutoField({
  label,
  field,
  computed,
  onChange,
  suffix = '$',
  decimals = 2,
  hint,
}: AutoFieldProps) {
  const manual = !field.auto;

  return (
    <div
      className={`rounded-lg border px-3 py-2 transition-colors ${
        manual ? 'border-primary/40 bg-card' : 'border-border bg-muted/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          {!manual && (
            <Badge variant="secondary" className="text-[10px] font-medium">
              Auto-calc'd
            </Badge>
          )}
          <Switch
            checked={manual}
            onCheckedChange={checked => onChange({ ...field, auto: !checked, value: checked ? computed : field.value })}
            aria-label={`Manually set ${label}`}
          />
        </div>
      </div>

      {manual ? (
        <div className="flex items-baseline gap-1">
          {suffix === '$' && <span className="text-muted-foreground">$</span>}
          <Input
            value={field.value === 0 ? '' : field.value.toLocaleString('en-AU')}
            onChange={e => {
              const raw = Number(e.target.value.replace(/[^0-9.]/g, ''));
              onChange({ ...field, value: isNaN(raw) ? 0 : raw });
            }}
            placeholder="0"
            inputMode="decimal"
            className="h-8 border-0 px-0 text-base font-semibold shadow-none focus-visible:ring-0"
          />
          {suffix === '%' && <span className="text-muted-foreground">%</span>}
        </div>
      ) : (
        <div className="h-8 flex items-center text-base font-semibold text-muted-foreground">
          {fmt(computed, suffix, decimals)}
        </div>
      )}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
