import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, DollarSign, Layers, CheckCircle2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { SectionCard } from '@/components/lead/SectionCard';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface LoanSplit {
  id: string;
  lead_id: string;
  amount: number | null;
  security_address: string | null;
  lender: string | null;
  application_id: string | null;
  display_order: number;
  loan_purpose: string | null;
  settled?: boolean;
  settled_date?: string | null;
}

interface Props {
  leadId: string;
  isPreviewMode?: boolean;
  onTotalChange?: (total: number) => void;
  /** When true, the section presents as the Settlement record (loan splits become settled). */
  settled?: boolean;
  /** Optional settlement date to surface in the header. */
  settledDate?: string | null;
}

export function LoanSplitsEditor({ leadId, isPreviewMode, onTotalChange, settled = false, settledDate = null }: Props) {
  const [splits, setSplits] = useState<LoanSplit[]>([]);
  const [lenders, setLenders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [leadId]);

  const load = async () => {
    setLoading(true);
    if (isPreviewMode) {
      setSplits([]);
      setLenders(['CBA', 'Westpac', 'ANZ', 'NAB', 'Macquarie', 'ING']);
      setLoading(false);
      return;
    }
    const [{ data: s }, { data: l }] = await Promise.all([
      supabase.from('loan_splits').select('*').eq('lead_id', leadId).order('display_order'),
      supabase.from('lenders').select('name, broker_id, is_accredited').eq('is_accredited', true).order('name'),
    ]);
    const list = (s as LoanSplit[]) || [];
    setSplits(list);
    const names = Array.from(new Set(((l as { name: string }[]) || []).map(x => x.name)));
    setLenders(names);
    onTotalChange?.(list.reduce((sum, x) => sum + (x.amount || 0), 0));
    setLoading(false);
  };

  const recomputeTotal = (list: LoanSplit[]) => {
    onTotalChange?.(list.reduce((sum, x) => sum + (x.amount || 0), 0));
  };

  const addSplit = async () => {
    const nextOrder = splits.length ? Math.max(...splits.map(s => s.display_order)) + 1 : 0;
    if (isPreviewMode) {
      const fake: LoanSplit = { id: `preview-${Date.now()}`, lead_id: leadId, amount: null, security_address: null, lender: null, application_id: null, display_order: nextOrder, loan_purpose: null };
      const next = [...splits, fake]; setSplits(next); recomputeTotal(next); return;
    }
    const { data, error } = await supabase.from('loan_splits').insert({ lead_id: leadId, display_order: nextOrder } as any).select().single();
    if (error || !data) { toast.error('Failed to add split'); return; }
    const next = [...splits, data as LoanSplit]; setSplits(next); recomputeTotal(next);
  };

  const updateSplit = async (id: string, patch: Partial<LoanSplit>) => {
    const next = splits.map(s => s.id === id ? { ...s, ...patch } : s);
    setSplits(next); recomputeTotal(next);
    if (isPreviewMode || id.startsWith('preview-')) return;
    await supabase.from('loan_splits').update(patch as any).eq('id', id);
    // When a split is marked settled, propagate to the lead status.
    if (patch.settled === true) {
      await supabase.from('leads').update({
        status: 'settled',
        settled_date: format(new Date(), 'yyyy-MM-dd'),
      } as any).eq('id', leadId);
    }
    // When a split is un-toggled and no splits remain settled, revert the lead status.
    if (patch.settled === false) {
      const anyStillSettled = next.some(s => s.settled);
      if (!anyStillSettled) {
        await supabase.from('leads').update({
          status: 'approved',
          settled_date: null,
        } as any).eq('id', leadId);
      }
    }
  };

  const deleteSplit = async (id: string) => {
    const next = splits.filter(s => s.id !== id);
    setSplits(next); recomputeTotal(next);
    if (isPreviewMode || id.startsWith('preview-')) return;
    await supabase.from('loan_splits').delete().eq('id', id);
  };

  const total = splits.reduce((sum, x) => sum + (x.amount || 0), 0);
  const settledCount = splits.filter(s => s.settled).length;
  const settledSum = splits.filter(s => s.settled).reduce((s, x) => s + (x.amount || 0), 0);
  const allSettled = splits.length > 0 && settledCount === splits.length;
  const showSettledView = settled || allSettled;

  const lenders_summary = Array.from(new Set(splits.map(s => s.lender).filter(Boolean) as string[]));
  const subtitle = showSettledView
    ? <span>
        <span className="text-success font-semibold">Settled</span>
        {settledDate && <> · {new Date(settledDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}</>}
        {splits.length > 0 && <> · {splits.length} split{splits.length === 1 ? '' : 's'} · ${total.toLocaleString()}</>}
        {lenders_summary.length > 0 && <> · {lenders_summary.join(', ')}</>}
      </span>
    : <span>
        {splits.length === 0
          ? 'No splits added yet'
          : <>
              {splits.length} split{splits.length === 1 ? '' : 's'} · Total <span className="font-semibold text-foreground">${total.toLocaleString()}</span>
              {settledCount > 0 && <> · <span className="text-success font-semibold">{settledCount} settled (${settledSum.toLocaleString()})</span></>}
            </>}
      </span>;

  return (
    <SectionCard
      icon={showSettledView ? CheckCircle2 : Layers}
      title={showSettledView ? 'Settlement' : 'Loan Splits'}
      tone={showSettledView ? 'success' : settledCount > 0 ? 'ok' : 'neutral'}
      subtitle={subtitle}
      defaultCollapsed={showSettledView || splits.length > 0}
    >
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : splits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">No splits yet</p>
          <Button size="sm" variant="outline" onClick={addSplit}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add first split
          </Button>
        </div>
      ) : showSettledView ? (
        <div className="space-y-2">
          <div className="rounded-md border border-success/30 bg-success/5 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="font-semibold">Total Settled</span>
            </div>
            <span className="text-base font-bold text-success">${total.toLocaleString()}</span>
          </div>
          {splits.map((s, i) => (
            <div key={s.id} className="rounded-md border border-border bg-background px-3 py-2 flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-success bg-success/10 px-1.5 py-0.5 rounded shrink-0">
                Split #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  {s.lender ? (<><Building2 className="w-3 h-3 text-muted-foreground" />{s.lender}</>) : <span className="text-muted-foreground italic">No lender</span>}
                  {s.loan_purpose && <span className="text-[11px] text-muted-foreground font-normal">· {s.loan_purpose}</span>}
                </p>
                {(s.security_address || s.application_id) && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {s.security_address}
                    {s.security_address && s.application_id && ' · '}
                    {s.application_id && <>App: {s.application_id}</>}
                  </p>
                )}
                {s.settled_date && (
                  <p className="text-[10px] text-success">Settled {format(new Date(s.settled_date), 'dd MMM yyyy')}</p>
                )}
              </div>
              <span className="text-sm font-bold tabular-nums">${(s.amount || 0).toLocaleString()}</span>
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <Label htmlFor={`settled-toggle-${s.id}`} className={cn('text-[11px] cursor-pointer', s.settled ? 'text-success font-semibold' : 'text-muted-foreground')}>
                  {s.settled ? 'Settled' : 'Mark settled'}
                </Label>
                <Switch
                  id={`settled-toggle-${s.id}`}
                  checked={!!s.settled}
                  onCheckedChange={(v) => updateSplit(s.id, { settled: v, settled_date: v ? format(new Date(), 'yyyy-MM-dd') : null } as any)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {splits.map((s, i) => (
            <div key={s.id} className={cn('rounded-lg border p-3 space-y-2', s.settled ? 'border-success/40 bg-success/5' : 'border-border bg-muted/20')}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  Split #{i + 1}
                  {s.settled && <span className="text-[9px] uppercase tracking-wide text-success bg-success/10 px-1.5 py-0.5 rounded">Settled</span>}
                </span>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`split-settled-${s.id}`} className={cn('text-[11px] cursor-pointer', s.settled ? 'text-success font-semibold' : 'text-muted-foreground')}>
                    {s.settled ? 'Settled' : 'Mark settled'}
                  </Label>
                  <Switch
                    id={`split-settled-${s.id}`}
                    checked={!!s.settled}
                    onCheckedChange={(v) => updateSplit(s.id, { settled: v, settled_date: v ? format(new Date(), 'yyyy-MM-dd') : null } as any)}
                  />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteSplit(s.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="text" inputMode="numeric" className="pl-7 h-8 text-sm"
                      value={s.amount ? s.amount.toLocaleString() : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        updateSplit(s.id, { amount: raw ? parseInt(raw, 10) : null });
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Lender</Label>
                  <Select value={s.lender ?? ''} onValueChange={(v) => updateSplit(s.id, { lender: v || null })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select lender" /></SelectTrigger>
                    <SelectContent>
                      {lenders.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Loan Purpose</Label>
                <Select value={s.loan_purpose ?? ''} onValueChange={(v) => updateSplit(s.id, { loan_purpose: v || null })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select purpose" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owner Occupied">Owner Occupied</SelectItem>
                    <SelectItem value="Investment">Investment</SelectItem>
                    <SelectItem value="SMSF">SMSF</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Security Address</Label>
                <Input className="h-8 text-sm" placeholder="e.g. 123 Smith St, Sydney NSW"
                  value={s.security_address ?? ''}
                  onChange={(e) => updateSplit(s.id, { security_address: e.target.value || null })} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Application ID / Lender Ref</Label>
                <Input className="h-8 text-sm" placeholder="e.g. APP-123456"
                  value={s.application_id ?? ''}
                  onChange={(e) => updateSplit(s.id, { application_id: e.target.value || null })} />
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full" onClick={addSplit}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add another split
          </Button>
        </div>
      )}
    </SectionCard>
  );
}