import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Network, AlertTriangle, Building2, Wand2, Download } from 'lucide-react';
import { SectionCard } from '@/components/lead/SectionCard';
import { useLeadEntities } from '@/hooks/useLeadEntities';
import { EntityMapCanvas } from './EntityMapCanvas';
import { EntityDialog } from './EntityDialog';
import { EntityDetailsDialog } from './EntityDetailsDialog';
import { FlowDialog } from './FlowDialog';
import { StructureWizard } from './StructureWizard';
import {
  autoLayout, computeServicing, currentFinancialYear, formatMoney, fyLabel, traceUpstream,
} from '@/lib/entityMap/servicing';
import { downloadStructureChart } from '@/lib/entityMap/exportChart';
import { ENTITY_TYPE_LABELS, type LeadEntity, type LeadEntityFlow, type LeadEntityRole } from '@/lib/entityMap/types';

interface Props {
  leadId: string;
  leadName?: string;
  isPreviewMode?: boolean;
  readOnly?: boolean;
}

export function EntityMapSection({ leadId, leadName, isPreviewMode = false, readOnly = false }: Props) {

  const { entities, roles, flows, loading, refresh } = useLeadEntities(leadId, isPreviewMode);
  const [fy, setFy] = useState(currentFinancialYear());
  const [entityDialog, setEntityDialog] = useState<{ open: boolean; entity: LeadEntity | null }>({ open: false, entity: null });
  const [flowDialog, setFlowDialog] = useState<{ open: boolean; flow: LeadEntityFlow | null }>({ open: false, flow: null });
  const [focusId, setFocusId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);


  const years = useMemo(() => {
    const base = currentFinancialYear();
    const set = new Set<number>([base + 1, base, base - 1, base - 2, base - 3, ...flows.map(f => f.financial_year)]);
    return [...set].sort((a, b) => b - a);
  }, [flows]);

  // Land on a year that actually has data so the map is never blank on open.
  const autoPicked = useRef(false);
  useEffect(() => {
    if (autoPicked.current || !flows.length) return;
    autoPicked.current = true;
    if (!flows.some(f => f.financial_year === fy)) {
      setFy(Math.max(...flows.map(f => f.financial_year)));
    }
  }, [flows, fy]);

  const servicing = useMemo(() => computeServicing(entities, flows, fy), [entities, flows, fy]);
  const yearFlows = useMemo(() => flows.filter(f => f.financial_year === fy), [flows, fy]);
  const highlight = useMemo(
    () => (focusId ? traceUpstream(focusId, flows, fy) : null),
    [focusId, flows, fy],
  );

  const guard = () => {
    if (isPreviewMode) { toast.success('Saved (preview)'); return true; }
    return false;
  };

  const saveEntity = async (values: Partial<LeadEntity>) => {
    if (guard()) return;
    const payload = {
      lead_id: leadId,
      name: values.name?.trim(),
      entity_type: values.entity_type,
      abn: values.abn?.trim() || null,
      acn: values.acn?.trim() || null,
      trustee_entity_id: values.trustee_entity_id || null,
      is_applicant: !!values.is_applicant,
      fy_end: values.fy_end?.trim() || null,
      notes: values.notes?.trim() || null,
    };
    const { error } = entityDialog.entity
      ? await supabase.from('lead_entities').update(payload as any).eq('id', entityDialog.entity.id)
      : await supabase.from('lead_entities').insert({
          ...payload,
          position_x: 40 + (entities.length % 4) * 260,
          position_y: 40 + Math.floor(entities.length / 4) * 170,
          sort_order: entities.length,
        } as any);
    if (error) { toast.error('Failed to save entity'); return; }
    toast.success('Entity saved');
    refresh();
  };

  const deleteEntity = async () => {
    const target = entityDialog.entity;
    if (!target || guard()) return;
    const { error } = await supabase.from('lead_entities').delete().eq('id', target.id);
    if (error) { toast.error('Failed to delete entity'); return; }
    if (focusId === target.id) setFocusId(null);
    toast.success('Entity deleted');
    refresh();
  };

  const saveFlow = async (values: Partial<LeadEntityFlow>) => {
    if (guard()) return;
    const payload = {
      lead_id: leadId,
      from_entity_id: values.from_entity_id,
      to_entity_id: values.to_entity_id,
      financial_year: values.financial_year ?? fy,
      amount: Number(values.amount) || 0,
      flow_type: values.flow_type ?? 'trust_distribution',
      use_for_servicing: values.use_for_servicing !== false,
      notes: values.notes?.trim() || null,
    };
    const { error } = flowDialog.flow
      ? await supabase.from('lead_entity_flows').update(payload as any).eq('id', flowDialog.flow.id)
      : await supabase.from('lead_entity_flows').insert(payload as any);
    if (error) { toast.error('Failed to save flow'); return; }
    toast.success('Income flow saved');
    refresh();
  };

  const deleteFlow = async () => {
    const target = flowDialog.flow;
    if (!target || guard()) return;
    const { error } = await supabase.from('lead_entity_flows').delete().eq('id', target.id);
    if (error) { toast.error('Failed to delete flow'); return; }
    toast.success('Flow deleted');
    refresh();
  };

  const addRole = async (values: Partial<LeadEntityRole>) => {
    if (guard()) return;
    const { error } = await supabase.from('lead_entity_roles').insert({ ...values, lead_id: leadId } as any);
    if (error) { toast.error('Failed to add role'); return; }
    refresh();
  };

  const removeRole = async (id: string) => {
    if (guard()) return;
    const { error } = await supabase.from('lead_entity_roles').delete().eq('id', id);
    if (error) { toast.error('Failed to remove role'); return; }
    refresh();
  };

  const moveNode = async (id: string, x: number, y: number) => {
    if (isPreviewMode || readOnly) return;
    await supabase.from('lead_entities').update({ position_x: x, position_y: y } as any).eq('id', id);
  };

  const tidyUp = async () => {
    if (guard()) return;
    const positions = autoLayout(entities, yearFlows, roles);
    await Promise.all(
      Object.entries(positions).map(([id, p]) =>
        supabase.from('lead_entities').update({ position_x: p.x, position_y: p.y } as any).eq('id', id),
      ),
    );
    refresh();
  };

  return (
    <SectionCard title="Business structure & income flow" icon={Network}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Select value={String(fy)} onValueChange={v => setFy(Number(v))}>
            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{fyLabel(y)}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            {entities.length > 0 && (
              <Button size="sm" variant="outline" onClick={downloadChart}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download chart
              </Button>
            )}
            {!readOnly && (
              <>
                <Button size="sm" onClick={() => setWizardOpen(true)}>
                  <Wand2 className="w-3.5 h-3.5 mr-1" /> Guided setup
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEntityDialog({ open: true, entity: null })}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Entity
                </Button>
                <Button size="sm" variant="outline" disabled={entities.length < 2} onClick={() => setFlowDialog({ open: true, flow: null })}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Income flow
                </Button>
              </>
            )}
          </div>

        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading structure…</p>
        ) : entities.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <Building2 className="w-6 h-6 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Nothing mapped yet. The guided setup asks a few plain-English questions — what the structure is, who the trustee and
                directors are, and who receives the income — then draws the map for you.
              </p>
              {!readOnly && (
                <Button size="sm" onClick={() => setWizardOpen(true)}>
                  <Wand2 className="w-3.5 h-3.5 mr-1" /> Start guided setup
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <EntityMapCanvas
              entities={entities}
              flows={yearFlows}
              roles={roles}
              highlight={highlight}
              readOnly={readOnly}
              onNodeClick={en => setFocusId(prev => (prev === en.id ? null : en.id))}
              onNodeMoved={moveNode}
              onFlowClick={f => !readOnly && setFlowDialog({ open: true, flow: f })}
              onAutoLayout={tidyUp}
            />
            {yearFlows.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No income was recorded for {fyLabel(fy)}
                {flows.length > 0 && ' — try another financial year above'}. The dashed lines still show who controls what.
              </p>
            )}
            {focusId && (
              <p className="text-xs text-muted-foreground">
                Showing the income chain feeding <span className="font-medium">{entities.find(e => e.id === focusId)?.name}</span>. Click the entity again to clear.
              </p>
            )}

            {/* Servicing summary */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Serviceable income · {fyLabel(fy)}</p>
                  <p className="text-2xl font-semibold text-success tabular-nums">{formatMoney(servicing.totalServiceable)}</p>
                  <div className="mt-2 space-y-1">
                    {servicing.applicants.map(a => (
                      <div key={a.entityId} className="flex justify-between text-sm">
                        <span className="truncate">{a.name}</span>
                        <span className="tabular-nums">{formatMoney(a.total)}</span>
                      </div>
                    ))}
                    {servicing.applicants.length === 0 && (
                      <p className="text-xs text-muted-foreground">No entity is marked as a loan applicant yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Income retained in non-applicant entities</p>
                  <p className="text-2xl font-semibold tabular-nums">{formatMoney(servicing.totalTrapped)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Profits sitting in a company or trust that were not distributed to an applicant this year.
                  </p>
                </CardContent>
              </Card>
            </div>

            {servicing.warnings.length > 0 && (
              <div className="rounded-md border border-warning/40 bg-warning/5 p-3 space-y-1">
                {servicing.warnings.map((w, i) => (
                  <p key={i} className="text-xs flex gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                    <span>{w.message}</span>
                  </p>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Click any card on the map to see its directors, beneficiaries and income in a pop-up.
            </p>

          </>
        )}
      </div>

      <StructureWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        leadId={leadId}
        financialYear={fy}
        isPreviewMode={isPreviewMode}
        existingEntities={entities}
        onCompleted={refresh}
      />
      <EntityDialog
        open={entityDialog.open}
        onOpenChange={v => setEntityDialog(s => ({ ...s, open: v }))}
        entity={entityDialog.entity}
        entities={entities}
        onSave={saveEntity}
        onDelete={entityDialog.entity ? deleteEntity : undefined}
      />
      <FlowDialog
        open={flowDialog.open}
        onOpenChange={v => setFlowDialog(s => ({ ...s, open: v }))}
        flow={flowDialog.flow}
        entities={entities}
        financialYear={fy}
        years={years}
        onSave={saveFlow}
        onDelete={flowDialog.flow ? deleteFlow : undefined}
      />
    </SectionCard>
  );
}
