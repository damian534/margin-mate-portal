import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Building2, Info, Plus, Trash2, Users, Wand2 } from 'lucide-react';
import { fyLabel, formatMoney } from '@/lib/entityMap/servicing';
import { ENTITY_TYPE_LABELS, type EntityType, type LeadEntity } from '@/lib/entityMap/types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadId: string;
  financialYear: number;
  isPreviewMode?: boolean;
  existingEntities: LeadEntity[];
  onCompleted: () => void;
}

type StructureKind = 'trust' | 'company' | 'sole_trader' | 'partnership';

interface PersonRow {
  key: string;
  name: string;
  isApplicant: boolean;
  amount: number;
  /** Existing entity on the map that receives this share (null = create a new one). */
  existingId: string | null;
  /** Entity type to create when existingId is null. */
  entityType: EntityType;
}

const uid = () => Math.random().toString(36).slice(2);
const blankPerson = (): PersonRow => ({
  key: uid(), name: '', isApplicant: true, amount: 0, existingId: null, entityType: 'individual',
});


const STRUCTURE_OPTIONS: { value: StructureKind; label: string; blurb: string }[] = [
  { value: 'trust', label: 'Trust', blurb: 'Family/discretionary trust, unit trust or SMSF. Most common for self-employed clients.' },
  { value: 'company', label: 'Company only', blurb: 'A Pty Ltd that pays the client wages and/or dividends.' },
  { value: 'sole_trader', label: 'Sole trader', blurb: 'The client trades in their own name — income lands on them directly.' },
  { value: 'partnership', label: 'Partnership', blurb: 'Two or more people share the net profit of the business.' },
];

const TRUST_TYPES: { value: EntityType; label: string; blurb: string }[] = [
  { value: 'discretionary_trust', label: 'Discretionary (family) trust', blurb: 'The trustee decides each year who gets what — distributions vary.' },
  { value: 'unit_trust', label: 'Unit trust', blurb: 'Income is split by fixed unit holdings.' },
  { value: 'smsf', label: 'SMSF', blurb: 'Super fund — income generally is NOT usable for servicing.' },
];

const money = (v: string) => Number(v.replace(/[^0-9.]/g, '')) || 0;
const fmtInput = (v: number) => (v ? v.toLocaleString() : '');

