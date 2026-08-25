import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/lead/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { useApplicants, useFactFind, type Applicant } from './useFactFind';

const EMPLOYMENT_TYPES = [
  { value: 'payg', label: 'PAYG' },
  { value: 'self_employed', label: 'Self employed' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'casual', label: 'Casual' },
  { value: 'retired', label: 'Retired' },
  { value: 'not_employed', label: 'Not employed' },
];

const PERSONAL_FIELDS: { key: string; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'date_of_birth', label: 'Date of birth' },
  { key: 'marital_status', label: 'Marital status' },
  { key: 'dependants', label: 'Dependants' },
  { key: 'dependant_ages', label: 'Ages of dependants' },
  { key: 'residency_status', label: 'Residency status' },
];

interface Props {
  leadId: string;
  isPreviewMode: boolean;
  leadName: string;
  leadEmail: string | null;
  leadPhone: string | null;
  onOpenContact?: (contactId: string) => void;
  primaryContactId?: string | null;
}

export function ClientsTab({ leadId, isPreviewMode, leadName, leadEmail, leadPhone, onOpenContact, primaryContactId }: Props) {
  const { applicants, refreshApplicants } = useApplicants(leadId, isPreviewMode);
  const { factFind } = useFactFind(leadId, isPreviewMode);
  const [draft, setDraft] = useState<Record<string, Partial<Applicant>>>({});

  const personal = factFind['personal_details'] || {};

  const patch = (id: string, changes: Partial<Applicant>) =>
    setDraft(prev => ({ ...prev, [id]: { ...prev[id], ...changes } }));

  const save = async (a: Applicant) => {
    const changes = draft[a.id];
    if (!changes) return;
    if (isPreviewMode) { toast.info('Preview mode — not saved'); return; }
    const { error } = await supabase.from('lead_applicants').update(changes as any).eq('id', a.id);
    if (error) { toast.error('Failed to save applicant'); return; }
    setDraft(prev => { const next = { ...prev }; delete next[a.id]; return next; });
    refreshApplicants();
    toast.success('Applicant updated');
  };

  const addApplicant = async () => {
    if (isPreviewMode) { toast.info('Preview mode — not saved'); return; }
    const { error } = await supabase.from('lead_applicants').insert({
      lead_id: leadId,
      name: 'New applicant',
      display_order: applicants.length,
    } as any);
    if (error) { toast.error('Failed to add applicant'); return; }
    refreshApplicants();
  };

  const removeApplicant = async (id: string) => {
    if (isPreviewMode) { toast.info('Preview mode — not saved'); return; }
    const { error } = await supabase.from('lead_applicants').delete().eq('id', id);
    if (error) { toast.error('Failed to remove applicant'); return; }
    refreshApplicants();
  };

  return (
    <>
      <SectionCard
        icon={User}
        title="Primary client"
        tone="info"
        subtitle={leadName || 'Unnamed client'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <Label className="text-[11px] text-muted-foreground">Email</Label>
            <p className="font-medium break-all">{leadEmail || '—'}</p>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Phone</Label>
            <p className="font-medium">{leadPhone || '—'}</p>
          </div>
          {PERSONAL_FIELDS.map(f => (
            <div key={f.key}>
              <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
              <p className="font-medium">{personal[f.key] ? String(personal[f.key]) : '—'}</p>
            </div>
          ))}
        </div>
        {onOpenContact && primaryContactId && (
          <Button variant="outline" size="sm" className="mt-1" onClick={() => onOpenContact(primaryContactId)}>
            Edit contact record
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">
          Personal details come from the fact find. Update them in the fact find or the contact record.
        </p>
      </SectionCard>

      <SectionCard
        icon={Users}
        title="Applicants"
        tone="neutral"
        subtitle={applicants.length ? `${applicants.length} on file` : 'No applicants added yet'}
        rightSlot={
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addApplicant}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        }
      >
        {applicants.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No applicants recorded. Add each borrower or guarantor so documents can be requested per person.
          </p>
        ) : (
          <div className="space-y-3">
            {applicants.map(a => {
              const d = { ...a, ...draft[a.id] };
              const dirty = !!draft[a.id];
              return (
                <div key={a.id} className="rounded-lg border bg-background p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Name</Label>
                      <Input className="h-9" value={d.name ?? ''} onChange={e => patch(a.id, { name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Employment type</Label>
                      <Select value={d.employment_type ?? ''} onValueChange={v => patch(a.id, { employment_type: v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {EMPLOYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Email</Label>
                      <Input className="h-9" value={d.email ?? ''} onChange={e => patch(a.id, { email: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Phone</Label>
                      <Input className="h-9" value={d.phone ?? ''} onChange={e => patch(a.id, { phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => removeApplicant(a.id)}>
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                    <Button size="sm" disabled={!dirty} onClick={() => save(d as Applicant)}>Save</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </>
  );
}
