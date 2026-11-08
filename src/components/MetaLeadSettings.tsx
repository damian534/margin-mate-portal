import { useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Facebook, RefreshCw, Copy, Plus, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

type Page = { page_id: string; page_name: string | null; enabled: boolean; verified_at: string | null };
type Delivery = { page_id: string; leadgen_id: string; status: string; lead_id: string | null; error: string | null; received_at: string };
type State = { credentials_ready: boolean; verify_token?: string; pages: Page[]; deliveries: Delivery[] };

export function MetaLeadSettings() {
  const { effectiveBrokerId, isPreviewMode } = useAuth();
  const [state, setState] = useState<State>({ credentials_ready: false, pages: [], deliveries: [] });
  const [pageId, setPageId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const callback = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-lead-webhook`;
  const call = async (action: string, extras: Record<string, unknown> = {}) => {
    if (!effectiveBrokerId || isPreviewMode) return;
    setBusy(true); setError('');
    try {
      const { data, error: failure } = await supabase.functions.invoke('meta-lead-settings', { body: { action, broker_id: effectiveBrokerId, ...extras } });
      if (failure) {
        const detail = failure instanceof FunctionsHttpError ? await failure.context.json().catch(() => null) : null;
        throw new Error(detail?.error ?? failure.message);
      }
      if (data.error) throw new Error(data.error);
      setState(data);
      if (action === 'connect') { setPageId(''); toast.success('Page saved — check the connection after Facebook setup'); }
      if (action === 'check') toast.success('Page access and lead subscription checked — submit a Facebook test lead next');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load the connection'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void call('status'); }, [effectiveBrokerId, isPreviewMode]);
  return <section className="border-t border-border pt-6 space-y-5 min-w-0 break-words" aria-label="Facebook lead forms">
    <div className="flex flex-wrap items-center gap-3">
      <Facebook className="w-6 h-6 text-info" />
      <div className="flex-1"><h2 className="text-lg font-semibold">Facebook & Instagram lead forms</h2><p className="text-sm text-muted-foreground">Direct connection</p></div>
      <Button variant="ghost" size="icon" title="Refresh Facebook connection" disabled={busy || isPreviewMode} onClick={() => call('status')}><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /></Button>
    </div>
    <div className="flex items-start gap-2 text-sm">
      {state.credentials_ready ? <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />}
      <p>{state.credentials_ready ? 'App credentials configured. Check each Page, then submit a Facebook test lead to verify delivery.' : 'Facebook app credentials need secure setup before leads can arrive. Ask Lovable to complete Facebook lead-form credentials; never paste tokens into chat.'}</p>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="space-y-2"><Label htmlFor="facebook-page-id">Facebook Page ID</Label><div className="flex gap-2"><Input id="facebook-page-id" inputMode="numeric" placeholder="Enter your Facebook Page ID" value={pageId} onChange={e => setPageId(e.target.value)} disabled={busy || isPreviewMode} /><Button disabled={busy || isPreviewMode || !/^\d{1,30}$/.test(pageId)} onClick={() => call('connect', { page_id: pageId })}><Plus className="w-4 h-4 mr-2" />Add Page</Button></div></div>
    <div className="divide-y divide-border">
      {state.pages.map(page => <div key={page.page_id} className="py-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0"><p className="font-medium break-words">{page.page_name || `Page ${page.page_id}`}</p><p className="text-xs text-muted-foreground">{!page.enabled ? 'Paused' : page.verified_at ? `Last checked ${new Date(page.verified_at).toLocaleString('en-AU')}` : 'Saved · not checked'}</p></div>
        <Button variant="outline" size="sm" disabled={busy || !state.credentials_ready} onClick={() => call('check', { page_id: page.page_id })}><CheckCircle2 className="w-4 h-4 mr-2" />Check connection</Button>
        <Switch aria-label={`Receive leads from ${page.page_name || page.page_id}`} checked={page.enabled} disabled={busy} onCheckedChange={enabled => call('toggle', { page_id: page.page_id, enabled })} />
      </div>)}
      {!state.pages.length && <p className="text-sm text-muted-foreground py-3">No Facebook Pages connected.</p>}
    </div>
    <details open className="border-y border-border py-3"><summary className="cursor-pointer text-sm font-medium">Facebook setup details</summary><div className="pt-4 space-y-3 text-sm text-muted-foreground">
      <ol className="list-decimal pl-5 space-y-2"><li>Use your Facebook developer app with lead retrieval access. Live customer leads may require Meta app review and business verification.</li><li>Securely configure the app secret, Page access token and webhook verify token with Lovable.</li><li>In your app’s Webhooks settings, select Page, paste the callback address and verify token shown below, then subscribe to <strong>leadgen</strong>.</li><li>Subscribe that app to your Facebook Page’s leadgen events and grant it lead access in your business settings.</li><li>Add the Page ID above, check the connection, then create a test using Facebook’s Lead Ads Testing Tool.</li></ol>
      <Label htmlFor="facebook-callback">Callback address</Label><div className="flex gap-2"><Input id="facebook-callback" value={callback} readOnly className="font-mono text-xs" /><Button variant="outline" size="icon" title="Copy Facebook callback" onClick={async () => { try { await navigator.clipboard.writeText(callback); toast.success('Callback copied'); } catch { toast.error('Select and copy the address manually'); } }}><Copy className="w-4 h-4" /></Button></div>
      <Label htmlFor="facebook-verify">Verify token</Label><div className="flex gap-2"><Input id="facebook-verify" value={state.verify_token ?? ''} placeholder="Loading…" readOnly className="font-mono text-xs" /><Button variant="outline" size="icon" title="Copy verify token" disabled={!state.verify_token} onClick={async () => { try { await navigator.clipboard.writeText(state.verify_token ?? ''); toast.success('Verify token copied'); } catch { toast.error('Select and copy the token manually'); } }}><Copy className="w-4 h-4" /></Button></div>
      <Button variant="outline" size="sm" asChild><a href="https://developers.facebook.com/tools/lead-ads-testing" target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Open Facebook testing tool</a></Button>
    </div></details>
    <div className="space-y-3"><h3 className="text-sm font-semibold">Recent Facebook deliveries</h3>
      {!state.deliveries.length ? <p className="text-sm text-muted-foreground">No Facebook deliveries received yet.</p> : <div className="divide-y divide-border">{state.deliveries.map(d => <div key={`${d.page_id}:${d.leadgen_id}`} className="py-3 text-sm"><div className="flex flex-wrap gap-2 justify-between"><span className={d.status === 'imported' ? 'text-success' : 'text-destructive'}>{d.status === 'imported' ? 'Lead imported' : 'Import failed'}</span><time className="text-xs text-muted-foreground">{new Date(d.received_at).toLocaleString('en-AU')}</time></div><p className="text-xs text-muted-foreground">Page {d.page_id} · Facebook lead {d.leadgen_id}</p>{d.error && <p className="text-destructive mt-1">{d.error}</p>}</div>)}</div>}
    </div>
  </section>;
}