import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/lead/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useApplicants } from './useFactFind';

interface Consent {
  id: string;
  applicant_id: string | null;
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  captured_via: string | null;
  evidence: string | null;
}

export const CONSENT_TYPES: { key: string; label: string; help: string }[] = [
  { key: 'privacy', label: 'Privacy consent', help: 'Consent to collect, use and disclose personal information.' },
  { key: 'credit_guide', label: 'Credit guide issued', help: 'Credit guide provided to the client.' },
  { key: 'credit_check', label: 'Credit check authority', help: 'Authority to obtain a credit report.' },
  { key: 'declaration', label: 'Declaration signed', help: 'Client declared the information is true and complete.' },
  { key: 'electronic_comms', label: 'Electronic communications', help: 'Consent to receive documents electronically.' },
];

const CAPTURE_METHODS = [
  { value: 'client_portal', label: 'Client portal' },
  { value: 'fact_find', label: 'Fact find form' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In person / signed' },
  { value: 'verbal', label: 'Verbal' },
];

interface Props {
  leadId: string;
  isPreviewMode: boolean;
}

export function ConsentTab({ leadId, isPreviewMode }: Props) {
  const [rows, setRows] = useState<Consent[]>([]);
  const { applicants } = useApplicants(leadId, isPreviewMode);
  const [applicantFilter, setApplicantFilter] = useState<string>('all');

  const refresh = async () => {
    if (isPreviewMode) { setRows([]); return; }
    const { data } = await supabase
      .from('lead_consents' as any)
      .select('id, applicant_id, consent_type, granted, granted_at, captured_via, evidence')
      .eq('lead_id', leadId);
    setRows(((data as any[]) || []) as Consent[]);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [leadId, isPreviewMode]);

  const findRow = (type: string) =>
    rows.find(r => r.consent_type === type && (applicantFilter === 'all' ? !r.applicant_id : r.applicant_id === applicantFilter));

  const upsert = async (type: string, changes: Partial<Consent>) => {
    if (isPreviewMode) { toast.info('Preview mode — not saved'); return; }
    const existing = findRow(type);
    if (existing) {
      const { error } = await supabase.from('lead_consents' as any).update(changes as any).eq('id', existing.id);
      if (error) { toast.error('Failed to update consent'); return; }
    } else {
      const { error } = await supabase.from('lead_consents' as any).insert({
        lead_id: leadId,
        applicant_id: applicantFilter === 'all' ? null : applicantFilter,
        consent_type: type,
        ...changes,
      } as any);
      if (error) { toast.error('Failed to record consent'); return; }
    }
    refresh();
  };

  const grantedCount = CONSENT_TYPES.filter(t => findRow(t.key)?.granted).length;

  return (
    <SectionCard
      icon={ShieldCheck}
      title="Privacy & consents"
      tone={grantedCount === CONSENT_TYPES.length ? 'success' : grantedCount > 0 ? 'ok' : 'neutral'}
      subtitle={`${grantedCount} of ${CONSENT_TYPES.length} recorded`}
      rightSlot={
        applicants.length > 0 ? (
          <Select value={applicantFilter} onValueChange={setApplicantFilter}>
            <SelectTrigger className="h-7 w-[170px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Whole application</SelectItem>
              {applicants.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : undefined
      }
    >
      <div className="space-y-2">
        {CONSENT_TYPES.map(t => {
          const row = findRow(t.key);
          return (
            <div key={t.key} className="rounded-lg border bg-background p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.help}</p>
                </div>
                <Switch
                  checked={!!row?.granted}
                  onCheckedChange={(checked) =>
                    upsert(t.key, {
                      granted: checked,
                      granted_at: checked ? new Date().toISOString() : null,
                    })
                  }
                />
              </div>
              {row?.granted && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Captured via</Label>
                    <Select value={row.captured_via ?? ''} onValueChange={v => upsert(t.key, { captured_via: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {CAPTURE_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      className="h-9"
                      value={row.granted_at ? format(new Date(row.granted_at), 'yyyy-MM-dd') : ''}
                      onChange={e => upsert(t.key, { granted_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Evidence / reference</Label>
                    <Input
                      className="h-9"
                      defaultValue={row.evidence ?? ''}
                      placeholder="e.g. signed PDF, portal timestamp"
                      onBlur={e => {
                        if (e.target.value !== (row.evidence ?? '')) upsert(t.key, { evidence: e.target.value || null });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Keep this current — it is the record you rely on in a compliance audit.
      </p>
    </SectionCard>
  );
}
