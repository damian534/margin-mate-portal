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
import { Mail, Save } from 'lucide-react';

export const MILESTONES = [
  { key: 'lodged', label: 'Lodged' },
  { key: 'preapproved', label: 'Pre-Approved' },
  { key: 'conditional_approval', label: 'Conditional Approval' },
  { key: 'formal_approval', label: 'Formal Approval' },
  { key: 'settled', label: 'Settled' },
] as const;

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
  milestone: string;
  subject: string;
  body: string;
  enabled: boolean;
}

export function MilestoneEmailsManagement() {
  const { user, role } = useAuth();
  const [bcc, setBcc] = useState('');
  const [templates, setTemplates] = useState<Record<string, TemplateRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<string>('lodged');

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
      for (const m of MILESTONES) {
        const existing = (tpls || []).find((t: any) => t.milestone === m.key);
        map[m.key] = existing
          ? { milestone: m.key, subject: existing.subject || DEFAULTS[m.key].subject, body: existing.body || DEFAULTS[m.key].body, enabled: existing.enabled }
          : { milestone: m.key, subject: DEFAULTS[m.key].subject, body: DEFAULTS[m.key].body, enabled: true };
      }
      setTemplates(map);
      setBcc(settings?.milestone_bcc_email || '');
      setLoading(false);
    })();
  }, [brokerId]);

  const updateField = (key: string, field: 'subject' | 'body' | 'enabled', value: any) => {
    setTemplates((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const save = async () => {
    if (!brokerId) return;
    setSaving(true);
    const rows = Object.values(templates).map((t) => ({ broker_id: brokerId, ...t }));
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
        <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Milestone Emails</CardTitle>
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
          <TabsList className="grid grid-cols-5 w-full">
            {MILESTONES.map((m) => (
              <TabsTrigger key={m.key} value={m.key} className="text-xs">{m.label}</TabsTrigger>
            ))}
          </TabsList>
          {MILESTONES.map((m) => (
            <TabsContent key={m.key} value={m.key} className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{m.label} email</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Enabled</Label>
                  <Switch
                    checked={templates[m.key]?.enabled ?? true}
                    onCheckedChange={(v) => updateField(m.key, 'enabled', v)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={templates[m.key]?.subject || ''}
                  onChange={(e) => updateField(m.key, 'subject', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  rows={12}
                  value={templates[m.key]?.body || ''}
                  onChange={(e) => updateField(m.key, 'body', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Placeholders: <code>{'{first_name}'}</code>, <code>{'{last_name}'}</code>, <code>{'{opportunity_name}'}</code>, <code>{'{loan_amount}'}</code>, <code>{'{broker_name}'}</code>
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save all'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
