import { Input } from '@/components/ui/input';

interface MoneyInputProps {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  suffix?: string;
}

export function MoneyInput({ label, value, onChange, placeholder = '0', suffix }: MoneyInputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</label>}
      <div className="flex items-center gap-1 rounded-md border px-2">
        {!suffix && <span className="text-sm text-muted-foreground">$</span>}
        <Input
          value={value === 0 ? '' : value.toLocaleString('en-AU')}
          onChange={e => {
            const raw = Number(e.target.value.replace(/[^0-9.]/g, ''));
            onChange(isNaN(raw) ? 0 : raw);
          }}
          placeholder={placeholder}
          inputMode="decimal"
          className="h-9 border-0 px-1 shadow-none focus-visible:ring-0"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
