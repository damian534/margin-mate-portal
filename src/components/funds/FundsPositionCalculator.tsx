import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { AutoField } from './AutoField';
import { MoneyInput } from './MoneyInput';
import { calculateFundsPosition, defaultFundsInputs, sumFundsBreakdown } from '@/lib/fundsPosition/calc';
import type { FundsPositionInputs, LineItem } from '@/lib/fundsPosition/types';
import { stateLabels, type StateKey } from '@/lib/stampDutyRates';

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-AU')}`;

const PROPERTY_TYPES = [
  { value: 'established', label: 'Established Home', note: 'Existing / previously occupied home' },
  { value: 'new', label: 'New Home', note: 'Newly built, never occupied' },
  { value: 'vacant_build', label: 'Vacant land (plan to build)', note: 'May be eligible for additional concessions' },
  { value: 'vacant_no_build', label: 'Vacant land (no plan to build)', note: 'Land only, no immediate build plans' },
];

const CIRCUMSTANCES: Array<{ key: keyof FundsPositionInputs; label: string }> = [
  { key: 'pensioner', label: 'Pensioner' },
  { key: 'firstHomeBuyer', label: 'First Home Buyer' },
  { key: 'fhgScheme', label: 'Eligible for First Home Guarantee Scheme' },
  { key: 'differentValuation', label: 'Different Contract Price / Valuation' },
  { key: 'selfEmployed', label: 'Self Employed' },
  { key: 'foreignBuyer', label: 'Foreign Buyer' },
];

