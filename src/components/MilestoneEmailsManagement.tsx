import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, Save, Plus, Trash2, Paperclip, X, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export const DEFAULT_MILESTONES = [
  { key: 'lodged', label: 'Lodged' },
  { key: 'preapproved', label: 'Pre-Approved' },
  { key: 'conditional_approval', label: 'Conditional Approval' },
  { key: 'formal_approval', label: 'Formal Approval' },
  { key: 'settled', label: 'Settled' },
] as const;

// Back-compat export — some components import MILESTONES.
export const MILESTONES = DEFAULT_MILESTONES;

const DEFAULTS: Record<string, { subject: string; body: string }> = {
  lodged: {
    subject: 'Your loan application has been lodged — {opportunity_name}',
    body: `Hi {first_name},\n\nGreat news — your loan application has now been lodged with the lender. We'll keep you updated as it progresses.\n\nIf you have any questions in the meantime, just hit reply.\n\nKind regards,\n{broker_name}`,
  },
  preapproved: {
    subject: 'Pre-approval received — {opportunity_name}',
    body: `Hi {first_name},\n\nCongratulations — your pre-approval has come through. You're now in a strong position to make an offer with confidence.\n\nLet me know when you're close to signing a contract so we can move quickly.\n\nKind regards,\n{broker_name}`,
  },
  conditional_approval: {
    subject: 'Conditional approval received — {opportunity_name}',
    body: `Hi {first_name},\n\nWe've received conditional approval from the lender. There are a few outstanding conditions we'll work through with you over the coming days.\n\nKind regards,\n{broker_name}`,
  },
  formal_approval: {
    subject: 'Formal approval received — {opportunity_name}',
    body: `Hi {first_name},\n\nWonderful news — your loan has been formally approved. Loan documents will be issued shortly for your signature.\n\nKind regards,\n{broker_name}`,
  },
  settled: {
    subject: 'Your loan has settled — {opportunity_name}',
    body: `Hi {first_name},\n\nCongratulations — your loan has officially settled today. Thank you for trusting us with this process.\n\nWe'll be in touch periodically to make sure your loan keeps working hard for you.\n\nKind regards,\n{broker_name}`,
  },
};

interface TemplateRow {
  id?: string;
  milestone: string;
  label: string;
  subject: string;
  body: string;
  enabled: boolean;
  is_custom: boolean;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
}

