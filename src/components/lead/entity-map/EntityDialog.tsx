import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ENTITY_TYPE_LABELS, type EntityType, type LeadEntity } from '@/lib/entityMap/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity: LeadEntity | null;
  entities: LeadEntity[];
  onSave: (values: Partial<LeadEntity>) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

const EMPTY: Partial<LeadEntity> = {
  name: '', entity_type: 'company', abn: '', acn: '', trustee_entity_id: null,
  is_applicant: false, fy_end: '', notes: '',
};

export function EntityDialog({ open, onOpenChange, entity, entities, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Partial<LeadEntity>>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(entity ? { ...entity } : { ...EMPTY }); }, [open, entity]);

  const set = (k: keyof LeadEntity, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));
  const isTrust = form.entity_type === 'discretionary_trust' || form.entity_type === 'unit_trust' || form.entity_type === 'smsf';

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{entity ? 'Edit entity' : 'Add entity'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={form.name ?? ''} onChange={e => set('name', e.target.value)} placeholder="e.g. Smith Family Trust" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.entity_type ?? 'company'} onValueChange={v => set('entity_type', v as EntityType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Financial year end</Label>
              <Input value={form.fy_end ?? ''} onChange={e => set('fy_end', e.target.value)} placeholder="30 June" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">ABN</Label><Input value={form.abn ?? ''} onChange={e => set('abn', e.target.value)} /></div>
            <div><Label className="text-xs">ACN</Label><Input value={form.acn ?? ''} onChange={e => set('acn', e.target.value)} /></div>
          </div>
          {isTrust && (
            <div>
              <Label className="text-xs">Trustee</Label>
              <Select
                value={form.trustee_entity_id ?? '__none__'}
                onValueChange={v => set('trustee_entity_id', v === '__none__' ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Select trustee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  {entities.filter(e => e.id !== entity?.id).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!form.is_applicant} onCheckedChange={v => set('is_applicant', !!v)} />
            This entity is a loan applicant (income here counts for servicing)
          </label>
          <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {entity && onDelete ? (
            <Button variant="destructive" size="sm" onClick={async () => { await onDelete(); onOpenChange(false); }}>Delete</Button>
          ) : <span />}
          <Button onClick={save} disabled={saving || !form.name?.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
