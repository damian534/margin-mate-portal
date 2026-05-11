import { useEffect, useRef, useState } from 'react';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle2, CalendarIcon, Plus, Trash2, FileCheck, ChevronDown, ChevronUp, Upload, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { logAudit } from '@/lib/leadAudit';

interface Condition {
  id: string;
  label: string;
  completed: boolean;
  display_order: number;
}

interface PreApprovalDoc {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

interface Props {
  leadId: string;
  purchasePrice: number | null;
  loanAmount: number | null;
  expiryDate: string | null;
  ftc: number | null;
  isPreviewMode?: boolean;
  onChange: (updates: {
    pre_approval_purchase_price?: number | null;
    pre_approval_loan_amount?: number | null;
    pre_approval_expiry_date?: string | null;
    pre_approval_ftc?: number | null;
  }) => void;
}

const fmtMoney = (n: number | null) =>
  n == null || isNaN(n) ? '' : new Intl.NumberFormat('en-AU').format(n);
const parseMoney = (s: string): number | null => {
  const cleaned = s.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const v = parseFloat(cleaned);
  return isNaN(v) ? null : v;
};

export function PreApprovalSection({
  leadId, purchasePrice, loanAmount, expiryDate, ftc, isPreviewMode = false, onChange,
}: Props) {
  const isPreviewLead = isPreviewMode || leadId.startsWith('preview-');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [newCondition, setNewCondition] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pp, setPp] = useState(fmtMoney(purchasePrice));
  const [la, setLa] = useState(fmtMoney(loanAmount));
  const [ftcStr, setFtcStr] = useState(fmtMoney(ftc));
  const [collapsed, setCollapsed] = useState(false);
  const [docs, setDocs] = useState<PreApprovalDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setPp(fmtMoney(purchasePrice)), [purchasePrice]);
  useEffect(() => setLa(fmtMoney(loanAmount)), [loanAmount]);
  useEffect(() => setFtcStr(fmtMoney(ftc)), [ftc]);

  const loadConditions = async () => {
    if (isPreviewLead) { setConditions([]); return; }
    const { data } = await supabase
      .from('lead_pre_approval_conditions' as any)
      .select('id,label,completed,display_order')
      .eq('lead_id', leadId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    setConditions((data as any) || []);
  };

  const loadDocs = async () => {
    if (isPreviewLead) { setDocs([]); return; }
    const { data } = await supabase
      .from('lead_pre_approval_documents' as any)
      .select('id,file_name,file_path,file_size,created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    setDocs((data as any) || []);
  };

  useEffect(() => { loadConditions(); loadDocs(); /* eslint-disable-next-line */ }, [leadId]);

  const expiryObj = expiryDate ? parseISO(expiryDate) : null;
  const daysToExpiry = expiryObj ? differenceInCalendarDays(expiryObj, new Date()) : null;

  const lvr = purchasePrice && loanAmount && purchasePrice > 0
    ? (loanAmount / purchasePrice) * 100 : null;

  const tone = (() => {
    if (daysToExpiry === null) return 'neutral';
    if (daysToExpiry < 0) return 'past';
    if (daysToExpiry <= 14) return 'urgent';
    if (daysToExpiry <= 30) return 'soon';
    return 'ok';
  })();

  const cardClasses = cn(
    'rounded-xl border-2 shadow-md overflow-hidden mb-3',
    tone === 'past' && 'border-destructive/40 bg-gradient-to-br from-destructive/10 via-background to-background',
    tone === 'urgent' && 'border-destructive/40 bg-gradient-to-br from-destructive/10 via-background to-background',
    tone === 'soon' && 'border-amber-400/50 bg-gradient-to-br from-amber-100/50 via-background to-background',
    tone === 'ok' && 'border-success/30 bg-gradient-to-br from-success/10 via-background to-background',
    tone === 'neutral' && 'border-border bg-muted/20',
  );

  const headerClasses = cn(
    'flex items-center justify-between px-4 py-3 border-b',
    tone === 'past' || tone === 'urgent' ? 'bg-destructive/10 border-destructive/20' :
    tone === 'soon' ? 'bg-amber-100/60 border-amber-300/40' :
    tone === 'ok' ? 'bg-success/10 border-success/20' :
    'bg-muted/40 border-border',
  );

  const iconBg = cn(
    'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
    tone === 'past' || tone === 'urgent' ? 'bg-destructive text-destructive-foreground' :
    tone === 'soon' ? 'bg-amber-500 text-white' :
    tone === 'ok' ? 'bg-success text-success-foreground' :
    'bg-primary text-primary-foreground',
  );

  const updateLead = async (updates: any, auditMsg?: string) => {
    onChange(updates);
    if (!isPreviewLead) {
      await supabase.from('leads').update(updates).eq('id', leadId);
      if (auditMsg) await logAudit(leadId, auditMsg, { isPreview: isPreviewLead });
    }
  };

  const saveMoney = async (
    field: 'pre_approval_purchase_price' | 'pre_approval_loan_amount' | 'pre_approval_ftc',
    raw: string,
    label: string,
    prev: number | null,
  ) => {
    const val = parseMoney(raw);
    if (val === prev) return;
    await updateLead({ [field]: val }, `📋 Pre-approval ${label} updated to ${val == null ? 'cleared' : '$' + fmtMoney(val)}`);
  };

  const saveExpiry = async (d: Date | undefined) => {
    setDatePickerOpen(false);
    const next = d ? format(d, 'yyyy-MM-dd') : null;
    const prev = expiryDate ? format(parseISO(expiryDate), 'dd MMM yyyy') : 'none';
    const nextLbl = d ? format(d, 'dd MMM yyyy') : 'cleared';
    await updateLead({ pre_approval_expiry_date: next }, `📋 Pre-approval expiry ${prev === 'none' ? 'set to' : 'changed:'} ${prev} → ${nextLbl}`);
  };

  const addCondition = async () => {
    const label = newCondition.trim();
    if (!label) return;
    const order = conditions.length;
    if (isPreviewLead) {
      setConditions(prev => [...prev, { id: `tmp-${Date.now()}`, label, completed: false, display_order: order }]);
      setNewCondition('');
      return;
    }
    const { data, error } = await supabase
      .from('lead_pre_approval_conditions' as any)
      .insert({ lead_id: leadId, label, display_order: order } as any)
      .select('id,label,completed,display_order')
      .maybeSingle();
    if (error) { toast.error(`Failed to add: ${error.message}`); return; }
    if (data) setConditions(prev => [...prev, data as any]);
    else loadConditions();
    setNewCondition('');
    await logAudit(leadId, `📋 Added pre-approval condition: ${label}`, { isPreview: isPreviewLead });
  };

  const toggleCondition = async (c: Condition) => {
    const next = !c.completed;
    setConditions(prev => prev.map(x => x.id === c.id ? { ...x, completed: next } : x));
    if (isPreviewLead) return;
    const { error } = await supabase
      .from('lead_pre_approval_conditions' as any)
      .update({ completed: next } as any).eq('id', c.id);
    if (error) { toast.error('Failed to update condition'); loadConditions(); return; }
    await logAudit(leadId, `📋 Pre-approval condition ${next ? '✓ completed' : 'reopened'}: ${c.label}`, { isPreview: isPreviewLead });
  };

  const deleteCondition = async (c: Condition) => {
    setConditions(prev => prev.filter(x => x.id !== c.id));
    if (isPreviewLead) return;
    await supabase.from('lead_pre_approval_conditions' as any).delete().eq('id', c.id);
    await logAudit(leadId, `📋 Removed pre-approval condition: ${c.label}`, { isPreview: isPreviewLead });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (isPreviewLead) { toast.info('Upload disabled in preview mode'); return; }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${leadId}/pre-approval/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from('client-documents').upload(path, file, { upsert: true });
        if (upErr) { toast.error(`Upload failed: ${upErr.message}`); continue; }
        const { error: insErr } = await supabase.from('lead_pre_approval_documents' as any).insert({
          lead_id: leadId, file_name: file.name, file_path: path, file_size: file.size,
        } as any);
        if (insErr) { toast.error(`Save failed: ${insErr.message}`); continue; }
        await logAudit(leadId, `📋 Uploaded pre-approval document: ${file.name}`, { isPreview: isPreviewLead });
      }
      await loadDocs();
      toast.success('Document(s) uploaded');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadDoc = async (d: PreApprovalDoc) => {
    const { data, error } = await supabase.storage.from('client-documents').createSignedUrl(d.file_path, 60);
    if (error || !data) { toast.error('Could not generate link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const deleteDoc = async (d: PreApprovalDoc) => {
    setDocs(prev => prev.filter(x => x.id !== d.id));
    if (isPreviewLead) return;
    await supabase.storage.from('client-documents').remove([d.file_path]);
    await supabase.from('lead_pre_approval_documents' as any).delete().eq('id', d.id);
    await logAudit(leadId, `📋 Removed pre-approval document: ${d.file_name}`, { isPreview: isPreviewLead });
  };

  const completedCount = conditions.filter(c => c.completed).length;

  return (
    <div className={cardClasses}>
      <div className={headerClasses}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={iconBg}><FileCheck className="w-4 h-4" /></div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground leading-tight">Pre-Approval</h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {expiryObj ? (
                tone === 'past' ? <span className="text-destructive font-semibold">Expired {Math.abs(daysToExpiry!)} day{Math.abs(daysToExpiry!) === 1 ? '' : 's'} ago</span> :
                <span>{daysToExpiry} day{daysToExpiry === 1 ? '' : 's'} until expiry · {format(expiryObj, 'dd MMM yyyy')}</span>
              ) : 'No expiry date set'}
              {conditions.length > 0 && <span> · {completedCount}/{conditions.length} conditions met</span>}
              {docs.length > 0 && <span> · {docs.length} doc{docs.length === 1 ? '' : 's'}</span>}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? <><ChevronDown className="w-4 h-4" /> Expand</> : <><ChevronUp className="w-4 h-4" /> Collapse</>}
        </Button>
      </div>

      {!collapsed && <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Purchase Price</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input className="pl-6 h-9" value={pp}
                onChange={e => setPp(fmtMoney(parseMoney(e.target.value)))}
                onBlur={e => saveMoney('pre_approval_purchase_price', e.target.value, 'purchase price', purchasePrice)}
                placeholder="0" inputMode="numeric" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Loan Amount</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input className="pl-6 h-9" value={la}
                onChange={e => setLa(fmtMoney(parseMoney(e.target.value)))}
                onBlur={e => saveMoney('pre_approval_loan_amount', e.target.value, 'loan amount', loanAmount)}
                placeholder="0" inputMode="numeric" />
            </div>
          </div>
          <div>
            <Label className="text-xs">LVR</Label>
            <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted/30 text-sm font-medium">
              {lvr === null ? '—' : `${lvr.toFixed(2)}%`}
            </div>
          </div>
          <div>
            <Label className="text-xs">Funds to Complete (FTC)</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input className="pl-6 h-9" value={ftcStr}
                onChange={e => setFtcStr(fmtMoney(parseMoney(e.target.value)))}
                onBlur={e => saveMoney('pre_approval_ftc', e.target.value, 'FTC', ftc)}
                placeholder="0" inputMode="numeric" />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-xs flex items-center gap-1.5 mb-1">
            <CalendarIcon className="w-3 h-3" /> Pre-Approval Expiry
          </Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-9', !expiryObj && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiryObj ? format(expiryObj, 'PPP') : <span>Pick an expiry date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100]" align="start">
              <Calendar mode="single" selected={expiryObj || undefined} onSelect={saveExpiry}
                initialFocus className={cn('p-3 pointer-events-auto')} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="rounded-md border border-border bg-background/60 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" /> Conditions ({completedCount}/{conditions.length})
            </div>
          </div>
          {conditions.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No conditions added yet.</p>
          )}
          <div className="space-y-1.5">
            {conditions.map(c => (
              <div key={c.id} className="flex items-center gap-2 group">
                <Checkbox checked={c.completed} onCheckedChange={() => toggleCondition(c)} />
                <span className={cn('text-sm flex-1', c.completed && 'line-through text-muted-foreground')}>{c.label}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteCondition(c)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Input value={newCondition} onChange={e => setNewCondition(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCondition(); } }}
              placeholder="Add a condition (e.g. Valuation acceptable to lender)" className="h-9" />
            <Button onClick={addCondition} size="sm" className="gap-1 h-9">
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-background/60 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Documents ({docs.length})
            </div>
            <Button variant="outline" size="sm" className="h-7 gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Upload'}
            </Button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
          </div>
          {docs.length === 0 && <p className="text-xs text-muted-foreground italic">No documents uploaded yet.</p>}
          <div className="space-y-1.5">
            {docs.map(d => (
              <div key={d.id} className="flex items-center gap-2 group rounded border border-border/60 bg-background px-2 py-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{d.file_name}</span>
                {d.file_size != null && <span className="text-[10px] text-muted-foreground">{(d.file_size / 1024).toFixed(0)} KB</span>}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => downloadDoc(d)}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteDoc(d)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>}
    </div>
  );
}