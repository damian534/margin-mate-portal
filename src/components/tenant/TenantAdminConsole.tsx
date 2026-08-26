import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Layers, Plus, Copy, Pause, Play } from 'lucide-react';

export const BROKER_SEAT_PRICE = 299;
export const STAFF_SEAT_PRICE = 99;

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  custom_domain: string | null;
  owner_user_id: string | null;
  brokers: number;
  staff: number;
}

const statusTone: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  trialing: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
  past_due: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  suspended: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function TenantAdminConsole() {
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ invite_code: string; setup_link: string | null } | null>(null);
  const [form, setForm] = useState({ name: '', owner_name: '', owner_email: '', custom_domain: '' });

  const load = async () => {
    setLoading(true);
    const [{ data: tenants }, { data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('tenants').select('*').order('created_at'),
      supabase.from('profiles').select('user_id, tenant_id'),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    const roleByUser = new Map((roles ?? []).map(r => [r.user_id, r.role as string]));
    const counts = new Map<string, { brokers: number; staff: number }>();
    for (const p of profiles ?? []) {
      const tid = (p as any).tenant_id as string | null;
      if (!tid || !p.user_id) continue;
      const role = roleByUser.get(p.user_id);
      const c = counts.get(tid) ?? { brokers: 0, staff: 0 };
      if (role === 'broker' || role === 'super_admin') c.brokers += 1;
      else if (role === 'broker_staff') c.staff += 1;
      counts.set(tid, c);
    }

    setRows((tenants ?? []).map((t: any) => ({
      id: t.id, slug: t.slug, name: t.name, status: t.status,
      custom_domain: t.custom_domain, owner_user_id: t.owner_user_id,
      brokers: counts.get(t.id)?.brokers ?? 0,
      staff: counts.get(t.id)?.staff ?? 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const mrr = (r: TenantRow) => r.brokers * BROKER_SEAT_PRICE + r.staff * STAFF_SEAT_PRICE;
  const totalMrr = rows.filter(r => r.status !== 'suspended').reduce((s, r) => s + mrr(r), 0);

  const create = async () => {
    if (!form.name.trim() || !form.owner_email.trim()) {
      toast.error('Business name and owner email are required');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('provision-tenant', { body: form });
    setCreating(false);
    if (error) { toast.error('Could not create brokerage: ' + error.message); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    toast.success('Brokerage created');
    setResult({ invite_code: (data as any).invite_code, setup_link: (data as any).setup_link });
    setForm({ name: '', owner_name: '', owner_email: '', custom_domain: '' });
    load();
  };

  const toggleStatus = async (r: TenantRow) => {
    const next = r.status === 'suspended' ? 'active' : 'suspended';
    const { error } = await supabase.from('tenants').update({ status: next } as any).eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next === 'suspended' ? 'Brokerage suspended' : 'Brokerage reactivated');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Brokerages</h2>
          <Badge variant="outline">{rows.length}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Recurring revenue</div>
            <div className="text-lg font-semibold">${totalMrr.toLocaleString()}/mo</div>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New brokerage</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add a brokerage</DialogTitle></DialogHeader>
              {result ? (
                <div className="space-y-4 text-sm">
                  <p>Brokerage created and pre-loaded with your lender list, LMI matrix, document templates, task templates and milestone emails.</p>
                  <div className="space-y-1">
                    <Label>Team invite code</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={result.invite_code} />
                      <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(result.invite_code); toast.success('Copied'); }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {result.setup_link && (
                    <div className="space-y-1">
                      <Label>Owner password setup link</Label>
                      <div className="flex gap-2">
                        <Input readOnly value={result.setup_link} />
                        <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(result.setup_link!); toast.success('Copied'); }}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Send this to the owner so they can set their password.</p>
                    </div>
                  )}
                  <DialogFooter><Button onClick={() => { setResult(null); setOpen(false); }}>Done</Button></DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Business name</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Finance" />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner name</Label>
                    <Input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner email</Label>
                    <Input type="email" value={form.owner_email} onChange={e => setForm(f => ({ ...f, owner_email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Custom domain (optional)</Label>
                    <Input value={form.custom_domain} onChange={e => setForm(f => ({ ...f, custom_domain: e.target.value }))} placeholder="connect.acmefinance.com.au" />
                  </div>
                  <DialogFooter>
                    <Button onClick={create} disabled={creating}>{creating ? 'Creating…' : 'Create brokerage'}</Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Brokerage</th>
              <th className="text-left font-medium px-4 py-3">Domain</th>
              <th className="text-right font-medium px-4 py-3">Brokers</th>
              <th className="text-right font-medium px-4 py-3">Staff</th>
              <th className="text-right font-medium px-4 py-3">Monthly</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No brokerages yet.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.slug}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.custom_domain ?? '—'}</td>
                <td className="px-4 py-3 text-right">{r.brokers}</td>
                <td className="px-4 py-3 text-right">{r.staff}</td>
                <td className="px-4 py-3 text-right font-medium">${mrr(r).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs capitalize ${statusTone[r.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggleStatus(r)}>
                    {r.status === 'suspended'
                      ? <><Play className="w-4 h-4 mr-1" />Reactivate</>
                      : <><Pause className="w-4 h-4 mr-1" />Suspend</>}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Seats are counted from active users in each brokerage — ${BROKER_SEAT_PRICE}/broker and ${STAFF_SEAT_PRICE}/support staff per month.
      </p>
    </div>
  );
}
