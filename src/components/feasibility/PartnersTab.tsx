import { ScenarioInputs, Partner } from '@/lib/feasibility/types';
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

export function PartnersTab({ inputs, onChange }: Props) {
  const update = (id: string, patch: Partial<Partner>) => {
    onChange({ partners: inputs.partners.map(p => p.id === id ? { ...p, ...patch } : p) });
  };
  const add = () => {
    onChange({ partners: [...inputs.partners, { id: crypto.randomUUID(), name: `Partner ${inputs.partners.length + 1}`, ownership_percent: 0, capital_contribution_percent: 0 }] });
  };
  const remove = (id: string) => {
    if (inputs.partners.length <= 1) return;
    onChange({ partners: inputs.partners.filter(p => p.id !== id) });
  };

  const totalOwnership = inputs.partners.reduce((s, p) => s + p.ownership_percent, 0);
  const totalContrib = inputs.partners.reduce((s, p) => s + p.capital_contribution_percent, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Partners</Label>
        <Button size="sm" variant="outline" onClick={add} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" /> Add</Button>
      </div>

      <div className="space-y-3">
        {inputs.partners.map(p => (
          <div key={p.id} className="p-3 rounded-md border space-y-2">
            <div className="flex items-center gap-2">
              <Input className="h-7 text-xs flex-1" value={p.name} onChange={e => update(p.id, { name: e.target.value })} placeholder="Name" />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(p.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FeasInput label="Ownership %" value={p.ownership_percent} onChange={v => update(p.id, { ownership_percent: parseFloat(v) || 0 })} suffix="%" />
              <FeasInput label="Capital Contrib %" value={p.capital_contribution_percent} onChange={v => update(p.id, { capital_contribution_percent: parseFloat(v) || 0 })} suffix="%" />
            </div>
          </div>
        ))}
      </div>

      <div className={`text-xs ${totalOwnership !== 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
        Ownership: {totalOwnership}% {totalOwnership !== 100 && '(must = 100%)'}
      </div>
      <div className={`text-xs ${totalContrib !== 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
        Contribution: {totalContrib}% {totalContrib !== 100 && '(must = 100%)'}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch checked={inputs.profit_split_by_ownership} onCheckedChange={v => onChange({ profit_split_by_ownership: v })} />
          <Label className="text-xs">Profit split by ownership %</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={inputs.equity_by_contribution} onCheckedChange={v => onChange({ equity_by_contribution: v })} />
          <Label className="text-xs">Equity by capital contribution %</Label>
        </div>
      </div>
    </div>
  );
}
