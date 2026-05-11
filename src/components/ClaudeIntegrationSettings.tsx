import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bot, Save, Send } from 'lucide-react';

export function ClaudeIntegrationSettings() {
  const { user, role } = useAuth();
  const brokerId = user?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [prompt, setPrompt] = useState('Process the inbox');

  useEffect(() => {
    if (!brokerId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('broker_email_settings')
        .select('claude_webhook_url, claude_webhook_secret, claude_webhook_enabled, claude_default_prompt')
        .eq('broker_id', brokerId)
        .maybeSingle();
      setEnabled(!!data?.claude_webhook_enabled);
      setUrl(data?.claude_webhook_url || '');
      setSecret(data?.claude_webhook_secret || '');
      setPrompt(data?.claude_default_prompt || 'Process the inbox');
      setLoading(false);
    })();
  }, [brokerId]);

  if (role === 'broker_staff') {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        Only the broker or super admin can configure the Claude integration.
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
        claude_webhook_url: url.trim() || null,
        claude_webhook_secret: secret.trim() || null,
        claude_webhook_enabled: enabled,
        claude_default_prompt: prompt.trim() || 'Process the inbox',
      }, { onConflict: 'broker_id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Claude integration saved');
  };

  const test = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke('trigger-claude-inbox', {
      body: { prompt: prompt || 'Test from CRM' },
    });
    setTesting(false);
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    toast.success('Webhook fired ✓ check Claude on your machine');
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5" /> Claude Co-Work Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-2">
          <p className="font-medium">How this works</p>
          <p className="text-muted-foreground">
            When anyone on your admin team clicks the <strong>Process Inbox</strong> button in
            the top nav, our backend POSTs a JSON payload to the webhook URL below. You'll need
            something on your computer that listens for that webhook and tells Claude Desktop to
            process the inbox — for example an <strong>n8n workflow</strong>, a small script
            exposed via <strong>ngrok</strong>, or a Zapier/Make webhook → local agent.
          </p>
          <p className="text-muted-foreground">
            Payload sent: <code>{`{ action, prompt, triggered_by, lead_id, timestamp }`}</code>.
            If you set a secret below, it's sent as the <code>X-Webhook-Secret</code> header.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-md border p-4">
          <div>
            <Label className="text-base">Enabled</Label>
            <p className="text-xs text-muted-foreground">Allow the admin team to trigger Claude</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <Input
            type="url"
            placeholder="https://your-n8n.example.com/webhook/claude-process-inbox"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Shared secret (optional)</Label>
          <Input
            type="password"
            placeholder="A long random string"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Sent as <code>X-Webhook-Secret</code>. Verify it on your end before processing.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Default prompt sent to Claude</Label>
          <Textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={test} disabled={testing || !url}>
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