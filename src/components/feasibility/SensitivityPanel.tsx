import { ScenarioInputs, ScenarioOutputs } from '@/lib/feasibility/types';
import { calculateScenario } from '@/lib/feasibility/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useState, useMemo } from 'react';

interface Props {
  inputs: ScenarioInputs;
}

const fmt = (v: number) => '$' + Math.round(v).toLocaleString();

export function SensitivityPanel({ inputs }: Props) {
  const [rateAdj, setRateAdj] = useState(0);
  const [buildAdj, setBuildAdj] = useState(0);
  const [priceAdj, setPriceAdj] = useState(0);

  const results = useMemo(() => {
    const adj: ScenarioInputs = {
      ...inputs,
      land_interest_rate_annual: inputs.land_interest_rate_annual + rateAdj / 100,
      construction_interest_rate_annual: inputs.construction_interest_rate_annual + rateAdj / 100,
      build_duration_months: inputs.build_duration_months + buildAdj,
      sales_settlement_month: inputs.sales_settlement_month + buildAdj,
      avg_sale_price: inputs.avg_sale_price * (1 + priceAdj / 100),
    };
    return calculateScenario(adj);
  }, [inputs, rateAdj, buildAdj, priceAdj]);

  const base = useMemo(() => calculateScenario(inputs), [inputs]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Sensitivity Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Interest Rate: {rateAdj >= 0 ? '+' : ''}{rateAdj.toFixed(1)}%</Label>
          <Slider value={[rateAdj]} onValueChange={([v]) => setRateAdj(v)} min={-2} max={2} step={0.1} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Build Duration: +{buildAdj} months</Label>
          <Slider value={[buildAdj]} onValueChange={([v]) => setBuildAdj(v)} min={0} max={12} step={1} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Sale Price: {priceAdj >= 0 ? '+' : ''}{priceAdj.toFixed(0)}%</Label>
          <Slider value={[priceAdj]} onValueChange={([v]) => setPriceAdj(v)} min={-10} max={10} step={1} className="mt-1" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-muted rounded">
            <div className="text-muted-foreground">Base Net Profit</div>
            <div className="font-semibold">{fmt(base.net_profit_after_tax)}</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="text-muted-foreground">Adjusted Net Profit</div>
            <div className={`font-semibold ${results.net_profit_after_tax < base.net_profit_after_tax ? 'text-destructive' : 'text-green-600'}`}>
              {fmt(results.net_profit_after_tax)}
            </div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="text-muted-foreground">Base Equity</div>
            <div className="font-semibold">{fmt(base.total_equity_required)}</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="text-muted-foreground">Adjusted Equity</div>
            <div className="font-semibold">{fmt(results.total_equity_required)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
