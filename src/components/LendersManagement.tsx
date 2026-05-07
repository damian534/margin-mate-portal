import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Plus, Trash2, Building2, Search, CheckCircle2, Circle, Mail, Phone,
  KeyRound, User, FileText, Eye, EyeOff, Copy
} from 'lucide-react';

interface Lender {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  is_accredited: boolean;
  broker_code: string | null;
  login_id: string | null;
  login_password: string | null;
  deals_in_progress: string | null;
  bdm_name: string | null;
  bdm_phone: string | null;
  bdm_email: string | null;
  supporting_docs_email: string | null;
  discharge_email: string | null;
  app_pack_esign: string | null;
  mortgage_docs_esign: string | null;
  fastrefi_eligibility: string | null;
  settlement_conditions: string | null;
  progress_payments: string | null;
  notes: string | null;
}

const FIELD_GROUPS: { title: string; icon: any; fields: { key: keyof Lender; label: string; multi?: boolean; type?: string }[] }[] = [
  {
    title: 'Login Credentials', icon: KeyRound, fields: [
      { key: 'broker_code', label: 'Broker Code' },
      { key: 'login_id', label: 'Login ID' },
      { key: 'login_password', label: 'Login Password', type: 'password' },
      { key: 'deals_in_progress', label: 'Deals in Progress (phone/contact)' },
    ],
  },
  {
    title: 'BDM Contact', icon: User, fields: [
      { key: 'bdm_name', label: 'BDM Name' },
      { key: 'bdm_phone', label: 'BDM Phone' },
      { key: 'bdm_email', label: 'BDM Email' },
    ],
  },
  {
    title: 'Workflow Emails', icon: Mail, fields: [
      { key: 'supporting_docs_email', label: 'Supporting Documents Email' },
      { key: 'discharge_email', label: 'Discharge Email' },
    ],
  },
  {
    title: 'Eligibility & Settlement', icon: FileText, fields: [
      { key: 'app_pack_esign', label: 'Application Pack eSign Eligibility' },
      { key: 'mortgage_docs_esign', label: 'Mortgage Documents eSign Eligibility' },
      { key: 'fastrefi_eligibility', label: 'FastRefi Eligibility' },
      { key: 'settlement_conditions', label: 'Settlement Conditions', multi: true },
      { key: 'progress_payments', label: 'Progress Payments', multi: true },
      { key: 'notes', label: 'Notes', multi: true },
    ],
  },
];

function PasswordField({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-mono">{show ? value : '•'.repeat(Math.min(value.length, 12))}</span>
      <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShow(s => !s)}>
        {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-6 w-6 p-0"
        onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied'); }}>
        <Copy className="w-3 h-3" />
      </Button>
    </div>
  );
}

export function LendersManagement() {
  const { effectiveBrokerId } = useAuth();
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAccredited, setFilterAccredited] = useState<'all' | 'accredited'>('accredited');
  const [selected, setSelected] = useState<Lender | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => { fetchLenders(); }, [effectiveBrokerId]);

  const fetchLenders = async () => {
    setLoading(true);
    const query = supabase.from('lenders').select('*').order('name');
    if (effectiveBrokerId) query.eq('broker_id', effectiveBrokerId);
    const { data, error } = await query;
    if (error) toast.error('Failed to load lenders');
    setLenders((data as Lender[]) || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return lenders.filter(l => {
      if (filterAccredited === 'accredited' && !l.is_accredited) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [lenders, search, filterAccredited]);

  const stats = useMemo(() => ({
    total: lenders.length,
    accredited: lenders.filter(l => l.is_accredited).length,
  }), [lenders]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || !effectiveBrokerId) return;
    const { data, error } = await supabase.from('lenders').insert({
      name, display_order: lenders.length, broker_id: effectiveBrokerId, is_accredited: true,
    } as any).select().single();
    if (error) { toast.error(error.message || 'Failed to add lender'); return; }
    toast.success('Lender added');
    setNewName(''); setAddOpen(false);
    fetchLenders();
    setSelected(data as Lender);
  };

  const updateLender = async (id: string, patch: Partial<Lender>) => {
    setLenders(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
    if (selected?.id === id) setSelected(s => s ? { ...s, ...patch } : s);
    const { error } = await supabase.from('lenders').update(patch as any).eq('id', id);
    if (error) toast.error('Failed to save');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from your accreditations?`)) return;
    const { error } = await supabase.from('lenders').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success(`"${name}" removed`);
    setSelected(null);
    fetchLenders();
  };

  return (
    <div className="space-y-4">
      {/* Header / stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Lender Accreditation</h2>
            <p className="text-xs text-muted-foreground">
              {stats.accredited} accredited of {stats.total} lenders
            </p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Lender
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lenders…" className="pl-9 h-9" />
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1 bg-card">
          {[
            { v: 'accredited', l: 'Accredited' }, { v: 'all', l: 'All' },
          ].map(opt => (
            <button key={opt.v} onClick={() => setFilterAccredited(opt.v as any)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filterAccredited === opt.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((l) => (
            <Card key={l.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(l)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {l.is_accredited
                      ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <h3 className="font-semibold text-sm truncate">{l.name}</h3>
                  </div>
                  {l.broker_code && (
                    <Badge variant="outline" className="text-[10px] shrink-0">{l.broker_code}</Badge>
                  )}
                </div>
                {l.bdm_name && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1.5 truncate"><User className="w-3 h-3 shrink-0" />{l.bdm_name}</div>
                    {l.bdm_phone && <div className="flex items-center gap-1.5 truncate"><Phone className="w-3 h-3 shrink-0" />{l.bdm_phone}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-8">No lenders match your filter.</p>
          )}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <Input
                    className="text-xl font-bold border-0 px-0 h-auto focus-visible:ring-0"
                    value={selected.name}
                    onChange={(e) => updateLender(selected.id, { name: e.target.value })}
                  />
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">Accredited</p>
                    <p className="text-xs text-muted-foreground">Mark off lenders you can submit deals to.</p>
                  </div>
                  <Switch checked={selected.is_accredited}
                    onCheckedChange={(v) => updateLender(selected.id, { is_accredited: v })} />
                </div>

                {FIELD_GROUPS.map(group => (
                  <div key={group.title} className="space-y-2">
                    <div className="flex items-center gap-2 pb-1 border-b border-border">
                      <group.icon className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-semibold">{group.title}</h4>
                    </div>
                    {group.fields.map(f => {
                      const val = (selected[f.key] ?? '') as string;
                      return (
                        <div key={f.key as string} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{f.label}</Label>
                          {f.type === 'password' && val ? (
                            <div className="flex items-center gap-2">
                              <PasswordField value={val} />
                              <Input className="h-8 text-sm flex-1"
                                value={val}
                                onChange={(e) => updateLender(selected.id, { [f.key]: e.target.value || null } as any)} />
                            </div>
                          ) : f.multi ? (
                            <Textarea rows={2} className="text-sm"
                              value={val}
                              onChange={(e) => updateLender(selected.id, { [f.key]: e.target.value || null } as any)} />
                          ) : (
                            <Input className="h-8 text-sm"
                              value={val}
                              onChange={(e) => updateLender(selected.id, { [f.key]: e.target.value || null } as any)} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                <div className="pt-4 border-t border-border">
                  <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(selected.id, selected.name)}>
                    <Trash2 className="w-4 h-4 mr-1.5" /> Remove Lender
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Lender</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-2">
            <Label className="text-xs">Lender Name</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Bendigo Bank" autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) handleAdd(); }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName.trim()}>Add & Edit Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
