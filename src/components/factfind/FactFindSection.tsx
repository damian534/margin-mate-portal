import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'tel' | 'date' | 'select' | 'textarea' | 'radio' | 'currency' | 'checkbox';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  half?: boolean; // renders in 2-col grid
}

interface FactFindSectionProps {
  title: string;
  icon: React.ReactNode;
  fields: FieldConfig[];
  data: Record<string, any>;
  completed: boolean;
  onChange: (data: Record<string, any>) => void;
  onSave: () => void;
  onToggleComplete: () => void;
  saving?: boolean;
  readOnly?: boolean;
}

export function FactFindSection({
  title, icon, fields, data, completed, onChange, onSave, onToggleComplete, saving, readOnly
}: FactFindSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const handleFieldChange = (key: string, value: any) => {
    onChange({ ...data, [key]: value });
  };

  const filledCount = fields.filter(f => {
    const v = data[f.key];
    return v !== undefined && v !== null && v !== '';
  }).length;

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      completed ? "border-primary/30 bg-primary/5" : "border-border"
    )}>
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          completed ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {completed ? <CheckCircle2 className="w-4 h-4" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            {filledCount}/{fields.length} fields completed
          </p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t">
          <div className="grid grid-cols-2 gap-3 pt-3">
            {fields.map(field => {
              const colSpan = field.half ? '' : 'col-span-2';
              const value = data[field.key] ?? '';

              if (field.type === 'select') {
                return (
                  <div key={field.key} className={colSpan}>
                    <Label className="text-xs">{field.label}</Label>
                    <Select value={value} onValueChange={(v) => handleFieldChange(field.key, v)} disabled={readOnly}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
                      <SelectContent>
                        {field.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              if (field.type === 'textarea') {
                return (
                  <div key={field.key} className={colSpan}>
                    <Label className="text-xs">{field.label}</Label>
                    <Textarea
                      value={value}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="mt-1"
                      disabled={readOnly}
                    />
                  </div>
                );
              }

              if (field.type === 'radio') {
                return (
                  <div key={field.key} className={colSpan}>
                    <Label className="text-xs">{field.label}</Label>
                    <RadioGroup value={value} onValueChange={(v) => handleFieldChange(field.key, v)} className="mt-1 flex flex-wrap gap-3" disabled={readOnly}>
                      {field.options?.map(o => (
                        <div key={o.value} className="flex items-center gap-1.5">
                          <RadioGroupItem value={o.value} id={`${field.key}-${o.value}`} />
                          <Label htmlFor={`${field.key}-${o.value}`} className="text-xs font-normal cursor-pointer">{o.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                );
              }

              if (field.type === 'checkbox') {
                return (
                  <div key={field.key} className={cn("flex items-center gap-2", colSpan)}>
                    <Checkbox
                      checked={!!value}
                      onCheckedChange={(v) => handleFieldChange(field.key, v === true)}
                      disabled={readOnly}
                    />
                    <Label className="text-xs font-normal cursor-pointer">{field.label}</Label>
                  </div>
                );
              }

              if (field.type === 'currency') {
                return (
                  <div key={field.key} className={colSpan}>
                    <Label className="text-xs">{field.label}</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="pl-7 h-9"
                        placeholder={field.placeholder || '0'}
                        value={value ? Number(value).toLocaleString() : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          handleFieldChange(field.key, raw ? parseFloat(raw) : '');
                        }}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                );
              }

              return (
                <div key={field.key} className={colSpan}>
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    type={field.type}
                    value={value}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="mt-1 h-9"
                    disabled={readOnly}
                  />
                </div>
              );
            })}
          </div>

          {!readOnly && (
            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onToggleComplete}>
                <CheckCircle2 className={cn("w-3.5 h-3.5", completed ? "text-primary" : "text-muted-foreground")} />
                {completed ? 'Mark incomplete' : 'Mark complete'}
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={onSave} disabled={saving}>
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
