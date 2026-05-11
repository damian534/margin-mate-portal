import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Send, Mail, Users, Trash2, Settings, ShieldOff } from 'lucide-react';
import { CampaignAnalytics } from './CampaignAnalytics';
import { Switch } from '@/components/ui/switch';

export const AUDIENCE_TAGS = [
  { value: 'investor', label: 'Investor' },
  { value: 'home_owner', label: 'Home Owner' },
];

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  from_name: string | null;
  from_email: string | null;
  audience_sources: string[];
  audience_tags: string[];
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
}

export function EDMPlatform({ isPreviewMode }: { isPreviewMode: boolean }) {
  const { effectiveBrokerId } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsCampaign, setAnalyticsCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<Record<string, { opens: number; clicks: number; bounces: number; unsubs: number }>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [suppressionsOpen, setSuppressionsOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    if (isPreviewMode) { setCampaigns([]); setLoading(false); return; }
    const { data } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
    const list = (data || []) as any as Campaign[];
    setCampaigns(list);
    // Load aggregate event counts per campaign in one query
    if (list.length > 0) {
      const ids = list.map(c => c.id);
      const { data: ev } = await supabase
        .from('email_events')
        .select('campaign_id, event_type, recipient_email')
        .in('campaign_id', ids)
        .range(0, 49999);
      const agg: Record<string, { opens: Set<string>; clicks: Set<string>; bounces: Set<string>; unsubs: Set<string> }> = {};
      (ev || []).forEach((e: any) => {
        if (!agg[e.campaign_id]) agg[e.campaign_id] = { opens: new Set(), clicks: new Set(), bounces: new Set(), unsubs: new Set() };
        const a = agg[e.campaign_id];
        const k = (e.recipient_email || '').toLowerCase();
        if (e.event_type === 'opened') a.opens.add(k);
        if (e.event_type === 'clicked') a.clicks.add(k);
        if (e.event_type === 'bounced') a.bounces.add(k);
        if (e.event_type === 'unsubscribed') a.unsubs.add(k);
      });
      const out: Record<string, { opens: number; clicks: number; bounces: number; unsubs: number }> = {};
      Object.entries(agg).forEach(([cid, v]) => {
        out[cid] = { opens: v.opens.size, clicks: v.clicks.size, bounces: v.bounces.size, unsubs: v.unsubs.size };
      });
      setStats(out);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCampaign = (c: Campaign) => {
    if (c.status === 'sent') {
      setAnalyticsCampaign(c);
      setAnalyticsOpen(true);
    } else {
      setEditing(c);
      setComposerOpen(true);
    }
  };

  const pct = (n: number, d: number) => d ? `${((n / d) * 100).toFixed(0)}%` : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold">Email Campaigns</h2>
          <p className="text-xs text-muted-foreground">Broadcasts go to all your contacts and referral partners (excluding anyone opted out).</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setSuppressionsOpen(true)}>
            <ShieldOff className="w-4 h-4 mr-2" /> Suppressions
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings className="w-4 h-4 mr-2" /> Settings
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setComposerOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Campaign
          </Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : campaigns.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No campaigns yet. Create your first broadcast to email your contacts and partners.
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead className="text-right">Opens</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Bounces</TableHead>
                <TableHead className="text-right">Unsubs</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map(c => {
                const s = stats[c.id] || { opens: 0, clicks: 0, bounces: 0, unsubs: 0 };
                const sentTotal = c.sent_count || 0;
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-primary/5" onClick={() => openCampaign(c)}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-xs">{c.subject}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'sent' ? 'default' : c.status === 'failed' ? 'destructive' : 'outline'}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {c.status === 'sent' ? `${c.sent_count}/${c.total_recipients}` : '—'}
                      {c.failed_count > 0 && <span className="text-destructive ml-1">({c.failed_count} failed)</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.status === 'sent' ? <span><span className="font-medium">{s.opens}</span> <span className="text-xs text-muted-foreground">{pct(s.opens, sentTotal)}</span></span> : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {c.status === 'sent' ? <span><span className="font-medium">{s.clicks}</span> <span className="text-xs text-muted-foreground">{pct(s.clicks, sentTotal)}</span></span> : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-red-600">{c.status === 'sent' ? s.bounces : '—'}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-amber-600">{c.status === 'sent' ? s.unsubs : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.sent_at ? format(new Date(c.sent_at), 'dd MMM yyyy HH:mm') : format(new Date(c.created_at), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      <CampaignComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        campaign={editing}
        brokerId={effectiveBrokerId}
        isPreviewMode={isPreviewMode}
        onSaved={load}
      />
      <CampaignAnalytics
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        campaign={analyticsCampaign as any}
      />
      <EmailSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} brokerId={effectiveBrokerId} />
      <SuppressionsDialog open={suppressionsOpen} onOpenChange={setSuppressionsOpen} brokerId={effectiveBrokerId} />
    </div>
  );
}

function EmailSettingsDialog({ open, onOpenChange, brokerId }: { open: boolean; onOpenChange: (v: boolean) => void; brokerId: string | null }) {
  const [autoSuppress, setAutoSuppress] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !brokerId) return;
    supabase.from('broker_email_settings').select('auto_suppress_bounces').eq('broker_id', brokerId).maybeSingle()
      .then(({ data }) => setAutoSuppress(data?.auto_suppress_bounces ?? true));
  }, [open, brokerId]);

  const save = async (next: boolean) => {
    if (!brokerId) return;
    setAutoSuppress(next);
    setLoading(true);
    const { data: existing } = await supabase.from('broker_email_settings').select('broker_id').eq('broker_id', brokerId).maybeSingle();
    if (existing) {
      await supabase.from('broker_email_settings').update({ auto_suppress_bounces: next }).eq('broker_id', brokerId);
    } else {
      await supabase.from('broker_email_settings').insert({ broker_id: brokerId, auto_suppress_bounces: next } as any);
    }
    setLoading(false);
    toast.success('Settings saved');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Email settings</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label>Auto-suppress bounces, complaints &amp; unsubscribes</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When on, addresses that bounce, mark you as spam, or unsubscribe are automatically excluded from future campaigns. Turn off if you want to manage suppressions manually.
              </p>
            </div>
            <Switch checked={autoSuppress} onCheckedChange={save} disabled={loading} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuppressionsDialog({ open, onOpenChange, brokerId }: { open: boolean; onOpenChange: (v: boolean) => void; brokerId: string | null }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    if (!brokerId) return;
    setLoading(true);
    supabase.from('email_suppressions').select('*').eq('broker_id', brokerId).order('created_at', { ascending: false }).range(0, 999)
      .then(({ data }) => { setItems(data || []); setLoading(false); });
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, brokerId]);

  const remove = async (id: string) => {
    await supabase.from('email_suppressions').delete().eq('id', id);
    toast.success('Removed from suppression list');
    load();
  };

  const filtered = items.filter(i => !search || i.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suppression list ({items.length})</DialogTitle>
          <p className="text-xs text-muted-foreground">These addresses are skipped on every campaign send.</p>
        </DialogHeader>
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="mb-3" />
        {loading ? <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
          : filtered.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No suppressed addresses.</p>
          : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Added</TableHead>
                <TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{s.email}</TableCell>
                    <TableCell><Badge variant="outline">{s.reason}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-3 h-3" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        }
      </DialogContent>
    </Dialog>
  );
}

function CampaignComposer({ open, onOpenChange, campaign, brokerId, isPreviewMode, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; campaign: Campaign | null;
  brokerId: string | null; isPreviewMode: boolean; onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromName, setFromName] = useState('Margin Connect');
  const [fromEmail, setFromEmail] = useState('onboarding@resend.dev');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [sources, setSources] = useState<string[]>(['contacts', 'partners']);
  const tags: string[] = [];
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const isReadonly = campaign?.status === 'sent' || campaign?.status === 'sending';

  useEffect(() => {
    if (open) {
      setName(campaign?.name || '');
      setSubject(campaign?.subject || '');
      setBody(campaign?.body_html || '');
      setFromName(campaign?.from_name || 'Margin Connect');
      setFromEmail(campaign?.from_email || 'onboarding@resend.dev');
      setSources(campaign?.audience_sources || ['contacts', 'partners']);
      setAudienceCount(null);
      // Default test address to the logged-in user's email
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) setTestEmail(prev => prev || data.user!.email!);
      });
    }
  }, [open, campaign]);

  const toggleSource = (s: string) =>
    setSources(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const previewAudience = async () => {
    setPreviewing(true);
    const { data, error } = await supabase.functions.invoke('send-edm', {
      body: { action: 'preview_audience', sources, tags },
    });
    setPreviewing(false);
    if (error) { toast.error('Failed to preview audience'); return; }
    setAudienceCount(data?.count ?? 0);
  };

  // Auto-preview when audience tab opens or sources change
  useEffect(() => {
    if (open && !isPreviewMode) previewAudience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sources.join(',')]);

  const save = async (): Promise<string | null> => {
    if (!name.trim() || !subject.trim()) { toast.error('Name and subject required'); return null; }
    setSaving(true);
    const payload = {
      name: name.trim(), subject: subject.trim(), body_html: body,
      from_name: fromName, from_email: fromEmail,
      audience_sources: sources, audience_tags: tags,
    };
    let id = campaign?.id || null;
    if (id) {
      const { error } = await supabase.from('email_campaigns').update(payload).eq('id', id);
      if (error) { toast.error('Failed to save'); setSaving(false); return null; }
    } else {
      const { data, error } = await supabase.from('email_campaigns').insert({
        ...payload, broker_id: brokerId, created_by: brokerId,
      } as any).select('id').single();
      if (error || !data) { toast.error('Failed to create'); setSaving(false); return null; }
      id = data.id;
    }
    setSaving(false);
    toast.success('Saved');
    onSaved();
    return id;
  };

  const send = async () => {
    if (isPreviewMode) { toast.info('Sending disabled in preview'); return; }
    if (!confirm('Send this campaign now? This cannot be undone.')) return;
    const id = await save();
    if (!id) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-edm', {
      body: { action: 'send', campaign_id: id },
    });
    setSending(false);
    if (error || data?.error) { toast.error(data?.error || 'Send failed'); onSaved(); return; }
    toast.success(`Sent to ${data.sent} of ${data.total}` + (data.failed ? ` (${data.failed} failed)` : ''));
    onSaved();
    onOpenChange(false);
  };

  const remove = async () => {
    if (!campaign) return;
    if (!confirm('Delete this campaign?')) return;
    const { error } = await supabase.from('email_campaigns').delete().eq('id', campaign.id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign ? (isReadonly ? 'Campaign details' : 'Edit campaign') : 'New campaign'}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-3 mt-4">
            <div><Label>Internal name</Label><Input value={name} onChange={e => setName(e.target.value)} disabled={isReadonly} placeholder="e.g. May market update" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From name</Label><Input value={fromName} onChange={e => setFromName(e.target.value)} disabled={isReadonly} /></div>
              <div><Label>From email</Label><Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} disabled={isReadonly} /></div>
            </div>
            <p className="text-xs text-muted-foreground">
              To send from <strong>your own address</strong> (e.g. <code>damian@margin.com.au</code>),
              your domain must first be verified in Resend. Until then the safest default is <code>onboarding@resend.dev</code>.
            </p>
            <div><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} disabled={isReadonly} placeholder="Hi {{first_name}}, your monthly update" /></div>
            <div>
              <Label>Body (HTML allowed)</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} rows={14} disabled={isReadonly}
                placeholder={'<p>Hi {{first_name}},</p>\n<p>Hope you\'re well...</p>'} className="font-mono text-sm" />
            </div>
            <p className="text-xs text-muted-foreground">Merge tags: <code>{'{{first_name}}'}</code>, <code>{'{{last_name}}'}</code>, <code>{'{{full_name}}'}</code>, <code>{'{{email}}'}</code></p>
          </TabsContent>

          <TabsContent value="audience" className="space-y-4 mt-4">
            <div>
              <Label className="mb-2 block">Recipient pool</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={sources.includes('contacts')} onCheckedChange={() => toggleSource('contacts')} disabled={isReadonly} /> Contacts (clients)</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={sources.includes('partners')} onCheckedChange={() => toggleSource('partners')} disabled={isReadonly} /> Referral partners</label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sends to everyone in the selected pool with an email address, except contacts marked as opted out.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={previewAudience} disabled={previewing || isPreviewMode}>
                <Users className="w-4 h-4 mr-2" /> {previewing ? 'Counting...' : 'Refresh count'}
              </Button>
              {audienceCount !== null && <span className="text-sm font-medium">{audienceCount} recipients</span>}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="border rounded-md p-4 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Subject preview:</p>
              <p className="font-medium mb-4">{subject.replace(/\{\{first_name\}\}/g, 'John').replace(/\{\{last_name\}\}/g, 'Smith').replace(/\{\{full_name\}\}/g, 'John Smith').replace(/\{\{email\}\}/g, 'john@example.com') || <em className="text-muted-foreground">No subject</em>}</p>
              <div className="border-t pt-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{
                __html: body.replace(/\{\{first_name\}\}/g, 'John').replace(/\{\{last_name\}\}/g, 'Smith').replace(/\{\{full_name\}\}/g, 'John Smith').replace(/\{\{email\}\}/g, 'john@example.com') || '<em style="color:#888">No body</em>',
              }} />
            </div>
            <div className="mt-4 p-3 border rounded-md bg-background">
              <Label className="text-sm">Send a test to your inbox</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  disabled={sendingTest || !testEmail.trim() || !subject.trim() || !body.trim() || isPreviewMode}
                  onClick={async () => {
                    setSendingTest(true);
                    const { data, error } = await supabase.functions.invoke('send-edm', {
                      body: {
                        action: 'send_test',
                        test_email: testEmail.trim(),
                        subject, body_html: body,
                        from_name: fromName, from_email: fromEmail,
                      },
                    });
                    setSendingTest(false);
                    if (error || data?.error) { toast.error(data?.error || 'Test send failed'); return; }
                    toast.success(`Test sent to ${testEmail}`);
                  }}
                >
                  <Send className="w-4 h-4 mr-2" /> {sendingTest ? 'Sending...' : 'Send test'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Test emails use sample merge values (John Smith) and are prefixed with <code>[TEST]</code>.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {campaign && !isReadonly && (
              <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            {!isReadonly && (
              <>
                <Button variant="outline" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save draft'}</Button>
                <Button onClick={send} disabled={sending || saving || isPreviewMode}>
                  <Send className="w-4 h-4 mr-2" /> {sending ? 'Sending...' : 'Send now'}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}