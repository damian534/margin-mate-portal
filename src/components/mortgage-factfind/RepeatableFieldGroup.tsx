import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { WizardField } from './types';
import { MortgageWizardField } from './MortgageWizardField';

interface Props {
  field: WizardField;
  items: Record<string, any>[];
  onChange: (items: Record<string, any>[]) => void;
  data: Record<string, any>;
  readOnly?: boolean;
}

export function RepeatableFieldGroup({ field, items, onChange, readOnly }: Props) {
  const maxItems = field.maxItems ?? 10;
  const subFields = field.fields ?? [];

  const addItem = () => {
    if (items.length >= maxItems) return;
    onChange([...items, {}]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, key: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [key]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-border bg-muted/20 p-4 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-foreground">
              {field.itemLabel || 'Item'} {index + 1}
            </h4>
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {subFields.map(sf => (
              <MortgageWizardField
                key={sf.key}
                field={sf}
                value={item[sf.key]}
                onChange={(k, v) => updateItem(index, k, v)}
                data={item}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      ))}

      {!readOnly && items.length < maxItems && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-full text-xs"
          onClick={addItem}
        >
          <Plus className="w-3.5 h-3.5" />
          Add {field.itemLabel || 'Item'}
        </Button>
      )}
    </div>
  );
}
