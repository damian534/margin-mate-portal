import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, DollarSign, Layers } from 'lucide-react';
import { toast } from 'sonner';

export interface LoanSplit {
  id: string;
  lead_id: string;
  amount: number | null;
  security_address: string | null;
  lender: string | null;
  application_id: string | null;
  display_order: number;
}

interface Props {
  leadId: string;
  isPreviewMode?: boolean;
  onTotalChange?: (total: number) => void;
}

export function LoanSplitsEditor({ leadId, isPreviewMode, onTotalChange }: Props) {
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
      supabase.from('lenders').select('name').order('display_order'),
    ]);
    const list = (s as LoanSplit[]) || [];
    setSplits(list);
    setLenders(((l as { name: string }[]) || []).map(x => x.name));
    onTotalChange?.(list.reduce((sum, x) => sum + (x.amount || 0), 0));
    setLoading(false);
  };

  const recomputeTotal = (list: LoanSplit[]) => {
    onTotalChange?.(list.reduce((sum, x) => sum + (x.amount || 0), 0));
  };

  const addSplit = async () => {
    const nextOrder = splits.length ? Math.max(...splits.map(s => s.display_order)) + 1 : 0;
    if (isPreviewMode) {
      const fake: LoanSplit = { id: `preview-${Date.now()}`, lead_id: leadId, amount: null, security_address: null, lender: null, application_id: null, display_order: nextOrder };
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
  };

  const deleteSplit = async (id: string) => {
    const next = splits.filter(s => s.id !== id);
    setSplits(next); recomputeTotal(next);
    if (isPreviewMode || id.startsWith('preview-')) return;
    await supabase.from('loan_splits').delete().eq('id', id);
  };

  const total = splits.reduce((sum, x) => sum + (x.amount || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Loan Splits
        </Label>
        <span className="text-xs text-muted-foreground">
          Total: <span className="font-bold text-foreground">${total.toLocaleString()}</span>
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : splits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">No splits yet</p>
          <Button size="sm" variant="outline" onClick={addSplit}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add first split
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {splits.map((s, i) => (
            <div key={s.id} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Split #{i + 1}</span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteSplit(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
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
    </div>
  );
}