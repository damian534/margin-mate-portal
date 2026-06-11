import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Zap, Save, Send } from 'lucide-react';

export function ZapierIntegrationSettings() {
  const { user, role } = useAuth();
  const brokerId = user?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!brokerId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('broker_email_settings')
        .select('zapier_new_lead_webhook_url')
        .eq('broker_id', brokerId)
        .maybeSingle();
      setUrl((data as any)?.zapier_new_lead_webhook_url || '');
      setLoading(false);
    })();
  }, [brokerId]);

  if (role === 'broker_staff') {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        Only the broker or super admin can configure Zapier integration.
      </CardContent></Card>
    );
  }

  const save = async () => {
    if (!brokerId) return;
    setSaving(true);
    const { error } = await supabase
      .from('broker_email_settings')
      .upsert({
        broker_id: brokerId,
        zapier_new_lead_webhook_url: url.trim() || null,
      }, { onConflict: 'broker_id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Zapier webhook saved');
  };

  const test = async () => {
    if (!url.trim()) return;
    setTesting(true);
    try {
      await fetch(url.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          event: 'new_lead',
          timestamp: new Date().toISOString(),
          first_name: 'Test',
          last_name: 'Lead',
          full_name: 'Test Lead',
          email: 'test@example.com',
          phone: '0400 000 000',
          loan_amount: 500000,
          loan_purpose: 'Home Purchase',
          source: 'manual_test',
          referrer: 'Ray White Glenroy',
        }),
      });
      toast.success('Test sent — check your Zap run history');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send test');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5" /> Zapier Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-2">
          <p className="font-medium">How this works</p>
          <p className="text-muted-foreground">
            Every time a new lead is created in Connect, we POST the lead details to your Zapier
            webhook. Use this to push leads into <strong>MyCRM</strong>, <strong>Google Contacts</strong>,
            or anywhere else Zapier supports.
          </p>
          <p className="text-muted-foreground">
            In Zapier, create a Zap with the <strong>Webhooks by Zapier → Catch Hook</strong> trigger,
            copy the webhook URL, paste it below, then add actions for MyCRM and Google Contacts.
          </p>
          <p className="text-muted-foreground">
            Payload fields: <code>event, first_name, last_name, full_name, email, phone, loan_amount, loan_purpose, source, referrer, timestamp</code>.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Zapier Catch Hook URL</Label>
          <Input
            type="url"
            placeholder="https://hooks.zapier.com/hooks/catch/123456/abcdef/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={test} disabled={testing || !url.trim()}>
            <Send className="w-4 h-4 mr-2" /> {testing ? 'Sending…' : 'Send test'}
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}