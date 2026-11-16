import { useEffect, useState } from 'react';
import { TrendingUp, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { calculateDealRevenue } from '@/lib/dealRevenue';
import { toast } from 'sonner';

interface Props {
  leadId: string;
  loanAmount: number | null;
  mandateFee: number;
  isPreviewMode: boolean;
  onSaved: (fields: { loan_amount?: number | null; mandate_fee: number }) => void;
}

const currency = (value: number) => value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 });
const inputValue = (value: number) => value ? value.toLocaleString('en-AU', { maximumFractionDigits: 2 }) : '';

export function DealRevenueSummary({ leadId, loanAmount, mandateFee, isPreviewMode, onSaved }: Props) {
  const [loan, setLoan] = useState(inputValue(loanAmount ?? 0));
  const [mandate, setMandate] = useState(inputValue(mandateFee));
  const [hasSplits, setHasSplits] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setLoan(inputValue(loanAmount ?? 0)); setMandate(inputValue(mandateFee)); }, [leadId, loanAmount, mandateFee]);
  useEffect(() => {
    let active = true;
    setHasSplits(null);
    if (isPreviewMode) { setHasSplits(false); return; }
    void supabase.from('loan_splits').select('id').eq('lead_id', leadId).limit(1).then(({ data, error }) => {
      if (active && !error) setHasSplits(Boolean(data?.length));
    });
    return () => { active = false; };
  }, [leadId, isPreviewMode]);
  const loanNumber = Number(loan.replace(/,/g, '')) || 0;
  const mandateNumber = Number(mandate.replace(/,/g, '')) || 0;
  const revenue = calculateDealRevenue(loanNumber, mandateNumber);
  const changed = loanNumber !== (loanAmount ?? 0) || mandateNumber !== mandateFee;
  const changeCurrency = (raw: string, setter: (value: string) => void) => {
    const clean = raw.replace(/[^\d.]/g, '');
    if (!/^\d*(\.\d{0,2})?$/.test(clean)) return;
    const [whole, decimal] = clean.split('.');
    setter((whole ? Number(whole).toLocaleString('en-AU') : '') + (decimal !== undefined ? `.${decimal}` : ''));
  };
  const save = async () => {
    setSaving(true);
    try {
      const fields = { mandate_fee: mandateNumber, ...(!hasSplits ? { loan_amount: loanNumber || null } : {}) };
      if (!isPreviewMode) {
        const { data, error } = await supabase.from('leads').update(fields).eq('id', leadId).select('id').single();
        if (error || !data) throw new Error('Save failed');
      }
      onSaved(fields);
      toast.success('Revenue details saved');
    } catch { toast.error('Could not save revenue details. Please try again.'); }
    finally { setSaving(false); }
  };
  return (
    <section aria-label="Business revenue" className="border-y border-border bg-success/5 px-5 py-4 sm:px-8">
      <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-success" /><h3 className="text-sm font-semibold">Business revenue</h3></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
        <div><label htmlFor={`revenue-loan-${leadId}`} className="text-xs text-muted-foreground">Loan amount</label><Input id={`revenue-loan-${leadId}`} aria-label="Revenue loan amount" inputMode="decimal" value={loan} readOnly={hasSplits !== false} disabled={saving} onChange={e => changeCurrency(e.target.value, setLoan)} className="mt-1 bg-background tabular-nums" placeholder="0" />{hasSplits && <p className="text-xs text-muted-foreground mt-1">Total from loan splits</p>}</div>
        <div><label htmlFor={`revenue-mandate-${leadId}`} className="text-xs text-muted-foreground">Mandate fee ($)</label><Input id={`revenue-mandate-${leadId}`} aria-label="Mandate fee" inputMode="decimal" value={mandate} disabled={saving} onChange={e => changeCurrency(e.target.value, setMandate)} className="mt-1 bg-background tabular-nums" placeholder="0" /></div>
        <div><p className="text-xs text-muted-foreground">Estimated total revenue</p><p className="text-2xl font-semibold text-success tabular-nums mt-1 break-all" data-testid="revenue-total">{currency(revenue.total)}</p></div>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 text-xs">
        <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">Upfront · 0.65%</dt><dd className="font-medium tabular-nums">{currency(revenue.upfront)}</dd></div>
        <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">2-year trail · 0.15% p.a.</dt><dd className="font-medium tabular-nums">{currency(revenue.trail)}</dd></div>
        <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">Mandate</dt><dd className="font-medium tabular-nums">{currency(revenue.mandate)}</dd></div>
      </dl>
      <div className="flex flex-wrap justify-between items-center gap-3 mt-3"><p className="text-[11px] text-muted-foreground max-w-lg">Estimate on the original loan amount, before deductions. No GST adjustment applied; trail is not guaranteed.</p><Button size="sm" variant="outline" disabled={!changed || saving || hasSplits === null} onClick={save} className="gap-2"><Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Save revenue'}</Button></div>
    </section>
  );
}