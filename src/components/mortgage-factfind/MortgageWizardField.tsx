import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { WizardField } from './types';
import { RepeatableFieldGroup } from './RepeatableFieldGroup';

interface Props {
  field: WizardField;
  value: any;
  onChange: (key: string, value: any) => void;
  data: Record<string, any>;
  readOnly?: boolean;
}

export function MortgageWizardField({ field, value, onChange, data, readOnly }: Props) {
  // Check condition
  if (field.condition && !field.condition(data)) return null;

  const val = value ?? '';
  const colSpan = field.half ? '' : 'col-span-2';

  if (field.type === 'heading') {
    return (
      <div className="col-span-2 pt-4 pb-1">
        <h3 className="text-sm font-semibold text-foreground">{field.label}</h3>
        {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
      </div>
    );
  }

  if (field.type === 'info') {
    return (
      <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{field.label}</p>
      </div>
    );
  }

  if (field.type === 'button-group') {
    return (
      <div className="col-span-2 flex flex-col items-center gap-4 py-6">
        {field.label && <p className="text-sm font-medium text-foreground">{field.label}</p>}
        <div className="flex gap-3">
          {field.options?.map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={readOnly}
              className={cn(
                "px-8 py-3 rounded-full border-2 text-sm font-medium transition-all",
                val === opt.value
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted/50"
              )}
              onClick={() => onChange(field.key, opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'repeatable') {
    return (
      <div className="col-span-2">
        <RepeatableFieldGroup
          field={field}
          items={Array.isArray(val) ? val : []}
          onChange={(items) => onChange(field.key, items)}
          data={data}
          readOnly={readOnly}
        />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className={colSpan}>
        <Label className="text-xs font-medium text-foreground">{field.label}</Label>
        <Select value={val} onValueChange={(v) => onChange(field.key, v)} disabled={readOnly}>
          <SelectTrigger className="mt-1.5 h-11 rounded-lg border-border bg-background">
            <SelectValue placeholder={field.placeholder || 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className={colSpan}>
        <Label className="text-xs font-medium text-foreground">{field.label}</Label>
        {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
        <Textarea
          value={val}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="mt-1.5 rounded-lg border-border"
          disabled={readOnly}
        />
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div className={colSpan}>
        <Label className="text-xs font-medium text-foreground">{field.label}</Label>
        <RadioGroup
          value={val}
          onValueChange={(v) => onChange(field.key, v)}
          className="mt-2 flex flex-wrap gap-3"
          disabled={readOnly}
        >
          {field.options?.map(o => (
            <label
              key={o.value}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all text-sm",
                val === o.value
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-background text-foreground hover:border-primary/40"
              )}
            >
              <RadioGroupItem value={o.value} id={`${field.key}-${o.value}`} />
              <span>{o.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className={cn("flex items-start gap-3 py-1", colSpan)}>
        <Checkbox
          checked={!!val}
          onCheckedChange={(v) => onChange(field.key, v === true)}
          disabled={readOnly}
          className="mt-0.5"
        />
        <Label className="text-sm font-normal cursor-pointer leading-relaxed">{field.label}</Label>
      </div>
    );
  }

  if (field.type === 'currency') {
    return (
      <div className={colSpan}>
        <Label className="text-xs font-medium text-foreground">{field.label}</Label>
        {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
        <div className="relative mt-1.5">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            type="text"
            inputMode="numeric"
            className="pl-7 h-11 rounded-lg border-border"
            placeholder={field.placeholder || '0'}
            value={val ? Number(val).toLocaleString() : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.]/g, '');
              onChange(field.key, raw ? parseFloat(raw) : '');
            }}
            disabled={readOnly}
          />
        </div>
      </div>
    );
  }

  // text, number, email, tel, date
  return (
    <div className={colSpan}>
      <Label className="text-xs font-medium text-foreground">{field.label}</Label>
      {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
      <Input
        type={field.type}
        value={val}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        className="mt-1.5 h-11 rounded-lg border-border"
        disabled={readOnly}
      />
    </div>
  );
}
