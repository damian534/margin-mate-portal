import { ScenarioInputs } from '@/lib/feasibility/types';
import { FeasInput } from './FeasInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Props {
  inputs: ScenarioInputs;
  onChange: (patch: Partial<ScenarioInputs>) => void;
}

export function FinanceTab({ inputs, onChange }: Props) {
  const set = (k: keyof ScenarioInputs) => (v: string) => onChange({ [k]: parseFloat(v) || 0 });
  const pct = (k: keyof ScenarioInputs, v: string) => onChange({ [k]: (parseFloat(v) || 0) / 100 });

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Land Facility</h4>
        <div className="space-y-3">
          <FeasInput label="LVR %" value={(inputs.land_lvr * 100).toFixed(0)} onChange={v => pct('land_lvr', v)} suffix="%" />
          <div>
            <Label className="text-xs text-muted-foreground">LVR applies to</Label>
            <Select value={inputs.lvr_applies_to} onValueChange={v => onChange({ lvr_applies_to: v as any })}>
              <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase_price">Purchase Price</SelectItem>
                <SelectItem value="total_site_cost">Total Site Cost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FeasInput label="Interest Rate (annual %)" value={(inputs.land_interest_rate_annual * 100).toFixed(2)} onChange={v => pct('land_interest_rate_annual', v)} suffix="%" />
          <div>
            <Label className="text-xs text-muted-foreground">Repayment Type</Label>
            <Select value={inputs.land_repayment_type} onValueChange={v => onChange({ land_repayment_type: v as any })}>
              <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IO">Interest Only</SelectItem>
                <SelectItem value="PI">P&I</SelectItem>
                <SelectItem value="Capitalised">Capitalised</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FeasInput label="Land Fees" value={inputs.land_fees} onChange={set('land_fees')} prefix="$" />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Construction Facility</h4>
        <div className="space-y-3">
          <FeasInput label="LVR %" value={(inputs.construction_lvr * 100).toFixed(0)} onChange={v => pct('construction_lvr', v)} suffix="%" />
          <div>
            <Label className="text-xs text-muted-foreground">LVR Base</Label>
            <Select value={inputs.construction_lvr_base} onValueChange={v => onChange({ construction_lvr_base: v as any })}>
              <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="build_cost">Build Cost</SelectItem>
                <SelectItem value="total_dev_cost">Total Dev Cost</SelectItem>
                <SelectItem value="grv">GRV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FeasInput label="Interest Rate (annual %)" value={(inputs.construction_interest_rate_annual * 100).toFixed(2)} onChange={v => pct('construction_interest_rate_annual', v)} suffix="%" />
          <div>
            <Label className="text-xs text-muted-foreground">Repayment Type</Label>
            <Select value={inputs.construction_repayment_type} onValueChange={v => onChange({ construction_repayment_type: v as any })}>
              <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IO">Interest Only</SelectItem>
                <SelectItem value="PI">P&I</SelectItem>
                <SelectItem value="Capitalised">Capitalised</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FeasInput label="Construction Fees" value={inputs.construction_fees} onChange={set('construction_fees')} prefix="$" />
          <div>
            <Label className="text-xs text-muted-foreground">Draw Curve</Label>
            <Select value={inputs.progress_curve_preset} onValueChange={v => onChange({ progress_curve_preset: v as any })}>
              <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="s_curve">S-Curve</SelectItem>
                <SelectItem value="even">Even</SelectItem>
                <SelectItem value="front_loaded">Front-loaded</SelectItem>
                <SelectItem value="back_loaded">Back-loaded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Interest Funding</h4>
        <div className="flex items-center gap-2 mb-3">
          <Switch checked={inputs.interest_funded} onCheckedChange={v => onChange({ interest_funded: v })} />
          <Label className="text-xs">Fund interest from loan (capitalise)</Label>
        </div>
        {inputs.interest_funded && (
          <FeasInput label="Funding Limit (blank = unlimited)" value={inputs.interest_funding_limit ?? ''} onChange={v => onChange({ interest_funding_limit: v ? parseFloat(v) : null })} prefix="$" />
        )}
      </div>
    </div>
  );
}
