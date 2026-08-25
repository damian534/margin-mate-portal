import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowDownLeft, ArrowUpRight, Pencil, Route } from 'lucide-react';
import { RolesEditor } from './RolesEditor';
import { formatMoney, fyLabel } from '@/lib/entityMap/servicing';
import { ENTITY_TYPE_LABELS, FLOW_LABELS, type LeadEntity, type LeadEntityFlow, type LeadEntityRole } from '@/lib/entityMap/types';

interface Props {
  entity: LeadEntity | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entities: LeadEntity[];
  roles: LeadEntityRole[];
  flows: LeadEntityFlow[];
  financialYear: number;
  readOnly?: boolean;
  tracing?: boolean;
  onEdit: (entity: LeadEntity) => void;
  onTrace: (entity: LeadEntity) => void;
  onFlowClick: (flow: LeadEntityFlow) => void;
  onAddRole: (values: Partial<LeadEntityRole>) => Promise<void> | void;
  onRemoveRole: (id: string) => Promise<void> | void;
}

export function EntityDetailsDialog({
  entity, open, onOpenChange, entities, roles, flows, financialYear,
  readOnly, tracing, onEdit, onTrace, onFlowClick, onAddRole, onRemoveRole,
}: Props) {
  if (!entity) return null;
  const nameOf = (id: string) => entities.find(e => e.id === id)?.name ?? '—';
  const incoming = flows.filter(f => f.to_entity_id === entity.id);
  const outgoing = flows.filter(f => f.from_entity_id === entity.id);
  const trustee = entity.trustee_entity_id ? entities.find(e => e.id === entity.trustee_entity_id) : null;

  const FlowRow = ({ f, dir }: { f: LeadEntityFlow; dir: 'in' | 'out' }) => (
    <button
      key={f.id}
      onClick={() => onFlowClick(f)}
      className="w-full flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm hover:bg-muted/50"
    >
      {dir === 'in'
        ? <ArrowDownLeft className="w-3.5 h-3.5 text-success shrink-0" />
        : <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      <span className="flex-1 min-w-0 truncate">
        {dir === 'in' ? `From ${nameOf(f.from_entity_id)}` : `To ${nameOf(f.to_entity_id)}`}
        <span className="text-xs text-muted-foreground"> · {FLOW_LABELS[f.flow_type]}</span>
      </span>
      <span className="tabular-nums font-medium">{formatMoney(f.amount)}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">{entity.name}</DialogTitle>
          <p className="text-xs text-muted-foreground text-left">
            {ENTITY_TYPE_LABELS[entity.entity_type]}
            {trustee && ` · Trustee: ${trustee.name}`}
            {entity.abn && ` · ABN ${entity.abn}`}
            {entity.is_applicant && ' · On the loan'}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={() => onEdit(entity)}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit entity
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onTrace(entity)}>
              <Route className="w-3.5 h-3.5 mr-1" /> {tracing ? 'Clear trace' : 'Trace income'}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">People & roles</p>
            <RolesEditor
              entity={entity}
              entities={entities}
              roles={roles}
              readOnly={readOnly}
              onAdd={onAddRole}
              onRemove={onRemoveRole}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Income · {fyLabel(financialYear)}</p>
            {incoming.length === 0 && outgoing.length === 0 && (
              <p className="text-xs text-muted-foreground">No income recorded for this entity in {fyLabel(financialYear)}.</p>
            )}
            {incoming.map(f => <FlowRow key={f.id} f={f} dir="in" />)}
            {outgoing.map(f => <FlowRow key={f.id} f={f} dir="out" />)}
          </div>

          {entity.notes && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{entity.notes}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