export function StructureWizard({
  open, onOpenChange, leadId, financialYear, isPreviewMode, existingEntities, onCompleted,
}: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [kind, setKind] = useState<StructureKind>('trust');
  const [trustName, setTrustName] = useState('');
  const [trustType, setTrustType] = useState<EntityType>('discretionary_trust');
  const [trusteeKind, setTrusteeKind] = useState<'corporate' | 'individual'>('corporate');
  const [trusteeName, setTrusteeName] = useState('');
  const [directors, setDirectors] = useState<PersonRow[]>([blankPerson()]);
  const [beneficiaries, setBeneficiaries] = useState<PersonRow[]>([blankPerson()]);
  const [hasTradingCo, setHasTradingCo] = useState(false);
  const [tradingName, setTradingName] = useState('');
  const [tradingProfit, setTradingProfit] = useState(0);
  const [entityProfit, setEntityProfit] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setKind('trust');
    setTrustName('');
    setTrustType('discretionary_trust');
    setTrusteeKind('corporate');
    setTrusteeName('');
    setDirectors([blankPerson()]);
    setBeneficiaries([blankPerson()]);
    setHasTradingCo(false);
    setTradingName('');
    setTradingProfit(0);
    setEntityProfit(0);
  }, [open]);

  const isTrust = kind === 'trust';
  const mainLabel = isTrust
    ? 'trust'
    : kind === 'company' ? 'company'
    : kind === 'partnership' ? 'partnership' : 'business';

  // Step keys drive the flow; labels are display-only
  const steps = useMemo<string[]>(
    () => (isTrust
      ? ['structure', 'main', 'trustee', 'people', 'amounts', 'income', 'review']
      : ['structure', 'main', 'people', 'amounts', 'income', 'review']),
    [isTrust],
  );

  const peopleLabel = isTrust ? 'Beneficiaries' : kind === 'partnership' ? 'Partners' : 'People paid by the business';

  const STEP_LABELS: Record<string, string> = {
    structure: 'Structure',
    main: isTrust ? 'The trust' : `The ${mainLabel}`,
    trustee: 'Trustee',
    people: isTrust ? 'Beneficiaries' : peopleLabel,
    amounts: isTrust ? 'Distributions' : 'Amounts paid',
    income: 'Where income comes from',
    review: 'Review',
  };

  const stepKey = steps[step];

  const canNext = () => {
    switch (stepKey) {
      case 'main': return trustName.trim().length > 1;
      case 'trustee': return trusteeName.trim().length > 1 && directors.some(d => d.name.trim());
      case 'people': return beneficiaries.some(b => b.existingId || b.name.trim());
      default: return true;
    }
  };

  const rowIsFilled = (b: PersonRow) => !!(b.existingId || b.name.trim());
  const distributed = beneficiaries.reduce((a, b) => a + (rowIsFilled(b) ? b.amount : 0), 0);

  const incoming = hasTradingCo ? tradingProfit : entityProfit;

  const updatePerson = (
    setter: React.Dispatch<React.SetStateAction<PersonRow[]>>,
    key: string, patch: Partial<PersonRow>,
  ) => setter(rows => rows.map(r => (r.key === key ? { ...r, ...patch } : r)));


  const build = async () => {
    if (isPreviewMode) { toast.success('Structure created (preview)'); onOpenChange(false); return; }
    setSaving(true);
    try {
      const created: Record<string, string> = {};
      let order = existingEntities.length;

      const insertEntity = async (row: {
        key: string; name: string; entity_type: EntityType; is_applicant?: boolean;
        trustee_entity_id?: string | null; x: number; y: number;
      }) => {
        const { data, error } = await supabase.from('lead_entities').insert({
          lead_id: leadId,
          name: row.name.trim(),
          entity_type: row.entity_type,
          is_applicant: !!row.is_applicant,
          trustee_entity_id: row.trustee_entity_id ?? null,
          position_x: row.x,
          position_y: row.y,
          sort_order: order++,
        } as any).select('id').single();
        if (error) throw error;
        created[row.key] = (data as any).id as string;
        return created[row.key];
      };

      const dirRows = directors.filter(d => d.name.trim());
      const benRows = beneficiaries.filter(rowIsFilled);

      // Directors of the corporate trustee (top row)
      if (isTrust && trusteeKind === 'corporate') {
        for (let i = 0; i < dirRows.length; i++) {
          await insertEntity({ key: `dir-${dirRows[i].key}`, name: dirRows[i].name, entity_type: 'individual', x: 40 + i * 230, y: 0 });
        }
      }

      // Trustee
      let trusteeId: string | null = null;
      if (isTrust) {
        if (trusteeKind === 'corporate') {
          trusteeId = await insertEntity({ key: 'trustee', name: trusteeName, entity_type: 'company', x: 60, y: 170 });
        } else {
          trusteeId = await insertEntity({ key: 'trustee', name: trusteeName, entity_type: 'individual', x: 60, y: 170 });
        }
      }

      // Trading company (income source)
      let tradingId: string | null = null;
      if (hasTradingCo) {
        tradingId = await insertEntity({ key: 'trading', name: tradingName || 'Trading company', entity_type: 'company', x: 460, y: 170 });
      }

      // Main entity in the centre
      const mainType: EntityType = isTrust ? trustType
        : kind === 'company' ? 'company'
        : kind === 'partnership' ? 'partnership' : 'individual';
      const mainId = await insertEntity({
        key: 'main',
        name: trustName,
        entity_type: mainType,
        is_applicant: kind === 'sole_trader',
        trustee_entity_id: trusteeId,
        x: 460, y: 340,
      });

      // People / entities receiving income (bottom row)
      for (let i = 0; i < benRows.length; i++) {
        const b = benRows[i];
        if (b.existingId) {
          created[`ben-${b.key}`] = b.existingId;
          continue;
        }
        await insertEntity({
          key: `ben-${b.key}`, name: b.name, entity_type: b.entityType || 'individual',
          is_applicant: b.isApplicant, x: 40 + i * 230, y: 520,
        });
      }

      // Roles
      const roleRows: any[] = [];
      if (isTrust && trusteeId) {
        roleRows.push({ lead_id: leadId, entity_id: mainId, person_entity_id: trusteeId, person_name: trusteeName.trim(), role: 'trustee' });
        if (trusteeKind === 'corporate') {
          for (const d of dirRows) {
            roleRows.push({
              lead_id: leadId, entity_id: trusteeId, person_entity_id: created[`dir-${d.key}`],
              person_name: d.name.trim(), role: 'director',
            });
          }
        }
      }
      for (const b of benRows) {
        roleRows.push({
          lead_id: leadId, entity_id: mainId, person_entity_id: created[`ben-${b.key}`],
          person_name: (b.existingId ? existingEntities.find(e => e.id === b.existingId)?.name : b.name)?.trim() ?? null,
          role: isTrust ? (trustType === 'unit_trust' ? 'unit_holder' : 'beneficiary')
            : kind === 'partnership' ? 'partner' : 'shareholder',
        });
      }

      if (roleRows.length) {
        const { error } = await supabase.from('lead_entity_roles').insert(roleRows as any);
        if (error) throw error;
      }

      // Flows
      const flowRows: any[] = [];
      if (tradingId && tradingProfit > 0) {
        flowRows.push({
          lead_id: leadId, from_entity_id: tradingId, to_entity_id: mainId,
          financial_year: financialYear, amount: tradingProfit, flow_type: 'net_profit', use_for_servicing: true,
        });
      }
      for (const b of benRows) {
        if (b.amount > 0) {
          flowRows.push({
            lead_id: leadId, from_entity_id: mainId, to_entity_id: created[`ben-${b.key}`],
            financial_year: financialYear, amount: b.amount,
            flow_type: isTrust ? 'trust_distribution' : kind === 'partnership' ? 'partnership_share' : 'wages',
            use_for_servicing: true,
          });
        }
      }
      if (flowRows.length) {
        const { error } = await supabase.from('lead_entity_flows').insert(flowRows as any);
        if (error) throw error;
      }

      toast.success('Structure created');
      onOpenChange(false);
      onCompleted();
    } catch {
      toast.error('Could not create the structure');
    } finally {
      setSaving(false);
    }
  };

  const Hint = ({ children }: { children: React.ReactNode }) => (
    <p className="flex gap-2 text-xs text-muted-foreground">
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );

  const NEW_RECIPIENT_TYPES: EntityType[] = ['individual', 'company', 'discretionary_trust', 'unit_trust', 'partnership', 'smsf'];

  const peopleList = ({
    rows, setter, amountLabel, showApplicant = true, recipientPicker = false,
  }: {
    rows: PersonRow[];
    setter: React.Dispatch<React.SetStateAction<PersonRow[]>>;
    amountLabel?: string;
    showApplicant?: boolean;
    recipientPicker?: boolean;
  }) => (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const chosen = r.existingId ? existingEntities.find(e => e.id === r.existingId) ?? null : null;
        const options = existingEntities.filter(
          e => e.id === r.existingId || !rows.some(x => x.existingId === e.id),
        );
        return (
          <div key={r.key} className="rounded-md border p-3 space-y-2">
            {recipientPicker && (
              <div className="flex items-center gap-2">
                <Select
                  value={r.existingId ? `existing:${r.existingId}` : `new:${r.entityType}`}
                  onValueChange={v => {
                    if (v.startsWith('existing:')) {
                      const id = v.slice(9);
                      const ent = existingEntities.find(e => e.id === id);
                      updatePerson(setter, r.key, {
                        existingId: id,
                        name: ent?.name ?? '',
                        entityType: (ent?.entity_type as EntityType) ?? 'individual',
                        isApplicant: !!ent?.is_applicant,
                      });
                    } else {
                      updatePerson(setter, r.key, { existingId: null, entityType: v.slice(4) as EntityType });
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {options.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">Already on the map</div>
                        {options.map(e => (
                          <SelectItem key={e.id} value={`existing:${e.id}`}>
                            {e.name} · {ENTITY_TYPE_LABELS[e.entity_type as EntityType]}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">Add new</div>
                    {NEW_RECIPIENT_TYPES.map(t => (
                      <SelectItem key={t} value={`new:${t}`}>New {ENTITY_TYPE_LABELS[t].toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rows.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setter(list => list.filter(x => x.key !== r.key))}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
            {!chosen && (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus={i === rows.length - 1 && !r.name}
                  value={r.name}
                  placeholder={
                    !recipientPicker || r.entityType === 'individual'
                      ? 'Full name'
                      : `${ENTITY_TYPE_LABELS[r.entityType]} name`
                  }
                  onChange={e => updatePerson(setter, r.key, { name: e.target.value })}
                />
                {!recipientPicker && rows.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setter(list => list.filter(x => x.key !== r.key))}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            )}
            {amountLabel && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">{amountLabel}</Label>
                  <Input
                    className="w-36"
                    inputMode="numeric"
                    value={fmtInput(r.amount)}
                    placeholder="0"
                    onChange={e => updatePerson(setter, r.key, { amount: money(e.target.value) })}
                  />
                </div>
                {showApplicant && (
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox checked={r.isApplicant} onCheckedChange={v => updatePerson(setter, r.key, { isApplicant: !!v })} />
                    On the loan application
                  </label>
                )}
              </div>
            )}
            {recipientPicker && r.entityType !== 'individual' && (
              <p className="text-[11px] text-muted-foreground">
                Income landing in a company or trust is only usable for servicing if that entity is on the loan, or if it distributes on to an applicant.
              </p>
            )}
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={() => setter(list => [...list, blankPerson()])}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add another
      </Button>
    </div>
  );


  const body = () => {
    switch (stepKey) {
      case 'Structure':
        return (
          <div className="space-y-3">
            <Hint>Start with how the client's business is set up. Not sure? Their tax return cover page or accountant's letter will say.</Hint>
            <div className="grid gap-2">
              {STRUCTURE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setKind(o.value)}
                  className={cn(
                    'text-left rounded-md border p-3 transition-colors',
                    kind === o.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                  )}
                >
                  <p className="text-sm font-medium">{o.label}</p>
                  <p className="text-xs text-muted-foreground">{o.blurb}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'The trust':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Trust name</Label>
              <Input autoFocus value={trustName} onChange={e => setTrustName(e.target.value)} placeholder="e.g. Smith Family Trust" />
            </div>
            <div className="grid gap-2">
              {TRUST_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTrustType(t.value)}
                  className={cn(
                    'text-left rounded-md border p-3 transition-colors',
                    trustType === t.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                  )}
                >
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.blurb}</p>
                </button>
              ))}
            </div>
            <Hint>The trust sits in the middle of the map. Next we'll add who controls it, then who the income goes to.</Hint>
          </div>
        );

      case `The ${mainLabel}`:
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{kind === 'sole_trader' ? 'Business / client name' : `${mainLabel[0].toUpperCase()}${mainLabel.slice(1)} name`}</Label>
              <Input autoFocus value={trustName} onChange={e => setTrustName(e.target.value)} placeholder={kind === 'company' ? 'e.g. Smith Building Pty Ltd' : 'e.g. Smith & Co'} />
            </div>
            <Hint>This entity sits in the centre of the map — income flows in from the top and out to people at the bottom.</Hint>
          </div>
        );

      case 'Trustee':
        return (
          <div className="space-y-4">
            <Hint>Every trust has a trustee — the entity that legally controls it. Usually a Pty Ltd company set up just for that job.</Hint>
            <div className="grid grid-cols-2 gap-2">
              {(['corporate', 'individual'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setTrusteeKind(k)}
                  className={cn(
                    'rounded-md border p-3 text-left transition-colors',
                    trusteeKind === k ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                  )}
                >
                  <p className="text-sm font-medium">{k === 'corporate' ? 'Corporate trustee' : 'Individual trustee(s)'}</p>
                  <p className="text-xs text-muted-foreground">
                    {k === 'corporate' ? 'A Pty Ltd acts as trustee' : 'A person acts as trustee'}
                  </p>
                </button>
              ))}
            </div>
            <div>
              <Label className="text-xs">{trusteeKind === 'corporate' ? 'Trustee company name' : 'Trustee name'}</Label>
              <Input
                value={trusteeName}
                onChange={e => setTrusteeName(e.target.value)}
                placeholder={trusteeKind === 'corporate' ? 'e.g. Smith Nominees Pty Ltd' : 'e.g. John Smith'}
              />
            </div>
            {trusteeKind === 'corporate' && (
              <div className="space-y-2">
                <Label className="text-xs">Directors of the trustee company</Label>
                <Hint>These are the people who actually control the trust — lenders will want them as guarantors.</Hint>
                <PeopleList rows={directors} setter={setDirectors} showApplicant={false} />
              </div>
            )}
          </div>
        );

      case 'Who receives income':
        return (
          <div className="space-y-3">
            <Hint>
              {isTrust
                ? `Who did ${trustName || 'the trust'} distribute to in ${fyLabel(financialYear)}? Only people on the loan can have their share used for servicing.`
                : `Who is paid by ${trustName || 'the business'} — wages, dividends or profit share?`}
            </Hint>
            <Hint>
              Pick someone already on the map, or add a new person — and if the share went to another trust or company, choose that
              entity type here and it will be created and linked for you.
            </Hint>
            <Label className="text-xs">{peopleLabel}</Label>
            <PeopleList
              rows={beneficiaries}
              setter={setBeneficiaries}
              amountLabel={`${fyLabel(financialYear)} amount`}
              recipientPicker
            />

          </div>
        );

      case 'Where income comes from':
        return (
          <div className="space-y-3">
            <Hint>Does a separate trading company earn the money and pass its profit up, or does this entity trade itself?</Hint>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setHasTradingCo(false)}
                className={cn('rounded-md border p-3 text-left', !hasTradingCo ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')}
              >
                <p className="text-sm font-medium">It trades directly</p>
                <p className="text-xs text-muted-foreground">The {mainLabel} earns the income itself</p>
              </button>
              <button
                onClick={() => setHasTradingCo(true)}
                className={cn('rounded-md border p-3 text-left', hasTradingCo ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')}
              >
                <p className="text-sm font-medium">A trading company feeds it</p>
                <p className="text-xs text-muted-foreground">Net profit flows up into the {mainLabel}</p>
              </button>
            </div>
            {hasTradingCo ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Trading company name</Label>
                  <Input value={tradingName} onChange={e => setTradingName(e.target.value)} placeholder="e.g. Smith Building Pty Ltd" />
                </div>
                <div>
                  <Label className="text-xs">Net profit to the {mainLabel} ({fyLabel(financialYear)})</Label>
                  <Input inputMode="numeric" value={fmtInput(tradingProfit)} onChange={e => setTradingProfit(money(e.target.value))} placeholder="0" />
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-xs">Net profit for {fyLabel(financialYear)} (optional)</Label>
                <Input inputMode="numeric" value={fmtInput(entityProfit)} onChange={e => setEntityProfit(money(e.target.value))} placeholder="0" className="sm:w-48" />
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3 space-y-1">
              <p className="flex items-center gap-2 font-medium"><Building2 className="w-4 h-4" /> {trustName || '—'}</p>
              <p className="text-xs text-muted-foreground">
                {isTrust ? TRUST_TYPES.find(t => t.value === trustType)?.label : STRUCTURE_OPTIONS.find(s => s.value === kind)?.label}
                {isTrust && trusteeName ? ` · Trustee: ${trusteeName}` : ''}
              </p>
              {isTrust && trusteeKind === 'corporate' && directors.some(d => d.name.trim()) && (
                <p className="text-xs text-muted-foreground">Directors: {directors.filter(d => d.name.trim()).map(d => d.name).join(', ')}</p>
              )}
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="flex items-center gap-2 font-medium"><Users className="w-4 h-4" /> {peopleLabel}</p>
              {beneficiaries.filter(rowIsFilled).map(b => {
                const ex = b.existingId ? existingEntities.find(e => e.id === b.existingId) : null;
                const label = ex?.name ?? b.name;
                const type = (ex?.entity_type as EntityType) ?? b.entityType;
                return (
                  <p key={b.key} className="flex justify-between gap-2 text-xs">
                    <span className="truncate">
                      {label}
                      {type !== 'individual' ? ` · ${ENTITY_TYPE_LABELS[type]}` : ''}
                      {ex ? ' · existing' : ''}
                      {b.isApplicant ? ' · applicant' : ''}
                    </span>
                    <span className="tabular-nums">{formatMoney(b.amount)}</span>
                  </p>
                );
              })}

            </div>
            {incoming > 0 && (
              <p className="text-xs text-muted-foreground">
                Income in: {formatMoney(incoming)} · distributed out: {formatMoney(distributed)}
                {incoming - distributed > 0 && ` · ${formatMoney(incoming - distributed)} stays in the ${mainLabel}`}
              </p>
            )}
          </div>
        );
    }
  };

  const last = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="w-4 h-4" /> Guided structure setup</DialogTitle>
          <DialogDescription>Step {step + 1} of {steps.length} · {stepKey}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1">
          {steps.map((s, i) => (
            <span key={s} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')} />
          ))}
        </div>

        <div className="py-2">{body()}</div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          {last ? (
            <Button size="sm" onClick={build} disabled={saving}>{saving ? 'Building…' : 'Build the map'}</Button>
          ) : (
            <Button size="sm" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
              Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
