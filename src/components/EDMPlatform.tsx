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
import { Plus, Send, Eye, Mail, Users, Trash2 } from 'lucide-react';

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

  const load = async () => {
    setLoading(true);
    if (isPreviewMode) { setCampaigns([]); setLoading(false); return; }
    const { data } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold">Email Campaigns</h2>
          <p className="text-xs text-muted-foreground">Send broadcasts to tagged audiences (Investors, Home Owners).</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setComposerOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : campaigns.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No campaigns yet. Tag your contacts as Investor or Home Owner, then create your first broadcast.
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-primary/5" onClick={() => { setEditing(c); setComposerOpen(true); }}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs">
                    {(c.audience_tags || []).map(t => (
                      <Badge key={t} variant="secondary" className="mr-1">{AUDIENCE_TAGS.find(a => a.value === t)?.label || t}</Badge>
                    ))}
                    {(!c.audience_tags || c.audience_tags.length === 0) && <span className="text-muted-foreground">All</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'sent' ? 'default' : c.status === 'failed' ? 'destructive' : 'outline'}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {c.status === 'sent' ? `${c.sent_count}/${c.total_recipients}` : '—'}
                    {c.failed_count > 0 && <span className="text-destructive ml-1">({c.failed_count} failed)</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.sent_at ? format(new Date(c.sent_at), 'dd MMM yyyy HH:mm') : format(new Date(c.created_at), 'dd MMM yyyy')}
                  </TableCell>
                </TableRow>
              ))}
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
    </div>
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
  const [sources, setSources] = useState<string[]>(['contacts', 'partners']);
  const [tags, setTags] = useState<string[]>([]);
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
      setTags(campaign?.audience_tags || []);
      setAudienceCount(null);
    }
  }, [open, campaign]);

  const toggleSource = (s: string) =>
    setSources(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleTag = (t: string) =>
    setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const previewAudience = async () => {
    setPreviewing(true);
    const { data, error } = await supabase.functions.invoke('send-edm', {
      body: { action: 'preview_audience', sources, tags },
    });
    setPreviewing(false);
    if (error) { toast.error('Failed to preview audience'); return; }
    setAudienceCount(data?.count ?? 0);
  };

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
            <p className="text-xs text-muted-foreground">Note: until you verify your own domain, use <code>onboarding@resend.dev</code>.</p>
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
            </div>
            <div>
              <Label className="mb-2 block">Filter by tag (leave empty to send to all in pool)</Label>
              <div className="flex gap-2 flex-wrap">
                {AUDIENCE_TAGS.map(t => (
                  <button key={t.value} type="button" disabled={isReadonly}
                    onClick={() => toggleTag(t.value)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${tags.includes(t.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={previewAudience} disabled={previewing || isPreviewMode}>
                <Users className="w-4 h-4 mr-2" /> {previewing ? 'Counting...' : 'Preview audience'}
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