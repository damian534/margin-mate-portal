import { useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

export function SmsAlertsSettings() {
  const { effectiveBrokerId, isPreviewMode } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState('');
  const [sender, setSender] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [dirty, setDirty] = useState(false);
  const [sendError, setSendError] = useState('');
  useEffect(() => {
    if (!effectiveBrokerId || isPreviewMode) { setLoading(false); return; }
    let active = true;
    void supabase.from('broker_email_settings').select('sms_alerts_enabled,sms_alert_phone,sms_sender_phone').eq('broker_id', effectiveBrokerId).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) toast.error('Could not load SMS settings');
      setEnabled(data?.sms_alerts_enabled ?? false);
      setPhone(data?.sms_alert_phone ?? '');
      setSender(data?.sms_sender_phone ?? '');
      setLoading(false);
    });
    return () => { active = false; };
  }, [effectiveBrokerId, isPreviewMode]);
  const submit = async (action: 'save' | 'test') => {
    if (!effectiveBrokerId || isPreviewMode) return;
    setBusy(action);
    setSendError('');
    try {
      const { data, error } = await supabase.functions.invoke('new-lead-sms', { body: { action, broker_id: effectiveBrokerId, ...(action === 'save' ? { enabled, phone, sender } : {}) } });
      if (error) {
        let message = error.message;
        if (error instanceof FunctionsHttpError) {
          const details = await error.context.json().catch(() => null);
          message = details?.error || details?.details || message;
        }
        throw new Error(message);
      }
      if (!data?.ok) throw new Error(data?.error || 'SMS request failed');
      if (action === 'save') { setDirty(false); toast.success(enabled ? 'New-lead SMS alerts switched on' : 'SMS settings saved — automatic alerts off'); }
      else toast.success('Twilio accepted your test text — check your mobile');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update SMS alerts';
      setSendError(message);
      toast.error(message);
    }
    finally { setBusy(null); }
  };
  const disabled = loading || isPreviewMode || !!busy;
  return (
    <section className="border-b border-border pb-6 space-y-4">
      <div className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /><h2 className="text-lg font-semibold">New-lead SMS alerts</h2></div>
      <div className="flex items-center justify-between gap-4"><Label htmlFor="sms-enabled">Text me when a new lead arrives</Label><Switch id="sms-enabled" checked={enabled} disabled={disabled} onCheckedChange={v => { setEnabled(v); setDirty(true); }} /></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="sms-recipient">Your mobile number</Label><Input id="sms-recipient" type="tel" value={phone} placeholder="04xx xxx xxx" disabled={disabled} onChange={e => { setPhone(e.target.value); setDirty(true); }} /></div>
        <div className="space-y-2"><Label htmlFor="sms-sender">Twilio sending number</Label><Input id="sms-sender" type="tel" value={sender} placeholder="+61…" disabled={disabled} onChange={e => { setSender(e.target.value); setDirty(true); }} /></div>
      </div>
      <p className="text-xs text-muted-foreground">Twilio message charges apply. Use an SMS-capable Twilio number and enable SMS Pumping Protection and destination-country restrictions in Twilio.</p>
      <div className="flex flex-wrap gap-2"><Button disabled={disabled} onClick={() => submit('save')}><Save className="w-4 h-4 mr-2" />{busy === 'save' ? 'Saving…' : 'Save SMS settings'}</Button><Button variant="outline" disabled={disabled || dirty || !phone || !sender} onClick={() => submit('test')}><Send className="w-4 h-4 mr-2" />{busy === 'test' ? 'Sending…' : 'Send test SMS'}</Button></div>
      {sendError && <p role="alert" className="text-sm text-destructive break-words">{sendError}</p>}
    </section>
  );
}