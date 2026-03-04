import { ScenarioInputs } from '@/lib/feasibility/types';
import { FeasInput } from './FeasInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Props {
  inputs: ScenarioInputs;
  onChange: (patch: Partial<ScenarioInputs>) => void;
}

export function CouncilToggle({ inputs, onChange }: Props) {
  if (!inputs.include_council_contributions) return null;
  const set = (k: keyof ScenarioInputs) => (v: string) => onChange({ [k]: parseFloat(v) || 0 });

  return (
    <div className="space-y-3 pl-2 border-l-2 border-primary/20">
      <FeasInput label="Council Contributions Amount" value={inputs.council_contributions_amount} onChange={set('council_contributions_amount')} prefix="$" />
      <div>
        <Label className="text-xs text-muted-foreground">Timing</Label>
        <Select value={inputs.council_contributions_timing} onValueChange={v => onChange({ council_contributions_timing: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="upfront">Upfront (Month 1)</SelectItem>
            <SelectItem value="spread_prebuild">Spread across pre-build</SelectItem>
            <SelectItem value="build_start">At build start</SelectItem>
            <SelectItem value="settlement">At settlement</SelectItem>
            <SelectItem value="custom_month">Custom month</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {inputs.council_contributions_timing === 'custom_month' && (
        <FeasInput label="Custom Month" value={inputs.council_contributions_custom_month} onChange={v => onChange({ council_contributions_custom_month: parseInt(v) || 1 })} />
      )}
    </div>
  );
}

export function ArchEngToggle({ inputs, onChange }: Props) {
  if (!inputs.include_arch_eng_percent) return null;

  return (
    <div className="space-y-3 pl-2 border-l-2 border-primary/20">
      <FeasInput label="% of Build Cost" value={(inputs.arch_eng_percent_of_build * 100).toFixed(1)} onChange={v => onChange({ arch_eng_percent_of_build: (parseFloat(v) || 0) / 100 })} suffix="%" />
      <div>
        <Label className="text-xs text-muted-foreground">Timing</Label>
        <Select value={inputs.arch_eng_timing} onValueChange={v => onChange({ arch_eng_timing: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="spread_prebuild">Spread across pre-build</SelectItem>
            <SelectItem value="spread_build">Spread across build</SelectItem>
            <SelectItem value="custom">Custom schedule</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function QsPmToggle({ inputs, onChange }: Props) {
  if (!inputs.include_qs_pm_fees) return null;

  return (
    <div className="space-y-3 pl-2 border-l-2 border-primary/20">
      <div>
        <Label className="text-xs text-muted-foreground">Fee Structure</Label>
        <Select value={inputs.qs_pm_method} onValueChange={v => onChange({ qs_pm_method: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed amount</SelectItem>
            <SelectItem value="percent_of_build">% of build cost</SelectItem>
            <SelectItem value="monthly_retainer">Monthly retainer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {inputs.qs_pm_method === 'fixed' && (
        <FeasInput label="Fixed Amount" value={inputs.qs_pm_fixed_amount} onChange={v => onChange({ qs_pm_fixed_amount: parseFloat(v) || 0 })} prefix="$" />
      )}
      {inputs.qs_pm_method === 'percent_of_build' && (
        <FeasInput label="% of Build" value={(inputs.qs_pm_percent_of_build * 100).toFixed(1)} onChange={v => onChange({ qs_pm_percent_of_build: (parseFloat(v) || 0) / 100 })} suffix="%" />
      )}
      {inputs.qs_pm_method === 'monthly_retainer' && (
        <>
          <FeasInput label="Monthly Amount" value={inputs.qs_pm_monthly_amount} onChange={v => onChange({ qs_pm_monthly_amount: parseFloat(v) || 0 })} prefix="$" />
          <div className="grid grid-cols-2 gap-2">
            <FeasInput label="Start Month" value={inputs.qs_pm_start_month} onChange={v => onChange({ qs_pm_start_month: parseInt(v) || 1 })} />
            <FeasInput label="End Month" value={inputs.qs_pm_end_month} onChange={v => onChange({ qs_pm_end_month: parseInt(v) || 1 })} />
          </div>
        </>
      )}
      {inputs.qs_pm_method !== 'monthly_retainer' && (
        <div>
          <Label className="text-xs text-muted-foreground">Timing</Label>
          <Select value={inputs.qs_pm_timing} onValueChange={v => onChange({ qs_pm_timing: v as any })}>
            <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="spread_build">Spread across build</SelectItem>
              <SelectItem value="upfront">Upfront</SelectItem>
              <SelectItem value="even">Even across project</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export function MarketingToggle({ inputs, onChange }: Props) {
  if (!inputs.include_marketing_staging) return null;

  return (
    <div className="space-y-3 pl-2 border-l-2 border-primary/20">
      <div>
        <Label className="text-xs text-muted-foreground">Method</Label>
        <Select value={inputs.marketing_method} onValueChange={v => onChange({ marketing_method: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed amount</SelectItem>
            <SelectItem value="percent_of_revenue">% of revenue</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {inputs.marketing_method === 'fixed' ? (
        <FeasInput label="Fixed Amount" value={inputs.marketing_fixed_amount} onChange={v => onChange({ marketing_fixed_amount: parseFloat(v) || 0 })} prefix="$" />
      ) : (
        <FeasInput label="% of Revenue" value={(inputs.marketing_percent_of_revenue * 100).toFixed(1)} onChange={v => onChange({ marketing_percent_of_revenue: (parseFloat(v) || 0) / 100 })} suffix="%" />
      )}
      <div>
        <Label className="text-xs text-muted-foreground">Timing</Label>
        <Select value={inputs.marketing_timing} onValueChange={v => onChange({ marketing_timing: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="settlement">At settlement</SelectItem>
            <SelectItem value="presales_launch">At presales launch</SelectItem>
            <SelectItem value="spread_last_x">Spread last X months</SelectItem>
            <SelectItem value="custom_month">Custom month</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {inputs.marketing_timing === 'spread_last_x' && (
        <FeasInput label="Spread Months" value={inputs.marketing_spread_months} onChange={v => onChange({ marketing_spread_months: parseInt(v) || 1 })} />
      )}
      {inputs.marketing_timing === 'custom_month' && (
        <FeasInput label="Custom Month" value={inputs.marketing_custom_month} onChange={v => onChange({ marketing_custom_month: parseInt(v) || 1 })} />
      )}
    </div>
  );
}

export function DebtFeesToggle({ inputs, onChange }: Props) {
  if (!inputs.include_debt_establishment_fees) return null;

  return (
    <div className="space-y-3 pl-2 border-l-2 border-primary/20">
      <FeasInput label="Land Estab. Fee %" value={(inputs.land_establishment_fee_percent * 100).toFixed(2)} onChange={v => onChange({ land_establishment_fee_percent: (parseFloat(v) || 0) / 100 })} suffix="%" />
      <FeasInput label="Construction Estab. Fee %" value={(inputs.construction_establishment_fee_percent * 100).toFixed(2)} onChange={v => onChange({ construction_establishment_fee_percent: (parseFloat(v) || 0) / 100 })} suffix="%" />
      <div>
        <Label className="text-xs text-muted-foreground">Payment Method</Label>
        <Select value={inputs.debt_fee_payment_method} onValueChange={v => onChange({ debt_fee_payment_method: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="upfront">Paid upfront (cash)</SelectItem>
            <SelectItem value="capitalised">Capitalised into debt</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Timing</Label>
        <Select value={inputs.debt_fee_timing} onValueChange={v => onChange({ debt_fee_timing: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="month_1">Month 1</SelectItem>
            <SelectItem value="construction_start">At construction start</SelectItem>
            <SelectItem value="split">Split (land M1, constr build start)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function PresalesToggle({ inputs, onChange }: Props) {
  if (!inputs.include_presales_staged_settlement) return null;

  const addStage = () => {
    const rows = [...inputs.staged_settlement_rows, {
      id: crypto.randomUUID(),
      stage_name: `Stage ${inputs.staged_settlement_rows.length + 1}`,
      stage_month: inputs.sales_settlement_month,
      stage_percent: 0,
    }];
    onChange({ staged_settlement_rows: rows });
  };

  const removeStage = (id: string) => {
    onChange({ staged_settlement_rows: inputs.staged_settlement_rows.filter(r => r.id !== id) });
  };

  const updateStage = (id: string, patch: Partial<typeof inputs.staged_settlement_rows[0]>) => {
    onChange({ staged_settlement_rows: inputs.staged_settlement_rows.map(r => r.id === id ? { ...r, ...patch } : r) });
  };

  const pctSum = inputs.staged_settlement_rows.reduce((s, r) => s + r.stage_percent, 0);

  return (
    <div className="space-y-3 pl-2 border-l-2 border-primary/20">
      <FeasInput label="Presales Start Month" value={inputs.presales_start_month} onChange={v => onChange({ presales_start_month: parseInt(v) || 1 })} />
      <div>
        <Label className="text-xs text-muted-foreground">Schedule Method</Label>
        <Select value={inputs.presales_schedule_method} onValueChange={v => onChange({ presales_schedule_method: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="staged_percent">Staged settlements (%)</SelectItem>
            <SelectItem value="unit_level">Unit-level staging</SelectItem>
            <SelectItem value="custom_cashflow">Custom cashflow table</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {inputs.presales_schedule_method === 'staged_percent' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Stages</Label>
            <button onClick={addStage} className="text-xs text-primary hover:underline">+ Add Stage</button>
          </div>
          {inputs.staged_settlement_rows.map(r => (
            <div key={r.id} className="grid grid-cols-[1fr_50px_50px_24px] gap-1 items-end">
              <FeasInput label="Name" value={r.stage_name} onChange={v => updateStage(r.id, { stage_name: v })} type="text" />
              <FeasInput label="Mth" value={r.stage_month} onChange={v => updateStage(r.id, { stage_month: parseInt(v) || 1 })} />
              <FeasInput label="%" value={r.stage_percent} onChange={v => updateStage(r.id, { stage_percent: parseFloat(v) || 0 })} />
              <button onClick={() => removeStage(r.id)} className="text-destructive text-xs pb-1">✕</button>
            </div>
          ))}
          <div className={`text-xs ${Math.abs(pctSum - 100) > 0.1 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            Total: {pctSum.toFixed(1)}% {Math.abs(pctSum - 100) > 0.1 && '(must equal 100%)'}
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs text-muted-foreground">Debt Repayment Strategy</Label>
        <Select value={inputs.debt_repayment_strategy} onValueChange={v => onChange({ debt_repayment_strategy: v as any })}>
          <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="final_settlement">Repay all at final settlement</SelectItem>
            <SelectItem value="waterfall">Waterfall (reduce debt with each stage)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Wrapper to add toggle rows
interface ToggleSectionProps {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}

export function ToggleSection({ label, checked, onToggle, children }: ToggleSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Switch checked={checked} onCheckedChange={onToggle} />
        <Label className="text-xs font-medium">{label}</Label>
      </div>
      {checked && children}
    </div>
  );
}
