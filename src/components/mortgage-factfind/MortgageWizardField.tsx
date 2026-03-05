import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { WizardField } from './types';
import { RepeatableFieldGroup } from './RepeatableFieldGroup';
import { Play } from 'lucide-react';

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

  // Heading and info are handled in the parent now for conversational layout,
  // but we still support them here for nested/repeatable contexts
  if (field.type === 'heading') {
    return (
      <div className="pt-4 pb-1">
        <h3 className="text-base font-semibold text-foreground">{field.label}</h3>
        {field.description && <p className="text-sm text-muted-foreground mt-0.5">{field.description}</p>}
      </div>
    );
  }

  if (field.type === 'info') {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{field.label}</p>
      </div>
    );
  }

  if (field.type === 'button-group') {
    return (
      <div className="space-y-3">
        {field.label && (
          <p className="text-sm sm:text-base font-medium text-foreground" 
             dangerouslySetInnerHTML={{ __html: field.label }} />
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Play className="w-3.5 h-3.5 text-destructive fill-destructive shrink-0" />
          {field.options?.map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={readOnly}
              className={cn(
                "px-5 py-2.5 rounded-full border-2 text-sm font-medium transition-all",
                val === opt.value
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-background text-foreground hover:border-foreground/40"
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
      <div>
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
      <div>
        <Label className="text-sm font-medium text-foreground">{field.label}</Label>
        <Select value={val} onValueChange={(v) => onChange(field.key, v)} disabled={readOnly}>
          <SelectTrigger className="mt-2 h-12 rounded-xl border-border bg-background text-sm">
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
      <div>
        <Label className="text-sm font-medium text-foreground">{field.label}</Label>
        {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
        <Textarea
          value={val}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="mt-2 rounded-xl border-border text-sm"
          disabled={readOnly}
        />
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div>
        <Label className="text-sm font-medium text-foreground">{field.label}</Label>
        <RadioGroup
          value={val}
          onValueChange={(v) => onChange(field.key, v)}
          className="mt-3 flex flex-wrap gap-2"
          disabled={readOnly}
        >
          <Play className="w-3.5 h-3.5 text-destructive fill-destructive shrink-0 mt-2.5" />
          {field.options?.map(o => (
            <label
              key={o.value}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full border-2 cursor-pointer transition-all text-sm font-medium",
                val === o.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:border-foreground/40"
              )}
            >
              <RadioGroupItem value={o.value} id={`${field.key}-${o.value}`} className="sr-only" />
              <span>{o.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className="flex items-start gap-3 py-1">
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
      <div>
        <Label className="text-sm font-medium text-foreground">{field.label}</Label>
        {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
        <div className="relative mt-2">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            type="text"
            inputMode="numeric"
            className="pl-8 h-12 rounded-xl border-border text-sm"
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
    <div>
      <Label className="text-sm font-medium text-foreground">{field.label}</Label>
      {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
      <Input
        type={field.type}
        value={val}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        className="mt-2 h-12 rounded-xl border-border text-sm"
        disabled={readOnly}
      />
    </div>
  );
}
