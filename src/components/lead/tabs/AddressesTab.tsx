import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/lead/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, Plus, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useApplicants, useFactFind } from './useFactFind';

interface Address {
  id: string;
  applicant_id: string | null;
  address: string;
  address_type: string;
  years_at_address: number | null;
  ownership_status: string | null;
  display_order: number;
}

const ADDRESS_TYPES = [
  { value: 'current', label: 'Current' },
  { value: 'previous', label: 'Previous' },
  { value: 'mailing', label: 'Mailing' },
  { value: 'security', label: 'Security / purchase' },
];

const OWNERSHIP = [
  { value: 'owner_occupied', label: 'Own — living in it' },
  { value: 'investment', label: 'Own — investment' },
  { value: 'renting', label: 'Renting' },
  { value: 'boarding', label: 'Boarding / with family' },
  { value: 'other', label: 'Other' },
];

interface Props {
  leadId: string;
  isPreviewMode: boolean;
}

export function AddressesTab({ leadId, isPreviewMode }: Props) {
  const [rows, setRows] = useState<Address[]>([]);
  const [draft, setDraft] = useState<Record<string, Partial<Address>>>({});
  const { applicants } = useApplicants(leadId, isPreviewMode);
  const { factFind } = useFactFind(leadId, isPreviewMode);

  const refresh = async () => {
    if (isPreviewMode) { setRows([]); return; }
    const { data } = await supabase
      .from('lead_addresses' as any)
      .select('id, applicant_id, address, address_type, years_at_address, ownership_status, display_order')
      .eq('lead_id', leadId)
      .order('display_order', { ascending: true });
    setRows(((data as any[]) || []) as Address[]);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [leadId, isPreviewMode]);

  const patch = (id: string, changes: Partial<Address>) =>
    setDraft(prev => ({ ...prev, [id]: { ...prev[id], ...changes } }));

  const save = async (row: Address) => {
    const changes = draft[row.id];
    if (!changes) return;
    if (isPreviewMode) { toast.info('Preview mode — not saved'); return; }
    const { error } = await supabase.from('lead_addresses' as any).update(changes as any).eq('id', row.id);
    if (error) { toast.error('Failed to save address'); return; }
    setDraft(prev => { const next = { ...prev }; delete next[row.id]; return next; });
    refresh();
    toast.success('Address saved');
  };

  const addRow = async (preset?: Partial<Address>) => {
    if (isPreviewMode) { toast.info('Preview mode — not saved'); return; }
    const { error } = await supabase.from('lead_addresses' as any).insert({
      lead_id: leadId,
      address: preset?.address ?? '',
      address_type: preset?.address_type ?? 'current',
      years_at_address: preset?.years_at_address ?? null,
      ownership_status: preset?.ownership_status ?? null,
      applicant_id: preset?.applicant_id ?? null,
      display_order: rows.length,
    } as any);
    if (error) { toast.error('Failed to add address'); return; }
    refresh();
  };

  const removeRow = async (id: string) => {
    if (isPreviewMode) return;
    const { error } = await supabase.from('lead_addresses' as any).delete().eq('id', id);
    if (error) { toast.error('Failed to remove address'); return; }
    refresh();
  };

  const personal = factFind['personal_details'] || {};
  const canImport = !!(personal.residential_address || personal.previous_address || personal.mailing_address);

  const importFromFactFind = async () => {
    if (isPreviewMode) { toast.info('Preview mode — not saved'); return; }
    const existing = new Set(rows.map(r => r.address.trim().toLowerCase()));
    const candidates: Partial<Address>[] = [
      personal.residential_address && {
        address: String(personal.residential_address),
        address_type: 'current',
        years_at_address: personal.years_at_address ? Number(personal.years_at_address) : null,
      },
      personal.previous_address && { address: String(personal.previous_address), address_type: 'previous' },
      personal.mailing_address && { address: String(personal.mailing_address), address_type: 'mailing' },
    ].filter(Boolean) as Partial<Address>[];

    const toInsert = candidates.filter(c => !existing.has(String(c.address).trim().toLowerCase()));
    if (toInsert.length === 0) { toast.info('Nothing new to import from the fact find'); return; }
    const { error } = await supabase.from('lead_addresses' as any).insert(
      toInsert.map((c, i) => ({ ...c, lead_id: leadId, display_order: rows.length + i })) as any,
    );
    if (error) { toast.error('Import failed'); return; }
    refresh();
    toast.success(`Imported ${toInsert.length} address${toInsert.length === 1 ? '' : 'es'}`);
  };

  return (
    <SectionCard
      icon={Home}
      title="Addresses"
      tone="neutral"
      subtitle={rows.length ? `${rows.length} on file` : 'No addresses recorded'}
      rightSlot={
        <div className="flex gap-1.5">
          {canImport && (
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={importFromFactFind}>
              <Download className="w-3 h-3" /> Import from fact find
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => addRow()}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Lenders need three years of address history per applicant. Add current and previous addresses here.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map(row => {
            const d = { ...row, ...draft[row.id] };
            const dirty = !!draft[row.id];
            return (
              <div key={row.id} className="rounded-lg border bg-background p-3 space-y-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Address</Label>
                  <Input className="h-9" value={d.address ?? ''} placeholder="Full address"
                    onChange={e => patch(row.id, { address: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Type</Label>
                    <Select value={d.address_type ?? 'current'} onValueChange={v => patch(row.id, { address_type: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ADDRESS_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Years there</Label>
                    <Input className="h-9" type="number" step="0.5" value={d.years_at_address ?? ''}
                      onChange={e => patch(row.id, { years_at_address: e.target.value ? Number(e.target.value) : null })} />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Status</Label>
                    <Select value={d.ownership_status ?? ''} onValueChange={v => patch(row.id, { ownership_status: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {OWNERSHIP.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Applicant</Label>
                    <Select value={d.applicant_id ?? 'all'} onValueChange={v => patch(row.id, { applicant_id: v === 'all' ? null : v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All applicants</SelectItem>
                        {applicants.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => removeRow(row.id)}>
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                  <Button size="sm" disabled={!dirty} onClick={() => save(d as Address)}>Save</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
