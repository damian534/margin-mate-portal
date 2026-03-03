import { ScenarioInputs, UnitMixRow } from '@/lib/feasibility/types';
import { FeasInput } from './FeasInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  inputs: ScenarioInputs;
  onChange: (patch: Partial<ScenarioInputs>) => void;
}

export function ConstructionTab({ inputs, onChange }: Props) {
  const set = (k: keyof ScenarioInputs) => (v: string) => onChange({ [k]: parseFloat(v) || 0 });
  const setInt = (k: keyof ScenarioInputs) => (v: string) => onChange({ [k]: parseInt(v) || 0 });

  const updateUnit = (id: string, patch: Partial<UnitMixRow>) => {
    onChange({ unit_mix: inputs.unit_mix.map(u => u.id === id ? { ...u, ...patch } : u) });
  };
  const addUnit = () => {
    onChange({ unit_mix: [...inputs.unit_mix, { id: crypto.randomUUID(), unit_type: 'Unit', count: 1, avg_sqm: 60 }] });
  };
  const removeUnit = (id: string) => {
    if (inputs.unit_mix.length <= 1) return;
    onChange({ unit_mix: inputs.unit_mix.filter(u => u.id !== id) });
  };

  const totalUnits = inputs.unit_mix.reduce((s, r) => s + r.count, 0);
  const totalSqm = inputs.unit_mix.reduce((s, r) => s + r.count * r.avg_sqm, 0);
  const baseBuild = totalSqm * inputs.build_rate_per_sqm;
  const contingency = baseBuild * inputs.build_contingency_rate;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-medium">Unit Mix</Label>
          <Button size="sm" variant="outline" onClick={addUnit} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Add</Button>
        </div>
        <div className="space-y-2">
          {inputs.unit_mix.map(u => (
            <div key={u.id} className="grid grid-cols-[1fr_60px_60px_28px] gap-2 items-end">
              <div>
                <Label className="text-[10px] text-muted-foreground">Type</Label>
                <Input className="h-7 text-xs" value={u.unit_type} onChange={e => updateUnit(u.id, { unit_type: e.target.value })} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Count</Label>
                <Input className="h-7 text-xs" type="number" value={u.count} onChange={e => updateUnit(u.id, { count: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Avg m²</Label>
                <Input className="h-7 text-xs" type="number" value={u.avg_sqm} onChange={e => updateUnit(u.id, { avg_sqm: parseFloat(e.target.value) || 0 })} />
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeUnit(u.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{totalUnits} units · {totalSqm.toLocaleString()} m²</div>
      </div>

      <FeasInput label="Build Rate / m²" value={inputs.build_rate_per_sqm} onChange={set('build_rate_per_sqm')} prefix="$" />
      <FeasInput label="Build Contingency %" value={(inputs.build_contingency_rate * 100).toFixed(1)} onChange={v => onChange({ build_contingency_rate: (parseFloat(v) || 0) / 100 })} suffix="%" />

      <div className="flex items-center gap-2">
        <Switch checked={inputs.include_gst_on_build} onCheckedChange={v => onChange({ include_gst_on_build: v })} />
        <Label className="text-xs">Include GST on build</Label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FeasInput label="Pre-build (months)" value={inputs.pre_build_months} onChange={setInt('pre_build_months')} />
        <FeasInput label="Build (months)" value={inputs.build_duration_months} onChange={setInt('build_duration_months')} />
        <FeasInput label="Settlement (month)" value={inputs.sales_settlement_month} onChange={setInt('sales_settlement_month')} />
      </div>

      <div className="p-3 rounded-md bg-muted text-sm space-y-1">
        <div>Base Build: ${baseBuild.toLocaleString()}</div>
        <div>Contingency: ${contingency.toLocaleString()}</div>
        <div className="font-medium">Gross Build: ${(baseBuild + contingency).toLocaleString()}</div>
      </div>
    </div>
  );
}
