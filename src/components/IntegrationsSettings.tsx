import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Webhook, Copy, RefreshCw, Send, CheckCircle2, Facebook, Landmark } from 'lucide-react';

/**
 * Per-brokerage inbound lead integrations. Shows the private intake URL that
 * external systems (GHL workflows, Zapier/Make, website forms) POST new leads
 * to, plus the Meta lead-ads callback URL and setup instructions.
 */
export function IntegrationsSettings() {
  const { effectiveBrokerId, isPreviewMode } = useAuth();
  const [intakeKey, setIntakeKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [testing, setTesting] = useState(false);

  const functionsBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  const intakeUrl = useMemo(
    () => (intakeKey ? `${functionsBase}/lead-intake?key=${intakeKey}` : ''),
    [functionsBase, intakeKey],
  );
  const metaCallbackUrl = `${functionsBase}/meta-lead-webhook`;

  useEffect(() => {
    if (isPreviewMode || !effectiveBrokerId) {
      setLoading(false);
      return;
    }
    (async () => {
      // Load the brokerage's settings row; create it on first visit so the
      // database default generates the intake key.
      let { data } = await supabase
        .from('broker_email_settings')
        .select('inbound_webhook_key')
        .eq('broker_id', effectiveBrokerId)
        .maybeSingle();
      if (!data) {
        await supabase.from('broker_email_settings').insert({ broker_id: effectiveBrokerId } as any);
        const res = await supabase
          .from('broker_email_settings')
          .select('inbound_webhook_key')
          .eq('broker_id', effectiveBrokerId)
          .maybeSingle();
        data = res.data;
      }
      setIntakeKey(((data as any)?.inbound_webhook_key as string) || '');
      setLoading(false);
    })();
  }, [effectiveBrokerId, isPreviewMode]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy — select the text and copy it manually');
    }
  };

  const regenerate = async () => {
    if (!effectiveBrokerId) return;
    if (!window.confirm('Generate a new intake key? Your current intake URL will stop working — you will need to update it in GHL / Zapier.')) return;
    setRegenerating(true);
    const newKey = crypto.randomUUID();
    const { error } = await supabase
      .from('broker_email_settings')
      .update({ inbound_webhook_key: newKey } as any)
      .eq('broker_id', effectiveBrokerId);
    setRegenerating(false);
    if (error) {
      toast.error('Failed to regenerate: ' + error.message);
      return;
    }
    setIntakeKey(newKey);
    toast.success('New intake key generated — update your connected tools');
  };

  const sendTestLead = async () => {
    if (!intakeUrl) return;
    setTesting(true);
    try {
      const res = await fetch(intakeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'Lead',
          email: 'test.lead@example.com',
          phone: '0400 000 000',
          source: 'GHL',
          notes: 'Test lead sent from Connect settings — safe to delete.',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      toast.success('Test lead created — it is now at the top of your Leads inbox (safe to delete)');
    } catch (e) {
      toast.error('Test failed: ' + (e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm py-8">Loading integrations…</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Intake URL */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Your lead intake address</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Any system that can send a web request (GHL, Zapier, Make, your website) can push new leads
          straight into your Leads inbox using this private address. Leads arrive as <strong>New</strong> with
          the source attached, and you get the usual new-lead notification.
        </p>
        <div className="space-y-2">
          <Label htmlFor="intake-url">Intake URL</Label>
          <div className="flex gap-2">
            <Input
              id="intake-url"
              readOnly
              value={isPreviewMode ? 'https://…/lead-intake?key=your-private-key' : intakeUrl}
              className="font-mono text-xs"
              onFocus={e => e.target.select()}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copy(intakeUrl, 'Intake URL')}
              disabled={isPreviewMode || !intakeUrl}
              title="Copy intake URL"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Keep this private — anyone with the full address can add leads to your CRM.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={regenerate} disabled={regenerating || isPreviewMode || !intakeKey}>
            <RefreshCw className={`w-4 h-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Generating…' : 'Regenerate key'}
          </Button>
          <Button variant="outline" onClick={sendTestLead} disabled={testing || isPreviewMode || !intakeUrl}>
            <Send className="w-4 h-4 mr-2" />
            {testing ? 'Sending…' : 'Send test lead'}
          </Button>
        </div>
      </div>

      {/* GHL setup */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">GoHighLevel (landing page leads)</h2>
        </div>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>In GHL, open <strong>Automation → Workflows</strong> and edit the workflow that runs when a landing-page form or survey is submitted.</li>
          <li>Add the standard <strong>Webhook</strong> action (not Custom Webhook), set the method to <strong>POST</strong> and paste your intake URL above.</li>
          <li>Optionally add one Custom Data item — key <code className="bg-muted px-1 rounded">source</code>, value like <code className="bg-muted px-1 rounded">GHL Landing Page</code> — so reporting groups these leads.</li>
          <li>Save and publish the workflow — new leads will appear in Connect within seconds.</li>
        </ol>
        <p className="text-xs text-muted-foreground">
          The standard Webhook action automatically sends every answer on the form or survey — no field mapping,
          and nothing to update when you add or change questions. Each answer shows in the <strong>Form answers</strong>{' '}
          card on the deal, the same way Privyr shows them. (A Custom Webhook with your own fields also works —
          any extra field you add is captured the same way.)
        </p>
      </div>

      {/* Meta setup */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Facebook className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Meta lead ads (Facebook / Instagram)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Two ways to get Meta leads in — use whichever suits you:
        </p>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-muted/50 p-4 space-y-1.5">
            <p className="font-medium text-foreground">Option 1 — Zapier or Make (quickest)</p>
            <p className="text-muted-foreground">
              Create a Zap: <strong>Facebook Lead Ads → Webhooks by Zapier (POST)</strong> to your intake URL,
              mapping the name, email and phone fields. Set <code className="bg-muted px-1 rounded">source</code> to{' '}
              <code className="bg-muted px-1 rounded">Facebook / Instagram Ad</code>.
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="font-medium text-foreground">Option 2 — Direct connection (no Zapier cost)</p>
            <p className="text-muted-foreground">
              Connect already has a Meta webhook built in. In your Meta app (Webhooks → Page), use this
              callback URL:
            </p>
            <div className="flex gap-2">
              <Input readOnly value={metaCallbackUrl} className="font-mono text-xs" onFocus={e => e.target.select()} />
              <Button variant="outline" size="icon" onClick={() => copy(metaCallbackUrl, 'Meta callback URL')} title="Copy Meta callback URL">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The direct connection also needs your Meta verify token and page access token saved on our side —
              send those through the secure prompt in chat and it goes live.
            </p>
          </div>
        </div>
      </div>

      {/* Field reference */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Fields the intake address accepts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-4 font-medium">Field</th>
                <th className="py-2 pr-4 font-medium">What it does</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {[
                ['first_name / last_name (or name)', "The lead's name — required unless email or phone is given"],
                ['email', "Lead's email address"],
                ['phone', "Lead's phone number"],
                ['source', 'Lead source label, e.g. "GHL Landing Page" — matched or created automatically'],
                ['loan_amount', 'Loan amount as a number'],
                ['loan_purpose', ' refinance, investment, first home, next home'],
                ['notes', 'Extra details — saved to the deal history'],
                ['campaign / adset / ad / form_name', 'Which ad or form the lead came from — shown on the deal'],
                ['any other field', "Saved as a question + answer and shown in the deal's Form answers card"],
              ].map(([field, desc]) => (
                <tr key={field} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs text-foreground">{field}</td>
                  <td className="py-2 pr-4">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
