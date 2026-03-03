import { ScenarioInputs } from '@/lib/feasibility/types';
import { FeasInput } from './FeasInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Props {
  inputs: ScenarioInputs;
  onChange: (patch: Partial<ScenarioInputs>) => void;
}

export function SalesTab({ inputs, onChange }: Props) {
  const totalUnits = inputs.unit_mix.reduce((s, r) => s + r.count, 0);
  const grossRev = inputs.sales_method === 'unit_level'
    ? inputs.unit_mix.reduce((s, r) => s + r.count * (r.sale_price_each ?? 0), 0)
    : totalUnits * inputs.avg_sale_price;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Sales Method</Label>
        <Select value={inputs.sales_method} onValueChange={v => onChange({ sales_method: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="average">Average Sale Price</SelectItem>
            <SelectItem value="unit_level">Unit-level Prices</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {inputs.sales_method === 'average' ? (
        <FeasInput label="Average Sale Price" value={inputs.avg_sale_price} onChange={v => onChange({ avg_sale_price: parseFloat(v) || 0 })} prefix="$" />
      ) : (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Unit Sale Prices</Label>
          {inputs.unit_mix.map(u => (
            <div key={u.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20 truncate">{u.unit_type} (×{u.count})</span>
              <Input
                className="h-7 text-xs flex-1"
                type="number"
                placeholder="Price each"
                value={u.sale_price_each ?? ''}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  onChange({ unit_mix: inputs.unit_mix.map(x => x.id === u.id ? { ...x, sale_price_each: val } : x) });
                }}
              />
            </div>
          ))}
        </div>
      )}

      <FeasInput label="Selling Cost Rate %" value={(inputs.selling_cost_rate * 100).toFixed(1)} onChange={v => onChange({ selling_cost_rate: (parseFloat(v) || 0) / 100 })} suffix="%" />
      <FeasInput label="Selling Cost Fixed (override)" value={inputs.selling_cost_fixed ?? ''} onChange={v => onChange({ selling_cost_fixed: v ? parseFloat(v) : null })} prefix="$" />

      <div>
        <Label className="text-xs text-muted-foreground">GST Model</Label>
        <Select value={inputs.gst_model} onValueChange={v => onChange({ gst_model: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None / Ignore</SelectItem>
            <SelectItem value="simple">Simple GST</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <FeasInput label="Company Tax Rate %" value={(inputs.company_tax_rate * 100).toFixed(0)} onChange={v => onChange({ company_tax_rate: (parseFloat(v) || 0) / 100 })} suffix="%" />

      <div className="p-3 rounded-md bg-muted text-sm font-medium">
        Gross Revenue: ${grossRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}
