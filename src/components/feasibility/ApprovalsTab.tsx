import { ScenarioInputs } from '@/lib/feasibility/types';
import { FeasInput } from './FeasInput';

interface Props {
  inputs: ScenarioInputs;
  onChange: (patch: Partial<ScenarioInputs>) => void;
}

export function ApprovalsTab({ inputs, onChange }: Props) {
  const set = (k: keyof ScenarioInputs) => (v: string) => onChange({ [k]: parseFloat(v) || 0 });
  const total = inputs.plans_to_planning + inputs.planner + inputs.other_consultants + inputs.build_approval_est + inputs.survey_titles;

  return (
    <div className="space-y-4">
      <FeasInput label="Plans to Planning" value={inputs.plans_to_planning} onChange={set('plans_to_planning')} prefix="$" />
      <FeasInput label="Planner" value={inputs.planner} onChange={set('planner')} prefix="$" />
      <FeasInput label="Other Consultants" value={inputs.other_consultants} onChange={set('other_consultants')} prefix="$" />
      <FeasInput label="Build Approval Estimate" value={inputs.build_approval_est} onChange={set('build_approval_est')} prefix="$" />
      <FeasInput label="Survey & Titles" value={inputs.survey_titles} onChange={set('survey_titles')} prefix="$" />
      <div className="p-3 rounded-md bg-muted text-sm font-medium">
        Soft Costs Total: ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
}
