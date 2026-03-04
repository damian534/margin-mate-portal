import { useState, useMemo, useCallback } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scenario, ScenarioInputs } from '@/lib/feasibility/types';
import { defaultInputs, scenarioAInputs, scenarioBInputs, createScenario } from '@/lib/feasibility/defaults';
import { calculateScenario } from '@/lib/feasibility/calculations';
import { SiteTab } from '@/components/feasibility/SiteTab';
import { ApprovalsTab } from '@/components/feasibility/ApprovalsTab';
import { ConstructionTab } from '@/components/feasibility/ConstructionTab';
import { FinanceTab } from '@/components/feasibility/FinanceTab';
import { SalesTab } from '@/components/feasibility/SalesTab';
import { PartnersTab } from '@/components/feasibility/PartnersTab';
import { OutputCards, PerUnitCards } from '@/components/feasibility/OutputCards';
import { PartnerSummary } from '@/components/feasibility/PartnerSummary';
import { CashflowChart, DebtChart, CostBreakdownChart } from '@/components/feasibility/FeasibilityCharts';
import { MonthlyTable } from '@/components/feasibility/MonthlyTable';
import { SensitivityPanel } from '@/components/feasibility/SensitivityPanel';
import { ScenarioComparison } from '@/components/feasibility/ScenarioComparison';
import { ExtrasTab } from '@/components/feasibility/ExtrasTab';
import { Copy, Plus, RotateCcw, Download } from 'lucide-react';
import { generateFeasibilityPdf } from '@/lib/pdf/feasibilityPdf';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function FeasibilityCalculator() {
  const [scenarios, setScenarios] = useState<Scenario[]>([
    createScenario(scenarioAInputs),
    createScenario(scenarioBInputs),
  ]);
  const [activeId, setActiveId] = useState(scenarios[0].id);

  const activeScenario = scenarios.find(s => s.id === activeId) ?? scenarios[0];

  const updateInputs = useCallback((patch: Partial<ScenarioInputs>) => {
    setScenarios(prev => prev.map(s => s.id === activeId ? { ...s, inputs: { ...s.inputs, ...patch }, outputs: null } : s));
  }, [activeId]);

  // Auto-calculate
  const outputs = useMemo(() => calculateScenario(activeScenario.inputs), [activeScenario.inputs]);

  // Keep outputs synced
  const allWithOutputs = useMemo(() =>
    scenarios.map(s => ({ ...s, outputs: calculateScenario(s.inputs) })),
    [scenarios]
  );

  const addScenario = () => {
    const s = createScenario({ ...defaultInputs, name: `Scenario ${scenarios.length + 1}` });
    setScenarios(prev => [...prev, s]);
    setActiveId(s.id);
  };

  const duplicateScenario = () => {
    const s = createScenario({ ...activeScenario.inputs, name: activeScenario.inputs.name + ' (copy)' });
    setScenarios(prev => [...prev, s]);
    setActiveId(s.id);
  };

  const resetScenario = () => {
    setScenarios(prev => prev.map(s => s.id === activeId ? { ...s, inputs: defaultInputs, outputs: null } : s));
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-3">
            <Input
              className="h-9 text-sm max-w-[200px]"
              placeholder="Project Name"
              value={activeScenario.inputs.project_name}
              onChange={e => updateInputs({ project_name: e.target.value })}
            />
            <Input
              className="h-9 text-sm max-w-[160px]"
              placeholder="Location"
              value={activeScenario.inputs.location}
              onChange={e => updateInputs({ location: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={activeId} onValueChange={setActiveId}>
              <SelectTrigger className="h-9 text-sm w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {scenarios.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.inputs.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={duplicateScenario}><Copy className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={addScenario}><Plus className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={resetScenario}><RotateCcw className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => generateFeasibilityPdf(activeScenario.inputs, outputs)}><Download className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* Left: Inputs */}
          <div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <Tabs defaultValue="site" className="w-full">
                <TabsList className="grid grid-cols-4 mb-3">
                  <TabsTrigger value="site" className="text-xs">Site</TabsTrigger>
                  <TabsTrigger value="approvals" className="text-xs">Approvals</TabsTrigger>
                  <TabsTrigger value="construction" className="text-xs">Build</TabsTrigger>
                  <TabsTrigger value="extras" className="text-xs">Extras</TabsTrigger>
                </TabsList>
                <TabsList className="grid grid-cols-3 mb-3">
                  <TabsTrigger value="finance" className="text-xs">Finance</TabsTrigger>
                  <TabsTrigger value="sales" className="text-xs">Sales</TabsTrigger>
                  <TabsTrigger value="partners" className="text-xs">Partners</TabsTrigger>
                </TabsList>

                <TabsContent value="site"><SiteTab inputs={activeScenario.inputs} onChange={updateInputs} /></TabsContent>
                <TabsContent value="approvals"><ApprovalsTab inputs={activeScenario.inputs} onChange={updateInputs} /></TabsContent>
                <TabsContent value="construction"><ConstructionTab inputs={activeScenario.inputs} onChange={updateInputs} /></TabsContent>
                <TabsContent value="finance"><FinanceTab inputs={activeScenario.inputs} onChange={updateInputs} /></TabsContent>
                <TabsContent value="sales"><SalesTab inputs={activeScenario.inputs} onChange={updateInputs} /></TabsContent>
                <TabsContent value="partners"><PartnersTab inputs={activeScenario.inputs} onChange={updateInputs} /></TabsContent>
                <TabsContent value="extras"><ExtrasTab inputs={activeScenario.inputs} onChange={updateInputs} /></TabsContent>
              </Tabs>
            </ScrollArea>
          </div>

          {/* Right: Outputs */}
          <div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-6 pr-2">
                <OutputCards outputs={outputs} />
                <PerUnitCards outputs={outputs} />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <CostBreakdownChart outputs={outputs} />
                  <CashflowChart outputs={outputs} />
                </div>

                <DebtChart outputs={outputs} />
                <MonthlyTable outputs={outputs} />
                <PartnerSummary outputs={outputs} />
                <SensitivityPanel inputs={activeScenario.inputs} />

                {allWithOutputs.length >= 2 && <ScenarioComparison scenarios={allWithOutputs} />}
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>
    </div>
  );
}
