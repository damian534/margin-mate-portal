import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/lead/SectionCard';
import { Label } from '@/components/ui/label';
import { Briefcase, BadgeCheck } from 'lucide-react';
import { useFactFind } from './useFactFind';

const EMPLOYMENT_FIELDS = [
  { key: 'employment_status', label: 'Employment status' },
  { key: 'employer_name', label: 'Employer / business' },
  { key: 'job_title', label: 'Job title' },
  { key: 'industry', label: 'Industry' },
  { key: 'years_in_role', label: 'Years in role' },
  { key: 'years_in_industry', label: 'Years in industry' },
  { key: 'probation', label: 'On probation' },
  { key: 'previous_employer', label: 'Previous employer' },
  { key: 'previous_role_duration', label: 'Time at previous employer' },
  { key: 'abn', label: 'ABN' },
  { key: 'gst_registered', label: 'GST registered' },
];

const INCOME_FIELDS = [
  { key: 'base_salary', label: 'Base salary (gross p.a.)', money: true },
  { key: 'overtime', label: 'Overtime (p.a.)', money: true },
  { key: 'bonuses', label: 'Bonuses (p.a.)', money: true },
  { key: 'commission_income', label: 'Commission (p.a.)', money: true },
  { key: 'rental_income', label: 'Rental income (monthly)', money: true },
  { key: 'other_income', label: 'Other income (p.a.)', money: true },
  { key: 'other_income_source', label: 'Other income source' },
];

const ID_KEYWORDS = ['licence', 'license', 'passport', 'birth certificate', 'medicare', 'photo id', 'identification'];

interface DocRow { id: string; name: string; status: string; }

interface Props {
  leadId: string;
  isPreviewMode: boolean;
}

const money = (v: any) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && n !== 0 ? `$${n.toLocaleString()}` : '—';
};

export function EmploymentIdTab({ leadId, isPreviewMode }: Props) {
  const { factFind } = useFactFind(leadId, isPreviewMode);
  const [idDocs, setIdDocs] = useState<DocRow[]>([]);

  useEffect(() => {
    if (isPreviewMode) { setIdDocs([]); return; }
    let cancelled = false;
    supabase
      .from('document_requests')
      .select('id, name, status')
      .eq('lead_id', leadId)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = ((data as any[]) || []).filter(d =>
          ID_KEYWORDS.some(k => String(d.name || '').toLowerCase().includes(k)),
        );
        setIdDocs(rows as DocRow[]);
      });
    return () => { cancelled = true; };
  }, [leadId, isPreviewMode]);

  const employment = factFind['employment'] || {};
  const income = factFind['income'] || {};

  const hasEmployment = Object.values(employment).some(v => v !== '' && v != null);
  const hasIncome = Object.values(income).some(v => v !== '' && v != null);

  return (
    <>
      <SectionCard
        icon={Briefcase}
        title="Employment"
        tone="neutral"
        subtitle={hasEmployment ? (employment.employer_name || 'From fact find') : 'Not completed in fact find yet'}
      >
        {hasEmployment ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {EMPLOYMENT_FIELDS.map(f => (
              <div key={f.key}>
                <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
                <p className="font-medium">{employment[f.key] ? String(employment[f.key]) : '—'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-3 text-center">
            Send the client the fact find to capture employment details.
          </p>
        )}
      </SectionCard>

      <SectionCard
        icon={Briefcase}
        title="Income"
        tone={hasIncome ? 'ok' : 'neutral'}
        subtitle={hasIncome ? 'From fact find' : 'Not completed yet'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {INCOME_FIELDS.map(f => (
            <div key={f.key}>
              <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
              <p className="font-medium">{f.money ? money(income[f.key]) : (income[f.key] ? String(income[f.key]) : '—')}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={BadgeCheck}
        title="Identification"
        tone={idDocs.length && idDocs.every(d => d.status === 'approved') ? 'success' : 'neutral'}
        subtitle={idDocs.length ? `${idDocs.filter(d => d.status === 'approved').length} of ${idDocs.length} verified` : 'No ID documents requested'}
      >
        {idDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">
            Request ID documents from the Documents tab — they'll show here once added.
          </p>
        ) : (
          <div className="space-y-1.5">
            {idDocs.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                <span className="truncate">{d.name}</span>
                <span className={
                  d.status === 'approved' ? 'text-success text-xs font-semibold uppercase'
                  : d.status === 'rejected' ? 'text-destructive text-xs font-semibold uppercase'
                  : 'text-muted-foreground text-xs font-semibold uppercase'
                }>{d.status}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
