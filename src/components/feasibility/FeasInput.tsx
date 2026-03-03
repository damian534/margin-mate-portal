import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface FeasInputProps {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  step?: string;
  min?: string;
  disabled?: boolean;
}

export function FeasInput({ label, value, onChange, type = 'number', prefix, suffix, className, step, min, disabled }: FeasInputProps) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1 mt-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-8 text-sm"
          step={step}
          min={min}
          disabled={disabled}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
