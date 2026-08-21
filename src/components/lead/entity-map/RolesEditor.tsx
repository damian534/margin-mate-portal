import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { ROLE_LABELS, type LeadEntity, type LeadEntityRole, type RoleType } from '@/lib/entityMap/types';

interface Props {
  entity: LeadEntity;
  entities: LeadEntity[];
  roles: LeadEntityRole[];
  readOnly?: boolean;
  onAdd: (values: Partial<LeadEntityRole>) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
}

export function RolesEditor({ entity, entities, roles, readOnly, onAdd, onRemove }: Props) {
  const [role, setRole] = useState<RoleType>('director');
  const [personId, setPersonId] = useState<string>('__free__');
  const [name, setName] = useState('');
  const [pct, setPct] = useState('');

  const rows = roles.filter(r => r.entity_id === entity.id);
  const nameOf = (r: LeadEntityRole) =>
    r.person_entity_id ? (entities.find(e => e.id === r.person_entity_id)?.name ?? '—') : (r.person_name || '—');

  const add = async () => {
    const linked = personId !== '__free__';
    if (!linked && !name.trim()) return;
    await onAdd({
      entity_id: entity.id,
      person_entity_id: linked ? personId : null,
      person_name: linked ? null : name.trim(),
      role,
      percentage: pct ? Number(pct) : null,
    });
    setName(''); setPct(''); setPersonId('__free__');
  };

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-xs text-muted-foreground">No directors, beneficiaries or shareholders recorded.</p>}
      {rows.map(r => (
        <div key={r.id} className="flex items-center gap-2 text-sm">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
            {ROLE_LABELS[r.role] ?? r.role}
          </span>
          <span className="flex-1 min-w-0 truncate">{nameOf(r)}</span>
          {r.percentage != null && <span className="text-xs text-muted-foreground tabular-nums">{r.percentage}%</span>}
          {!readOnly && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(r.id)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <Select value={role} onValueChange={v => setRole(v as RoleType)}>
            <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__free__">Type a name…</SelectItem>
              {entities.filter(e => e.id !== entity.id).map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {personId === '__free__' && (
            <Input className="h-8 w-40" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          )}
          <Input className="h-8 w-20" placeholder="%" inputMode="numeric" value={pct} onChange={e => setPct(e.target.value.replace(/[^0-9.]/g, ''))} />
          <Button size="sm" variant="outline" className="h-8" onClick={add}><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
        </div>
      )}
    </div>
  );
}
