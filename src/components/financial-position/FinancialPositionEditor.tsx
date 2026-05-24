import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { computeFactFindAggregates, fmtCurrency } from '@/lib/factFindAggregates';
import { MortgageWizardField } from '@/components/mortgage-factfind/MortgageWizardField';
import { WizardField } from '@/components/mortgage-factfind/types';
import { UnderlineTabs } from './UnderlineTabs';
import { FinancialGroupCard } from './FinancialGroupCard';
import { Button } from '@/components/ui/button';
import { Wallet, Coins, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type TabKey = 'employment' | 'assets' | 'liabilities' | 'income';
type AllData = Record<string, Record<string, any>>;

interface Props {
  leadId: string;
  /** Client-portal token: when present, save via edge function instead of direct supabase write */
  token?: string;
  isPreviewMode?: boolean;
  readOnly?: boolean;
  onChange?: () => void;
}

const num = (v: any) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : 0;
};

export function FinancialPositionEditor({ leadId, token, isPreviewMode, readOnly, onChange }: Props) {
  const [tab, setTab] = useState<TabKey>('employment');
  const [data, setData] = useState<AllData>({});
  const [loaded, setLoaded] = useState(false);
  const saveTimers = useRef<Record<string, any>>({});

  // ── Load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isPreviewMode) { setLoaded(true); return; }
      try {
        if (token) {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-portal?token=${encodeURIComponent(token)}`
          );
          if (res.ok) {
            const json = await res.json();
            const map: AllData = {};
            json.fact_find?.forEach((r: any) => { map[r.section] = r.data ?? {}; });
            if (!cancelled) setData(map);
          }
        } else {
          const { data: rows } = await supabase
            .from('fact_find_responses')
            .select('section, data')
            .eq('lead_id', leadId);
          const map: AllData = {};
          (rows as any[])?.forEach(r => { map[r.section] = r.data ?? {}; });
          if (!cancelled) setData(map);
        }
      } catch (e) {
        console.error('Failed to load fact find', e);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [leadId, token, isPreviewMode]);

  // ── Persist a single section (debounced)
  const persistSection = useCallback((sectionKey: string, sectionData: Record<string, any>) => {
    if (readOnly || isPreviewMode) return;
    if (saveTimers.current[sectionKey]) clearTimeout(saveTimers.current[sectionKey]);
    saveTimers.current[sectionKey] = setTimeout(async () => {
      try {
        if (token) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-portal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action: 'save_fact_find', section: sectionKey, data: sectionData, completed: false }),
          });
        } else {
          const { error } = await supabase.from('fact_find_responses').upsert(
            { lead_id: leadId, section: sectionKey, data: sectionData as any, completed: false, updated_by: 'broker' },
            { onConflict: 'lead_id,section' }
          );
          if (error) toast.error('Failed to save');
        }
        onChange?.();
      } catch {
        toast.error('Save error');
      }
    }, 600);
  }, [leadId, token, readOnly, isPreviewMode, onChange]);

  /** Update a single field in a section. */
  const updateField = useCallback((sectionKey: string, fieldKey: string, value: any) => {
    setData(prev => {
      const next = { ...prev, [sectionKey]: { ...(prev[sectionKey] ?? {}), [fieldKey]: value } };
      persistSection(sectionKey, next[sectionKey]);
      return next;
    });
  }, [persistSection]);

  /** Replace entire section data (used when seeding a new numbered section). */
  const replaceSection = useCallback((sectionKey: string, sectionData: Record<string, any>) => {
    setData(prev => {
      const next = { ...prev, [sectionKey]: sectionData };
      persistSection(sectionKey, sectionData);
      return next;
    });
  }, [persistSection]);

  /** Update a repeatable list inside a section (e.g. credit_cards). */
  const updateList = useCallback((sectionKey: string, listKey: string, items: any[], extra?: Record<string, any>) => {
    setData(prev => {
      const section = { ...(prev[sectionKey] ?? {}), ...(extra ?? {}), [listKey]: items };
      const next = { ...prev, [sectionKey]: section };
      persistSection(sectionKey, section);
      return next;
    });
  }, [persistSection]);

  const aggregates = useMemo(() => computeFactFindAggregates(data), [data]);

  if (!loaded) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const ctx = { data, updateField, replaceSection, updateList, readOnly: !!readOnly };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-primary/40 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-primary">Financials</h2>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="font-semibold text-primary">{fmtCurrency(aggregates.netPosition)}</span>
          <span className="text-muted-foreground">Net Worth</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-semibold text-primary">{fmtCurrency(aggregates.totalIncome)}</span>
          <span className="text-muted-foreground">Total Income</span>
        </div>
      </div>

      {/* Tabs */}
      <UnderlineTabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'employment', label: 'Employment' },
          { value: 'assets', label: 'Assets' },
          { value: 'liabilities', label: 'Liabilities' },
          { value: 'income', label: 'Income' },
        ]}
      />

      <div className="space-y-3">
        {tab === 'employment' && <EmploymentTab ctx={ctx} />}
        {tab === 'assets' && <AssetsTab ctx={ctx} />}
        {tab === 'liabilities' && <LiabilitiesTab ctx={ctx} />}
        {tab === 'income' && <IncomeTab ctx={ctx} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

interface Ctx {
  data: AllData;
  updateField: (sectionKey: string, fieldKey: string, value: any) => void;
  replaceSection: (sectionKey: string, sectionData: Record<string, any>) => void;
  updateList: (sectionKey: string, listKey: string, items: any[], extra?: Record<string, any>) => void;
  readOnly: boolean;
}

/** Render a list of WizardField configs as a half-grid editable form. */
function FieldGrid({ fields, sectionKey, ctx }: { fields: WizardField[]; sectionKey: string; ctx: Ctx }) {
  const sectionData = ctx.data[sectionKey] ?? {};
  const handle = (key: string, value: any) => ctx.updateField(sectionKey, key, value);

  // Group consecutive half:true into rows
  const rows: WizardField[][] = [];
  let buffer: WizardField[] = [];
  for (const f of fields) {
    if (f.condition && !f.condition(sectionData)) continue;
    if (f.half) {
      buffer.push(f);
      if (buffer.length === 2) { rows.push(buffer); buffer = []; }
    } else {
      if (buffer.length) { rows.push(buffer); buffer = []; }
      rows.push([f]);
    }
  }
  if (buffer.length) rows.push(buffer);

  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={i} className={row.length === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
          {row.map(f => (
            <MortgageWizardField
              key={f.key}
              field={f}
              value={sectionData[f.key]}
              onChange={handle}
              data={sectionData}
              readOnly={ctx.readOnly}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── EMPLOYMENT TAB ────────────────────────────────────────────────────── */

const EMPLOYMENT_FIELDS: WizardField[] = [
  { key: 'employment_type', label: 'Employment Type', type: 'select', options: [
    { value: 'payg_full_time', label: 'PAYG – Full Time' },
    { value: 'payg_part_time', label: 'PAYG – Part Time' },
    { value: 'payg_casual', label: 'PAYG – Casual' },
    { value: 'self_employed', label: 'Self Employed' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'retired', label: 'Retired' },
    { value: 'home_duties', label: 'Home Duties' },
    { value: 'not_employed', label: 'Not Employed' },
  ]},
  { key: 'employer_name', label: 'Employer Name', type: 'text' },
  { key: 'job_title', label: 'Job Title', type: 'text', half: true },
  { key: 'industry', label: 'Industry', type: 'text', half: true },
  { key: 'start_date', label: 'Start Date', type: 'date', half: true },
  { key: 'on_probation', label: 'On Probation?', type: 'select', half: true, options: [
    { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }
  ]},
  { key: 'business_name', label: 'Business Name', type: 'text', condition: d => d.employment_type === 'self_employed' },
  { key: 'abn', label: 'ABN', type: 'text', half: true, condition: d => d.employment_type === 'self_employed' },
  { key: 'years_trading', label: 'Years Trading', type: 'number', half: true, condition: d => d.employment_type === 'self_employed' },
];

function EmploymentTab({ ctx }: { ctx: Ctx }) {
  const hasSecond = ctx.data.mff_welcome?.has_second_applicant === 'yes';
  return (
    <>
      <FinancialGroupCard label="Primary applicant" defaultOpen onAdd={null}>
        <FieldGrid fields={EMPLOYMENT_FIELDS} sectionKey="mff_primary_employment" ctx={ctx} />
      </FinancialGroupCard>
      <FinancialGroupCard
        label="Second applicant"
        defaultOpen={hasSecond}
        onAdd={hasSecond || ctx.readOnly ? null : () => ctx.updateField('mff_welcome', 'has_second_applicant', 'yes')}
        addLabel="Add second applicant"
      >
        {hasSecond ? (
          <FieldGrid fields={EMPLOYMENT_FIELDS} sectionKey="mff_second_employment" ctx={ctx} />
        ) : (
          <p className="text-sm text-muted-foreground">No second applicant on this loan.</p>
        )}
      </FinancialGroupCard>
    </>
  );
}

/* ─── ASSETS TAB ────────────────────────────────────────────────────────── */

const HOME_FIELDS: WizardField[] = [
  { key: 'home_address', label: 'Property Address', type: 'text' },
  { key: 'home_value', label: 'Estimated Value', type: 'currency', half: true },
  { key: 'home_purchase_price', label: 'Purchase Price', type: 'currency', half: true },
];

const IP_FIELDS: WizardField[] = [
  { key: 'address', label: 'Property Address', type: 'text' },
  { key: 'estimated_value', label: 'Estimated Value', type: 'currency', half: true },
  { key: 'rental_income', label: 'Rental (gross monthly)', type: 'currency', half: true },
];

const SAVINGS_FIELDS: WizardField[] = [
  { key: 'institution', label: 'Institution', type: 'text', half: true },
  { key: 'account_type', label: 'Account Type', type: 'select', half: true, options: [
    { value: 'savings', label: 'Savings' },
    { value: 'term_deposit', label: 'Term Deposit' },
    { value: 'everyday', label: 'Everyday' },
    { value: 'offset', label: 'Offset' },
    { value: 'other', label: 'Other' },
  ]},
  { key: 'balance', label: 'Balance', type: 'currency' },
];

const VEHICLE_FIELDS: WizardField[] = [
  { key: 'make_model', label: 'Make / Model / Year', type: 'text' },
  { key: 'value', label: 'Estimated Value', type: 'currency', half: true },
  { key: 'owned_financed', label: 'Owned or Financed', type: 'select', half: true, options: [
    { value: 'owned', label: 'Owned' },
    { value: 'financed', label: 'Financed' },
    { value: 'lease', label: 'Lease' },
    { value: 'novated', label: 'Novated Lease' },
  ]},
];

const OTHER_ASSETS_FIELDS: WizardField[] = [
  { key: 'home_contents', label: 'Home Contents', type: 'currency', half: true },
  { key: 'superannuation', label: 'Superannuation', type: 'currency', half: true },
  { key: 'shares_investments', label: 'Shares / Managed Funds', type: 'currency', half: true },
  { key: 'crypto', label: 'Cryptocurrency', type: 'currency', half: true },
  { key: 'other_assets_value', label: 'Other Assets Value', type: 'currency', half: true },
  { key: 'other_assets_description', label: 'Description', type: 'text' },
];

/** Find the next available numbered section index (1..max). */
function nextNumberedIndex(data: AllData, prefix: string, predicate: (d: any) => boolean, max: number) {
  for (let i = 1; i <= max; i++) {
    const sec = data[`${prefix}${i}`];
    if (!sec || !predicate(sec)) return i;
  }
  return -1;
}

function NumberedItemRow({
  title, sectionKey, fields, ctx, onRemove,
}: { title: string; sectionKey: string; fields: WizardField[]; ctx: Ctx; onRemove?: () => void }) {
  return (
    <div className="rounded-md border border-border/60 p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {onRemove && !ctx.readOnly && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <FieldGrid fields={fields} sectionKey={sectionKey} ctx={ctx} />
    </div>
  );
}

function AssetsTab({ ctx }: { ctx: Ctx }) {
  const home = ctx.data.mff_re_home ?? {};
  const homeValue = num(home.home_value);

  // IPs
  const ipSections: { i: number; key: string; data: any }[] = [];
  for (let i = 1; i <= 9; i++) {
    const k = `mff_ip_${i}`;
    if (ctx.data[k]) ipSections.push({ i, key: k, data: ctx.data[k] });
  }
  const ipTotal = ipSections.reduce((s, x) => s + num(x.data.estimated_value), 0);

  const addIP = () => {
    const idx = nextNumberedIndex(ctx.data, 'mff_ip_', () => false, 9);
    if (idx < 0) { toast.info('Maximum 9 investment properties'); return; }
    if (idx === 1) ctx.updateField('mff_re_home', 'has_investment_properties', 'yes');
    else ctx.updateField(`mff_ip_${idx - 1}`, 'has_another_property', 'yes');
    ctx.replaceSection(`mff_ip_${idx}`, {});
  };

  return (
    <>
      <FinancialGroupCard label="Owner-occupied home" total={homeValue} onAdd={null} defaultOpen={!!home.home_address}>
        <FieldGrid fields={HOME_FIELDS} sectionKey="mff_re_home" ctx={ctx} />
      </FinancialGroupCard>

      <FinancialGroupCard
        label="Investment properties"
        total={ipTotal}
        onAdd={ctx.readOnly ? null : addIP}
        addLabel="Add investment property"
      >
        {ipSections.length === 0 && <p className="text-sm text-muted-foreground">No investment properties yet.</p>}
        {ipSections.map(s => (
          <NumberedItemRow
            key={s.key}
            title={s.data.address || `Investment Property ${s.i}`}
            sectionKey={s.key}
            fields={IP_FIELDS}
            ctx={ctx}
          />
        ))}
      </FinancialGroupCard>
    </>
  );
}

/* ─── LIABILITIES TAB ───────────────────────────────────────────────────── */

const HOME_LOAN_FIELDS: WizardField[] = [
  { key: 'home_lender', label: 'Lender', type: 'text', half: true },
  { key: 'home_loan_balance', label: 'Loan Balance', type: 'currency', half: true },
  { key: 'home_loan_limit', label: 'Loan Limit', type: 'currency', half: true },
  { key: 'home_loan_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
];

const IP_LOAN_FIELDS: WizardField[] = [
  { key: 'lender', label: 'Lender', type: 'text', half: true },
  { key: 'loan_balance', label: 'Loan Balance', type: 'currency', half: true },
  { key: 'monthly_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
];

const VEHICLE_LOAN_FIELDS: WizardField[] = [
  { key: 'finance_lender', label: 'Finance Provider', type: 'text', half: true },
  { key: 'finance_balance', label: 'Balance', type: 'currency', half: true },
  { key: 'finance_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
];

const PERSONAL_LOAN_ITEM: WizardField[] = [
  { key: 'lender', label: 'Lender', type: 'text', half: true },
  { key: 'purpose', label: 'Purpose', type: 'text', half: true },
  { key: 'balance', label: 'Balance', type: 'currency', half: true },
  { key: 'monthly_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
];

const CARD_ITEM: WizardField[] = [
  { key: 'provider', label: 'Provider', type: 'text', half: true },
  { key: 'limit', label: 'Limit', type: 'currency', half: true },
  { key: 'balance', label: 'Balance', type: 'currency', half: true },
];

const OTHER_LOAN_ITEM: WizardField[] = [
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'provider', label: 'Provider', type: 'text', half: true },
  { key: 'balance', label: 'Balance', type: 'currency', half: true },
  { key: 'monthly_repayment', label: 'Monthly Repayment', type: 'currency', half: true },
];

const HECS_FIELDS: WizardField[] = [
  { key: 'has_hecs', label: 'Primary applicant HECS/HELP?', type: 'select', half: true, options: [
    { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }
  ]},
  { key: 'hecs_balance', label: 'HECS Balance', type: 'currency', half: true, condition: d => d.has_hecs === 'yes' },
  { key: 'has_tax_debt', label: 'Has tax debt?', type: 'select', half: true, options: [
    { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }
  ]},
  { key: 'tax_debt_amount', label: 'Tax Debt Amount', type: 'currency', half: true, condition: d => d.has_tax_debt === 'yes' },
];

/** Editable list of repeatable items inside a single section. */
function RepeatableList({
  sectionKey, listKey, items, fields, ctx, itemTitle, onSeed,
}: {
  sectionKey: string;
  listKey: string;
  items: any[];
  fields: WizardField[];
  ctx: Ctx;
  itemTitle: (item: any, i: number) => string;
  onSeed?: () => Record<string, any>;
}) {
  const setItem = (i: number, key: string, value: any) => {
    const next = items.map((it, idx) => idx === i ? { ...it, [key]: value } : it);
    ctx.updateList(sectionKey, listKey, next, onSeed?.());
  };
  const remove = (i: number) => {
    const next = items.filter((_, idx) => idx !== i);
    ctx.updateList(sectionKey, listKey, next);
  };
  return (
    <>
      {items.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
      {items.map((item, i) => {
        // Render fields against this item via a tiny adapter ctx
        return (
          <div key={i} className="rounded-md border border-border/60 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">{itemTitle(item, i)}</h4>
              {!ctx.readOnly && (
                <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <ItemFieldGrid fields={fields} item={item} onChange={(k, v) => setItem(i, k, v)} readOnly={ctx.readOnly} />
          </div>
        );
      })}
    </>
  );
}

function ItemFieldGrid({ fields, item, onChange, readOnly }: { fields: WizardField[]; item: any; onChange: (k: string, v: any) => void; readOnly: boolean }) {
  const rows: WizardField[][] = [];
  let buf: WizardField[] = [];
  for (const f of fields) {
    if (f.condition && !f.condition(item)) continue;
    if (f.half) { buf.push(f); if (buf.length === 2) { rows.push(buf); buf = []; } }
    else { if (buf.length) { rows.push(buf); buf = []; } rows.push([f]); }
  }
  if (buf.length) rows.push(buf);
  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={i} className={row.length === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
          {row.map(f => (
            <MortgageWizardField key={f.key} field={f} value={item[f.key]} onChange={onChange} data={item} readOnly={readOnly} />
          ))}
        </div>
      ))}
    </div>
  );
}

function LiabilitiesTab({ ctx }: { ctx: Ctx }) {
  const home = ctx.data.mff_re_home ?? {};
  const homeLoan = num(home.home_loan_balance);

  const ipSections: { i: number; key: string; data: any }[] = [];
  for (let i = 1; i <= 9; i++) {
    const k = `mff_ip_${i}`;
    if (ctx.data[k]) ipSections.push({ i, key: k, data: ctx.data[k] });
  }
  const ipLoanTotal = ipSections.reduce((s, x) => s + num(x.data.loan_balance), 0);

  const personal = (ctx.data.mff_liab_personal?.personal_loans ?? []) as any[];
  const personalTotal = personal.reduce((s, x) => s + num(x.balance), 0);

  const cards = (ctx.data.mff_liab_cards?.credit_cards ?? []) as any[];
  const cardsTotal = cards.reduce((s, x) => s + num(x.balance), 0);

  const otherLoans = (ctx.data.mff_liab_other?.other_loans ?? []) as any[];
  const bnpl = (ctx.data.mff_liab_other?.bnpl_accounts ?? []) as any[];
  const otherTotal = otherLoans.reduce((s, x) => s + num(x.balance), 0)
    + bnpl.reduce((s, x) => s + num(x.balance), 0);

  const hecs = ctx.data.mff_liab_hecs ?? {};
  const hecsTotal =
    (hecs.has_hecs === 'yes' ? num(hecs.hecs_balance) : 0) +
    (hecs.has_tax_debt === 'yes' ? num(hecs.tax_debt_amount) : 0);

  return (
    <>
      <FinancialGroupCard label="Home loan" total={homeLoan} onAdd={null}>
        <FieldGrid fields={HOME_LOAN_FIELDS} sectionKey="mff_re_home" ctx={ctx} />
      </FinancialGroupCard>

      <FinancialGroupCard label="Investment property loans" total={ipLoanTotal} onAdd={null}>
        {ipSections.length === 0 && <p className="text-sm text-muted-foreground">Add investment properties on the Assets tab to record their loans here.</p>}
        {ipSections.map(s => (
          <NumberedItemRow
            key={s.key}
            title={s.data.address || `Investment Property ${s.i}`}
            sectionKey={s.key}
            fields={IP_LOAN_FIELDS}
            ctx={ctx}
          />
        ))}
      </FinancialGroupCard>

      <FinancialGroupCard
        label="Personal loans"
        total={personalTotal}
        onAdd={ctx.readOnly ? null : () =>
          ctx.updateList('mff_liab_personal', 'personal_loans', [...personal, {}], { has_personal_loans: 'yes' })
        }
        addLabel="Add personal loan"
      >
        <RepeatableList
          sectionKey="mff_liab_personal"
          listKey="personal_loans"
          items={personal}
          fields={PERSONAL_LOAN_ITEM}
          ctx={ctx}
          itemTitle={(it, i) => it.lender || `Personal Loan ${i + 1}`}
        />
      </FinancialGroupCard>

      <FinancialGroupCard
        label="Credit & store cards"
        total={cardsTotal}
        onAdd={ctx.readOnly ? null : () =>
          ctx.updateList('mff_liab_cards', 'credit_cards', [...cards, {}], { has_credit_cards: 'yes' })
        }
        addLabel="Add card"
      >
        <RepeatableList
          sectionKey="mff_liab_cards"
          listKey="credit_cards"
          items={cards}
          fields={CARD_ITEM}
          ctx={ctx}
          itemTitle={(it, i) => it.provider || `Card ${i + 1}`}
        />
      </FinancialGroupCard>

      <FinancialGroupCard
        label="Other loans & BNPL"
        total={otherTotal}
        onAdd={ctx.readOnly ? null : () =>
          ctx.updateList('mff_liab_other', 'other_loans', [...otherLoans, {}], { has_other_loans: 'yes' })
        }
        addLabel="Add other loan"
      >
        <RepeatableList
          sectionKey="mff_liab_other"
          listKey="other_loans"
          items={otherLoans}
          fields={OTHER_LOAN_ITEM}
          ctx={ctx}
          itemTitle={(it, i) => it.description || it.provider || `Other Loan ${i + 1}`}
        />
      </FinancialGroupCard>

      <FinancialGroupCard label="HECS / HELP & tax" total={hecsTotal} onAdd={null}>
        <FieldGrid fields={HECS_FIELDS} sectionKey="mff_liab_hecs" ctx={ctx} />
      </FinancialGroupCard>
    </>
  );
}

/* ─── INCOME TAB ────────────────────────────────────────────────────────── */

const INCOME_FIELDS: WizardField[] = [
  { key: 'base_salary', label: 'Base Salary (annual)', type: 'currency', half: true },
  { key: 'overtime', label: 'Overtime (annual)', type: 'currency', half: true },
  { key: 'bonuses', label: 'Bonuses (annual)', type: 'currency', half: true },
  { key: 'commission', label: 'Commission (annual)', type: 'currency', half: true },
  { key: 'allowances', label: 'Allowances (annual)', type: 'currency', half: true },
  { key: 'government_benefits', label: 'Government Benefits (annual)', type: 'currency', half: true },
  { key: 'investment_income', label: 'Investment Income (annual)', type: 'currency', half: true },
  { key: 'other_income', label: 'Other Income (annual)', type: 'currency', half: true },
  { key: 'business_net_profit', label: 'Business Net Profit', type: 'currency', half: true },
  { key: 'directors_salary', label: 'Director\'s Salary', type: 'currency', half: true },
];

function applicantIncome(s: any) {
  if (!s) return 0;
  return num(s.base_salary) + num(s.overtime) + num(s.bonuses) + num(s.commission)
    + num(s.allowances) + num(s.government_benefits) + num(s.child_support_income)
    + num(s.investment_income) + num(s.other_income) + num(s.business_net_profit) + num(s.directors_salary);
}

function IncomeTab({ ctx }: { ctx: Ctx }) {
  const hasSecond = ctx.data.mff_welcome?.has_second_applicant === 'yes';
  const primary = applicantIncome(ctx.data.mff_primary_employment);
  const second = applicantIncome(ctx.data.mff_second_employment);

  // Rental income from primary + second + IPs (monthly → annual)
  let rentalMonthly = num(ctx.data.mff_primary_employment?.rental_income)
    + num(ctx.data.mff_second_employment?.rental_income);
  for (let i = 1; i <= 9; i++) rentalMonthly += num(ctx.data[`mff_ip_${i}`]?.rental_income);
  const rentalAnnual = rentalMonthly * 12;

  return (
    <>
      <FinancialGroupCard label="Primary applicant income" total={primary} totalSuffix="annual" defaultOpen onAdd={null}>
        <FieldGrid fields={INCOME_FIELDS} sectionKey="mff_primary_employment" ctx={ctx} />
      </FinancialGroupCard>

      {hasSecond && (
        <FinancialGroupCard label="Second applicant income" total={second} totalSuffix="annual" onAdd={null}>
          <FieldGrid fields={INCOME_FIELDS} sectionKey="mff_second_employment" ctx={ctx} />
        </FinancialGroupCard>
      )}

      <FinancialGroupCard label="Rental income (from properties)" total={rentalAnnual} totalSuffix="annual" onAdd={null}>
        <p className="text-sm text-muted-foreground">
          Rental income is auto-calculated from properties on the Assets tab and applicant rental fields above.
        </p>
      </FinancialGroupCard>
    </>
  );
}