export function MilestoneEmailsManagement() {
  const { user, role } = useAuth();
  const [bcc, setBcc] = useState('');
  const [templates, setTemplates] = useState<Record<string, TemplateRow>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<string>('lodged');
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const brokerId = user?.id ?? null;

  useEffect(() => {
    if (!brokerId) return;
    (async () => {
      setLoading(true);
      const [{ data: tpls }, { data: settings }] = await Promise.all([
        supabase.from('milestone_email_templates').select('*').eq('broker_id', brokerId),
        supabase.from('broker_email_settings').select('*').eq('broker_id', brokerId).maybeSingle(),
      ]);
      const map: Record<string, TemplateRow> = {};
      const ord: string[] = [];
      for (const m of DEFAULT_MILESTONES) {
        const existing = (tpls || []).find((t: any) => t.milestone === m.key);
        map[m.key] = {
          id: existing?.id,
          milestone: m.key,
          label: existing?.label || m.label,
          subject: existing?.subject || DEFAULTS[m.key].subject,
          body: existing?.body || DEFAULTS[m.key].body,
          enabled: existing?.enabled ?? true,
          is_custom: false,
          attachment_path: existing?.attachment_path || null,
          attachment_name: existing?.attachment_name || null,
          attachment_size: existing?.attachment_size || null,
        };
        ord.push(m.key);
      }
      // Add custom milestones
      for (const t of (tpls || []) as any[]) {
        if (map[t.milestone]) continue;
        map[t.milestone] = {
          id: t.id,
          milestone: t.milestone,
          label: t.label || t.milestone,
          subject: t.subject || '',
          body: t.body || '',
          enabled: t.enabled,
          is_custom: true,
          attachment_path: t.attachment_path || null,
          attachment_name: t.attachment_name || null,
          attachment_size: t.attachment_size || null,
        };
        ord.push(t.milestone);
      }
      setTemplates(map);
      setOrder(ord);
      setBcc(settings?.milestone_bcc_email || '');
      setLoading(false);
    })();
  }, [brokerId]);

  const updateField = (key: string, field: 'subject' | 'body' | 'enabled' | 'label', value: any) => {
    setTemplates((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const addCustom = () => {
    const label = newLabel.trim();
    if (!label) { toast.error('Enter a milestone name'); return; }
    const key = 'custom_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Math.random().toString(36).slice(2, 6);
    if (templates[key]) { toast.error('Duplicate key, try again'); return; }
    setTemplates((p) => ({
      ...p,
      [key]: {
        milestone: key,
        label,
        subject: `Update on your loan — ${label}`,
        body: `Hi {first_name},\n\nYour loan has reached the ${label} stage.\n\nKind regards,\n{broker_name}`,
        enabled: true,
        is_custom: true,
        attachment_path: null,
        attachment_name: null,
        attachment_size: null,
      },
    }));
    setOrder((o) => [...o, key]);
    setActive(key);
    setAddOpen(false);
    setNewLabel('');
  };

  const deleteCustom = async (key: string) => {
    const t = templates[key];
    if (!t?.is_custom) return;
    if (!confirm(`Delete "${t.label}" milestone email? This cannot be undone.`)) return;
    if (t.id && brokerId) {
      await supabase.from('milestone_email_templates').delete().eq('id', t.id);
      if (t.attachment_path) {
        await supabase.storage.from('milestone-attachments').remove([t.attachment_path]);
      }
    }
    setTemplates((p) => { const n = { ...p }; delete n[key]; return n; });
    setOrder((o) => o.filter((k) => k !== key));
    setActive('lodged');
    toast.success('Milestone deleted');
  };

  const uploadAttachment = async (key: string, file: File) => {
    if (!brokerId) return;
    if (file.size > 15 * 1024 * 1024) { toast.error('Max 15MB'); return; }
    setUploadingFor(key);
    const t = templates[key];
    if (t.attachment_path) {
      await supabase.storage.from('milestone-attachments').remove([t.attachment_path]);
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const path = `${brokerId}/${key}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('milestone-attachments').upload(path, file, {
      contentType: file.type || 'application/pdf',
      upsert: false,
    });
    setUploadingFor(null);
    if (error) { toast.error(error.message); return; }
    setTemplates((p) => ({
      ...p,
      [key]: { ...p[key], attachment_path: path, attachment_name: file.name, attachment_size: file.size },
    }));
    toast.success('Attachment uploaded — remember to Save');
  };

  const removeAttachment = async (key: string) => {
    const t = templates[key];
    if (t.attachment_path) {
      await supabase.storage.from('milestone-attachments').remove([t.attachment_path]);
    }
    setTemplates((p) => ({
      ...p,
      [key]: { ...p[key], attachment_path: null, attachment_name: null, attachment_size: null },
    }));
  };

  const save = async () => {
    if (!brokerId) return;
    setSaving(true);
    const rows = Object.values(templates).map((t) => ({
      broker_id: brokerId,
      milestone: t.milestone,
      label: t.label,
      subject: t.subject,
      body: t.body,
      enabled: t.enabled,
      is_custom: t.is_custom,
      attachment_path: t.attachment_path,
      attachment_name: t.attachment_name,
      attachment_size: t.attachment_size,
    }));
    const { error: e1 } = await supabase
      .from('milestone_email_templates')
      .upsert(rows, { onConflict: 'broker_id,milestone' });
    const { error: e2 } = await supabase
      .from('broker_email_settings')
      .upsert({ broker_id: brokerId, milestone_bcc_email: bcc.trim() || null }, { onConflict: 'broker_id' });
    setSaving(false);
    if (e1 || e2) {
      toast.error(e1?.message || e2?.message || 'Save failed');
      return;
    }
    toast.success('Milestone emails saved');
  };

  if (role === 'broker_staff') {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        Only the broker or super admin can edit milestone emails.
      </CardContent></Card>
    );
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Milestone Emails</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add milestone
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Standard BCC (aggregator compliance)</Label>
          <Input
            type="email"
            placeholder="compliance@aggregator.com.au"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This address is BCC'd on every milestone email you send from a deal.
          </p>
        </div>

        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="flex flex-wrap h-auto w-full justify-start">
            {order.map((key) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {templates[key]?.label || key}
              </TabsTrigger>
            ))}
          </TabsList>
          {order.map((key) => {
            const t = templates[key];
            if (!t) return null;
            return (
            <TabsContent key={key} value={key} className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t.label} email</Label>
                <div className="flex items-center gap-2">
                  {t.is_custom && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteCustom(key)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  )}
                  <Label className="text-sm">Enabled</Label>
                  <Switch
                    checked={t.enabled}
                    onCheckedChange={(v) => updateField(key, 'enabled', v)}
                  />
                </div>
              </div>
              {t.is_custom && (
                <div className="space-y-2">
                  <Label>Milestone name</Label>
                  <Input value={t.label} onChange={(e) => updateField(key, 'label', e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={t.subject}
                  onChange={(e) => updateField(key, 'subject', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  rows={12}
                  value={t.body}
                  onChange={(e) => updateField(key, 'body', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Placeholders: <code>{'{first_name}'}</code>, <code>{'{last_name}'}</code>, <code>{'{opportunity_name}'}</code>, <code>{'{loan_amount}'}</code>, <code>{'{broker_name}'}</code>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Default PDF attachment</Label>
                {t.attachment_name ? (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{t.attachment_name}</span>
                      {t.attachment_size ? (
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({(t.attachment_size / 1024).toFixed(0)} KB)
                        </span>
                      ) : null}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeAttachment(key)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" asChild disabled={uploadingFor === key}>
                    <label className="cursor-pointer">
                      <Paperclip className="w-4 h-4 mr-1.5" />
                      {uploadingFor === key ? 'Uploading…' : 'Upload PDF'}
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.currentTarget.value = '';
                          if (f) uploadAttachment(key, f);
                        }}
                      />
                    </label>
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Automatically attached when this milestone email is sent from a deal.
                </p>
              </div>
            </TabsContent>
          );})}
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save all'}
          </Button>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New milestone email</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Milestone name</Label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Valuation Ordered"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={addCustom}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
