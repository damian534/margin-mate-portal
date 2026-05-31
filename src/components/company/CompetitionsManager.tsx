import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Plus, Calendar, DollarSign, Pencil, Trash2, Medal, EyeOff, Eye, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isWithinInterval, differenceInCalendarDays } from 'date-fns';

interface Competition {
  id: string;
  broker_id: string;
  company_id: string;
  name: string;
  prize: string;
  prize_amount: number | null;
  metric: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description: string | null;
}

interface Lead {
  id: string;
  referral_partner_id: string | null;
  loan_amount: number | null;
  status: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  excluded_from_competition?: boolean | null;
}

interface Agent {
  id: string;
  user_id: string | null;
  full_name: string | null;
}

interface Props {
  companyId: string;
  companyName: string;
  leads: Lead[];
  agents: Agent[];
  isPreviewMode?: boolean;
  onLeadsChanged?: () => void;
}

const METRIC_LABELS: Record<string, string> = {
  referrals: 'Total Referrals',
  settled: 'Settled Deals',
  loan_volume: 'Loan Volume Settled',
};

const emptyForm = {
  name: '',
  prize: '',
  prize_amount: '',
  metric: 'referrals',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'),
  description: '',
  is_active: true,
};

export function CompetitionsManager({ companyId, companyName, leads, agents, isPreviewMode, onLeadsChanged }: Props) {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [manageCompId, setManageCompId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = async () => {
    if (isPreviewMode) { setCompetitions([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('competitions')
      .select('*')
      .eq('company_id', companyId)
      .order('start_date', { ascending: false });
    if (error) { console.error(error); toast.error('Failed to load competitions'); }
    setCompetitions((data as Competition[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Competition) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      prize: c.prize,
      prize_amount: c.prize_amount?.toString() ?? '',
      metric: c.metric,
      start_date: c.start_date,
      end_date: c.end_date,
      description: c.description ?? '',
      is_active: c.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!user?.id) return;
    if (!form.name.trim() || !form.prize.trim()) { toast.error('Name and prize are required'); return; }
    if (form.end_date < form.start_date) { toast.error('End date must be after start date'); return; }
    if (isPreviewMode) { toast.success('Saved (preview)'); setDialogOpen(false); return; }

    setSaving(true);
    const payload: any = {
      broker_id: user.id,
      company_id: companyId,
      name: form.name.trim(),
      prize: form.prize.trim(),
      prize_amount: form.prize_amount ? Number(form.prize_amount) : null,
      metric: form.metric,
      start_date: form.start_date,
      end_date: form.end_date,
      description: form.description.trim() || null,
      is_active: form.is_active,
      created_by: user.id,
    };

    let error;
    if (editingId) {
      ({ error } = await (supabase as any).from('competitions').update(payload).eq('id', editingId));
    } else {
      ({ error } = await (supabase as any).from('competitions').insert(payload));
    }
    setSaving(false);
    if (error) { console.error(error); toast.error('Failed to save competition'); return; }
    toast.success(editingId ? 'Competition updated' : 'Competition created');
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this competition?')) return;
    if (isPreviewMode) { toast.success('Deleted (preview)'); return; }
    const { error } = await (supabase as any).from('competitions').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Competition deleted');
    load();
  };

  const computeStandings = (c: Competition) => {
    const start = parseISO(c.start_date);
    const end = parseISO(c.end_date);
    end.setHours(23, 59, 59);
    const agentIds = new Set(agents.filter(a => a.user_id).map(a => a.user_id!));
    const inWindow = leads.filter(l =>
      l.referral_partner_id &&
      agentIds.has(l.referral_partner_id) &&
      !l.excluded_from_competition &&
      isWithinInterval(new Date(l.created_at), { start, end })
    );
    const byAgent: Record<string, { leads: number; settled: number; volume: number }> = {};
    inWindow.forEach(l => {
      const a = byAgent[l.referral_partner_id!] || { leads: 0, settled: 0, volume: 0 };
      a.leads += 1;
      if (l.status === 'settled') { a.settled += 1; a.volume += l.loan_amount || 0; }
      byAgent[l.referral_partner_id!] = a;
    });
    return agents
      .filter(a => a.user_id)
      .map(a => {
        const stats = byAgent[a.user_id!] || { leads: 0, settled: 0, volume: 0 };
        const score = c.metric === 'settled' ? stats.settled : c.metric === 'loan_volume' ? stats.volume : stats.leads;
        return { id: a.id, name: a.full_name || 'Unnamed', ...stats, score };
      })
      .sort((x, y) => y.score - x.score);
  };

  const leadsInWindow = (c: Competition) => {
    const start = parseISO(c.start_date);
    const end = parseISO(c.end_date);
    end.setHours(23, 59, 59);
    const agentIds = new Set(agents.filter(a => a.user_id).map(a => a.user_id!));
    const agentName = (uid: string | null) => agents.find(a => a.user_id === uid)?.full_name || 'Unknown';
    return leads
      .filter(l => l.referral_partner_id && agentIds.has(l.referral_partner_id) && isWithinInterval(new Date(l.created_at), { start, end }))
      .map(l => ({ ...l, agentName: agentName(l.referral_partner_id) }))
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  };

  const toggleExclude = async (leadId: string, exclude: boolean) => {
    if (isPreviewMode) { toast.success(exclude ? 'Excluded (preview)' : 'Included (preview)'); return; }
    setTogglingId(leadId);
    const { error } = await supabase.from('leads').update({ excluded_from_competition: exclude }).eq('id', leadId);
    setTogglingId(null);
    if (error) { toast.error('Failed to update lead'); return; }
    toast.success(exclude ? 'Lead excluded from competition' : 'Lead included again');
    onLeadsChanged?.();
  };

  const today = new Date();
  const manageComp = competitions.find(c => c.id === manageCompId) || null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Competitions
          </h3>
          <p className="text-sm text-muted-foreground">Run referral contests for {companyName}. Active competitions show on agents' dashboards.</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1.5" /> New Competition</Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : competitions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No competitions yet. Click <span className="font-medium">New Competition</span> to launch one.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {competitions.map(c => {
            const start = parseISO(c.start_date);
            const end = parseISO(c.end_date);
            const isLive = c.is_active && today >= start && today <= end;
            const isUpcoming = c.is_active && today < start;
            const isEnded = today > end;
            const daysLeft = isLive ? differenceInCalendarDays(end, today) : null;
            const standings = computeStandings(c).slice(0, 5);

            return (
              <Card key={c.id} className={isLive ? 'border-amber-400/60 shadow-sm' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        {isLive && <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1"><Trophy className="w-3 h-3" /> Live</Badge>}
                        {isUpcoming && <Badge variant="secondary">Upcoming</Badge>}
                        {isEnded && <Badge variant="outline">Ended</Badge>}
                        {!c.is_active && <Badge variant="outline">Paused</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{c.prize}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(start, 'd MMM')} – {format(end, 'd MMM yyyy')}</span>
                        <span>Metric: <span className="font-medium">{METRIC_LABELS[c.metric]}</span></span>
                        {daysLeft !== null && <span className="font-medium text-amber-600">{daysLeft} day{daysLeft === 1 ? '' : 's'} left</span>}
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground pt-1">{c.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => setManageCompId(c.id)} title="Manage entries"><ListChecks className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {standings.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No agents yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Agent</TableHead>
                          <TableHead className="text-right">{METRIC_LABELS[c.metric]}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {standings.map((s, i) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-bold text-muted-foreground">
                              {i === 0 ? <Medal className="w-4 h-4 text-amber-500" /> : i + 1}
                            </TableCell>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell className="text-right font-heading font-bold">
                              {c.metric === 'loan_volume' ? `$${s.score.toLocaleString()}` : s.score}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Competition' : 'New Competition'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="June Referral Challenge" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prize</Label>
                <Input value={form.prize} onChange={e => setForm({ ...form, prize: e.target.value })} placeholder="$1,000 cash" />
              </div>
              <div>
                <Label>Prize Value (AUD)</Label>
                <Input type="number" value={form.prize_amount} onChange={e => setForm({ ...form, prize_amount: e.target.value })} placeholder="1000" />
              </div>
            </div>
            <div>
              <Label>Win by</Label>
              <Select value={form.metric} onValueChange={v => setForm({ ...form, metric: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="referrals">Most Referrals Submitted</SelectItem>
                  <SelectItem value="settled">Most Settled Deals</SelectItem>
                  <SelectItem value="loan_volume">Highest Loan Volume Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Rules, bonus multipliers, etc." rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input id="active" type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
              <Label htmlFor="active" className="cursor-pointer">Active (visible to agents)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save' : 'Launch Competition'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manageCompId} onOpenChange={(o) => !o && setManageCompId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Entries · {manageComp?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Exclude leads that don't meet the minimum (e.g. you couldn't make contact). Excluded leads won't count toward the leaderboard.
          </p>
          <div className="max-h-[60vh] overflow-y-auto border rounded-md">
            {manageComp && leadsInWindow(manageComp).length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No leads in this competition window yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Counts?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manageComp && leadsInWindow(manageComp).map(l => {
                    const excluded = !!l.excluded_from_competition;
                    return (
                      <TableRow key={l.id} className={excluded ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">{l.first_name} {l.last_name}</TableCell>
                        <TableCell className="text-sm">{l.agentName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(l.created_at), 'd MMM')}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={excluded ? 'outline' : 'ghost'}
                            disabled={togglingId === l.id}
                            onClick={() => toggleExclude(l.id, !excluded)}
                          >
                            {excluded ? (<><Eye className="w-3.5 h-3.5 mr-1" /> Include</>) : (<><EyeOff className="w-3.5 h-3.5 mr-1" /> Exclude</>)}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageCompId(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}