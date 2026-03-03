import { ScenarioInputs } from '@/lib/feasibility/types';
import { FeasInput } from './FeasInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Props {
  inputs: ScenarioInputs;
  onChange: (patch: Partial<ScenarioInputs>) => void;
}

export function SiteTab({ inputs, onChange }: Props) {
  const set = (k: keyof ScenarioInputs) => (v: string) => onChange({ [k]: parseFloat(v) || 0 });
  const stampCalc = inputs.stamp_duty_override ?? inputs.purchase_price * inputs.stamp_duty_rate;
  const siteTotal = inputs.purchase_price + stampCalc + inputs.demolition_cost + inputs.other_acquisition_costs;

  return (
    <div className="space-y-4">
      <FeasInput label="Purchase Price" value={inputs.purchase_price} onChange={set('purchase_price')} prefix="$" />
      <div className="grid grid-cols-2 gap-3">
        <FeasInput label="Stamp Duty Rate" value={inputs.stamp_duty_rate} onChange={set('stamp_duty_rate')} step="0.001" />
        <FeasInput label="Stamp Duty Override" value={inputs.stamp_duty_override ?? ''} onChange={v => onChange({ stamp_duty_override: v ? parseFloat(v) : null })} prefix="$" />
      </div>
      <div className="text-xs text-muted-foreground">Stamp Duty: ${stampCalc.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
      <div>
        <Label className="text-xs text-muted-foreground">Site Type</Label>
        <Select value={inputs.site_type} onValueChange={v => onChange({ site_type: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Land">Land</SelectItem>
            <SelectItem value="House">House</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <FeasInput label="Demolition Cost" value={inputs.demolition_cost} onChange={set('demolition_cost')} prefix="$" />
      <FeasInput label="Other Acquisition Costs" value={inputs.other_acquisition_costs} onChange={set('other_acquisition_costs')} prefix="$" />
      <div className="p-3 rounded-md bg-muted text-sm font-medium">
        Site Total: ${siteTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}
