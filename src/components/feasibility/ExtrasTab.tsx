import { ScenarioInputs } from '@/lib/feasibility/types';
import {
  ToggleSection, CouncilToggle, ArchEngToggle, QsPmToggle,
  MarketingToggle, DebtFeesToggle, PresalesToggle
} from './OptionalCostToggles';

interface Props {
  inputs: ScenarioInputs;
  onChange: (patch: Partial<ScenarioInputs>) => void;
}

export function ExtrasTab({ inputs, onChange }: Props) {
  return (
    <div className="space-y-5">
      <ToggleSection
        label="Council Contributions / Headworks"
        checked={inputs.include_council_contributions}
        onToggle={v => onChange({ include_council_contributions: v })}
      >
        <CouncilToggle inputs={inputs} onChange={onChange} />
      </ToggleSection>

      <ToggleSection
        label="Architect / Engineering (% of Build)"
        checked={inputs.include_arch_eng_percent}
        onToggle={v => onChange({ include_arch_eng_percent: v })}
      >
        <ArchEngToggle inputs={inputs} onChange={onChange} />
      </ToggleSection>

      <ToggleSection
        label="QS / PM Fees"
        checked={inputs.include_qs_pm_fees}
        onToggle={v => onChange({ include_qs_pm_fees: v })}
      >
        <QsPmToggle inputs={inputs} onChange={onChange} />
      </ToggleSection>

      <ToggleSection
        label="Marketing & Staging"
        checked={inputs.include_marketing_staging}
        onToggle={v => onChange({ include_marketing_staging: v })}
      >
        <MarketingToggle inputs={inputs} onChange={onChange} />
      </ToggleSection>

      <ToggleSection
        label="Debt Establishment Fees"
        checked={inputs.include_debt_establishment_fees}
        onToggle={v => onChange({ include_debt_establishment_fees: v })}
      >
        <DebtFeesToggle inputs={inputs} onChange={onChange} />
      </ToggleSection>

      <ToggleSection
        label="Presales / Staged Settlement"
        checked={inputs.include_presales_staged_settlement}
        onToggle={v => onChange({ include_presales_staged_settlement: v })}
      >
        <PresalesToggle inputs={inputs} onChange={onChange} />
      </ToggleSection>
    </div>
  );
}
