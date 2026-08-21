import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FLOW_LABELS, type FlowType, type LeadEntity, type LeadEntityFlow } from '@/lib/entityMap/types';
import { fyLabel } from '@/lib/entityMap/servicing';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  flow: LeadEntityFlow | null;
  entities: LeadEntity[];
  financialYear: number;
  years: number[];
  onSave: (values: Partial<LeadEntityFlow>) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

export function FlowDialog({ open, onOpenChange, flow, entities, financialYear, years, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Partial<LeadEntityFlow>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(flow ? { ...flow } : {
      from_entity_id: entities[0]?.id, to_entity_id: entities[1]?.id,
      financial_year: financialYear, amount: 0, flow_type: 'trust_distribution',
      use_for_servicing: true, notes: '',
    });
  }, [open, flow, financialYear, entities]);

  const set = (k: keyof LeadEntityFlow, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));
  const valid = form.from_entity_id && form.to_entity_id && form.from_entity_id !== form.to_entity_id;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{flow ? 'Edit income flow' : 'Add income flow'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">From</Label>
              <Select value={form.from_entity_id ?? ''} onValueChange={v => set('from_entity_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Select value={form.to_entity_id ?? ''} onValueChange={v => set('to_entity_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {form.from_entity_id && form.from_entity_id === form.to_entity_id && (
            <p className="text-xs text-destructive">From and To must be different entities.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input
                inputMode="numeric"
                value={form.amount != null ? Number(form.amount).toLocaleString() : ''}
                onChange={e => set('amount', Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
              />
            </div>
            <div>
              <Label className="text-xs">Financial year</Label>
              <Select value={String(form.financial_year ?? financialYear)} onValueChange={v => set('financial_year', Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{fyLabel(y)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={form.flow_type ?? 'trust_distribution'} onValueChange={v => set('flow_type', v as FlowType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(FLOW_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.use_for_servicing !== false} onCheckedChange={v => set('use_for_servicing', !!v)} />
            Use this income for servicing
          </label>
          <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {flow && onDelete ? (
            <Button variant="destructive" size="sm" onClick={async () => { await onDelete(); onOpenChange(false); }}>Delete</Button>
          ) : <span />}
          <Button onClick={save} disabled={saving || !valid}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