export function FundsPositionCalculator() {
  const [i, setI] = useState<FundsPositionInputs>(defaultFundsInputs);
  const set = <K extends keyof FundsPositionInputs>(key: K, value: FundsPositionInputs[K]) =>
    setI(prev => ({ ...prev, [key]: value }));

  const r = useMemo(() => calculateFundsPosition(i), [i]);

  const addItem = (key: 'customFunds' | 'feeItems') =>
    set(key, [...i[key], { id: crypto.randomUUID(), label: '', amount: 0 } as LineItem]);
  const updateItem = (key: 'customFunds' | 'feeItems', id: string, patch: Partial<LineItem>) =>
    set(key, i[key].map(it => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (key: 'customFunds' | 'feeItems', id: string) =>
    set(key, i[key].filter(it => it.id !== id));

  const shortfall = r.netSurplus < 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{stateLabels[i.state]}</Badge>
          <Badge variant="outline">{i.purpose === 'investment' ? 'Investment' : 'Owner Occupied'}</Badge>
          <Badge variant="outline" className="capitalize">{i.transactionType.replace('_', ' ')}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setI(defaultFundsInputs())}>
          <RotateCcw className="w-4 h-4 mr-1" /> Reset
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------------- Left: scenario setup ---------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scenario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Property State</label>
                <Select value={i.state} onValueChange={v => set('state', v as StateKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(stateLabels) as StateKey[]).map(s => (
                      <SelectItem key={s} value={s}>{stateLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Investment / Owner Occupied</label>
                <Select value={i.purpose} onValueChange={v => set('purpose', v as FundsPositionInputs['purpose'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner_occupied">Owner Occupied</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Property Type</label>
                <Select value={i.propertyType} onValueChange={v => set('propertyType', v as FundsPositionInputs['propertyType'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <div>
                          <div>{p.label}</div>
                          <div className="text-xs text-muted-foreground">{p.note}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Transaction Type</label>
                <Select value={i.transactionType} onValueChange={v => set('transactionType', v as FundsPositionInputs['transactionType'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="refinance">Refinance</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="property_only">Property Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Borrower Circumstances</p>
              {CIRCUMSTANCES.map(c => (
                <label key={String(c.key)} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(i[c.key])}
                    onCheckedChange={v => set(c.key, Boolean(v) as never)}
                  />
                  {c.label}
                </label>
              ))}
              {i.differentValuation && (
                <MoneyInput label="Valuation" value={i.valuation} onChange={v => set('valuation', v)} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* ---------------- Right: solvable figures ---------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Position</CardTitle>
            <p className="text-xs text-muted-foreground">
              Switch a field on to type your own number — anything left off is solved for you.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <AutoField
              label="Property Value"
              field={i.propertyValue}
              computed={r.propertyValue}
              onChange={f => set('propertyValue', f)}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <AutoField label="Base LVR" field={i.baseLVR} computed={r.baseLVR} onChange={f => set('baseLVR', f)} suffix="%" />
              <div className="rounded-lg border bg-muted/40 px-3 py-2">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Total LVR</span>
                <div className="h-8 flex items-center text-base font-semibold text-muted-foreground">
                  {r.totalLVR.toFixed(2)}%
                </div>
              </div>
              <AutoField label="Base Loan Amount" field={i.baseLoan} computed={r.baseLoan} onChange={f => set('baseLoan', f)} />
              <div className="rounded-lg border bg-muted/40 px-3 py-2">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Loan Amount</span>
                <div className="h-8 flex items-center text-base font-semibold text-muted-foreground">
                  {money(r.totalLoan)}
                </div>
              </div>
            </div>

            <AutoField
              label="Funds Available"
              field={i.fundsAvailable}
              computed={r.fundsAvailable}
              onChange={f => set('fundsAvailable', f)}
              hint={i.fundsAvailable.auto ? 'Solving for the funds needed to complete' : undefined}
            />

            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Rate</label>
                <Input
                  value={i.rate}
                  onChange={e => set('rate', Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Term</label>
                <Input
                  value={i.termYears}
                  onChange={e => set('termYears', Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">IO Term</label>
                <Input
                  value={i.ioYears}
                  onChange={e => set('ioYears', Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Repayment</label>
                <div className="h-9 flex items-center font-semibold">{money(r.repayment)}</div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {i.ioYears > 0 ? 'Interest only repayment (monthly)' : 'Principal & interest repayment (monthly)'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Summary strip ---------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border bg-border overflow-hidden">
        {[
          { label: 'Property Value', value: money(r.propertyValue), auto: i.propertyValue.auto },
          { label: 'Total Loan', value: money(r.totalLoan), auto: true },
          { label: 'Total LVR', value: `${r.totalLVR.toFixed(2)}%`, auto: true },
          {
            label: shortfall ? 'Funds to Complete' : 'Net Surplus',
            value: money(Math.abs(r.netSurplus)),
            auto: true,
            tone: shortfall ? 'text-destructive' : 'text-success',
          },
        ].map(t => (
          <div key={t.label} className="bg-card px-4 py-4 text-center">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className={`text-2xl font-bold ${'tone' in t && t.tone ? t.tone : ''}`}>{t.value}</p>
            {t.auto && <Badge variant="secondary" className="mt-1 text-[10px]">Auto-calc'd</Badge>}
          </div>
        ))}
      </div>

      {/* ---------------- Calculation breakdown ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Calculation Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-px bg-border md:grid-cols-4 rounded-lg overflow-hidden border">
          {/* LMI */}
          <div className="bg-card p-3 space-y-3">
            <p className="text-sm font-medium">LMI</p>
            <div className="rounded-md border bg-muted/40 px-2 py-1.5">
              <span className="text-[11px] uppercase text-muted-foreground">LMI Being Applied</span>
              <p className="font-semibold">{money(r.lmi + r.lmiStampDuty)}</p>
            </div>
            <label className="flex items-center justify-between text-sm">
              <span>Capitalise LMI</span>
              <Switch checked={i.capitaliseLMI} onCheckedChange={v => set('capitaliseLMI', v)} />
            </label>
            <p className="text-[11px] text-muted-foreground">
              {i.capitaliseLMI ? 'LMI is added on top of the base loan' : 'LMI is excluded from the loan and paid upfront'}
            </p>
            <label className="flex items-center justify-between text-sm">
              <span>Include LMI stamp duty</span>
              <Switch checked={i.includeLmiStampDuty} onCheckedChange={v => set('includeLmiStampDuty', v)} />
            </label>
            <AutoField
              label="Override LMI"
              field={i.lmiOverride}
              computed={r.lmi}
              onChange={f => set('lmiOverride', f)}
            />
          </div>

          {/* Govt charges */}
          <div className="bg-card p-3 space-y-3">
            <p className="text-sm font-medium">Govt Charges</p>
            <AutoField
              label="Total"
              field={i.govTotalOverride}
              computed={r.govCharges}
              onChange={f => set('govTotalOverride', f)}
            />
            <div className="space-y-1 text-sm">
              <Row label="Base Stamp Duty" value={money(r.stampDuty)} />
              <Row label="Stamp Duty Concession" value={money(-r.stampDutyConcession)} />
              <Row label="Mortgage Registration" value={money(r.mortgageRegistrationFee)} />
              <Row label="Transfer Fee" value={money(r.transferFee)} />
            </div>
          </div>

          {/* Funds available */}
          <div className="bg-card p-3 space-y-3">
            <p className="text-sm font-medium">Funds Available</p>
            <div className="rounded-md border bg-muted/40 px-2 py-1.5">
              <span className="text-[11px] uppercase text-muted-foreground">Funds Available</span>
              <p className="font-semibold">{money(r.fundsAvailable)}</p>
            </div>
            <label className="flex items-center justify-between text-sm">
              <span>Use Detailed</span>
              <Switch
                checked={i.fundsDetailed}
                onCheckedChange={v => {
                  if (v) setI(p => ({ ...p, fundsDetailed: true, savings: p.savings || r.fundsAvailable }));
                  else setI(p => ({ ...p, fundsDetailed: false, fundsAvailable: { auto: false, value: sumFundsBreakdown(p) } }));
                }}
              />
            </label>
            {i.fundsDetailed && (
              <div className="space-y-2">
                <MoneyInput label="Deposit Paid" value={i.deposit} onChange={v => set('deposit', v)} />
                <MoneyInput label="Savings" value={i.savings} onChange={v => set('savings', v)} />
                <MoneyInput label="Gifts" value={i.gifts} onChange={v => set('gifts', v)} />
                <MoneyInput label="Assets Being Disposed" value={i.assetsDisposed} onChange={v => set('assetsDisposed', v)} />
                <MoneyInput label="Equity" value={i.equity} onChange={v => set('equity', v)} />
                {i.customFunds.map(f => (
                  <LineItemRow
                    key={f.id}
                    item={f}
                    onChange={patch => updateItem('customFunds', f.id, patch)}
                    onRemove={() => removeItem('customFunds', f.id)}
                  />
                ))}
                <Button variant="ghost" size="sm" onClick={() => addItem('customFunds')}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Funds
                </Button>
              </div>
            )}
          </div>

          {/* Fees */}
          <div className="bg-card p-3 space-y-3">
            <p className="text-sm font-medium">Fees</p>
            <div className="rounded-md border bg-muted/40 px-2 py-1.5">
              <span className="text-[11px] uppercase text-muted-foreground">Total Fees</span>
              <p className="font-semibold">{money(r.fees)}</p>
            </div>
            <label className="flex items-center justify-between text-sm">
              <span>Use Detailed</span>
              <Switch checked={i.feesDetailed} onCheckedChange={v => set('feesDetailed', v)} />
            </label>
            {i.feesDetailed ? (
              <div className="space-y-2">
                {i.feeItems.map(f => (
                  <LineItemRow
                    key={f.id}
                    item={f}
                    onChange={patch => updateItem('feeItems', f.id, patch)}
                    onRemove={() => removeItem('feeItems', f.id)}
                  />
                ))}
                <Button variant="ghost" size="sm" onClick={() => addItem('feeItems')}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Fee
                </Button>
              </div>
            ) : (
              <MoneyInput label="Total Fees" value={i.feesTotal} onChange={v => set('feesTotal', v)} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Funds to complete summary ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Funds to Complete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row label="Purchase price / property value" value={money(i.transactionType === 'refinance' ? 0 : r.propertyValue)} />
          <Row label="Government charges" value={money(r.govCharges)} />
          <Row label="Fees" value={money(r.fees)} />
          <Row label="LMI payable upfront" value={money(r.lmiPayable)} />
          <div className="border-t pt-1">
            <Row label="Total funds required" value={money(r.fundsRequired)} bold />
          </div>
          <Row label="Less base loan" value={money(-r.baseLoan)} />
          <Row label="Less funds available" value={money(-r.fundsAvailable)} />
          <div className="border-t pt-1">
            <Row
              label={shortfall ? 'Shortfall — additional savings required' : 'Surplus'}
              value={money(Math.abs(r.netSurplus))}
              bold
              tone={shortfall ? 'text-destructive' : 'text-success'}
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Estimates only. Stamp duty, government fees and LMI premiums are indicative and must be confirmed
        with the relevant revenue office and the lender's own quote.
      </p>
    </div>
  );
}

function Row({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-muted-foreground ${bold ? 'font-medium text-foreground' : ''}`}>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-semibold' : ''} ${tone ?? ''}`}>{value}</span>
    </div>
  );
}

function LineItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: LineItem;
  onChange: (patch: Partial<LineItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Input
        value={item.label}
        placeholder="Label"
        onChange={e => onChange({ label: e.target.value })}
        className="h-9"
      />
      <div className="w-28">
        <MoneyInput value={item.amount} onChange={v => onChange({ amount: v })} />
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
