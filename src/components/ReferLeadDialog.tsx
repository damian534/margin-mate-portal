import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, Share2 } from 'lucide-react';

interface Props {
  leadId: string;
  leadName: string;
  trigger?: React.ReactNode;
  onSent?: () => void;
}

interface BrokerOpt { id: string; name: string; email: string | null }

export function ReferLeadDialog({ leadId, leadName, trigger, onSent }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [brokers, setBrokers] = useState<BrokerOpt[]>([]);
  const [toBrokerId, setToBrokerId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['broker', 'super_admin']);
      const ids = (roles || []).map(r => r.user_id).filter(id => id !== user.id);
      if (!ids.length) { setBrokers([]); return; }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', ids);
      setBrokers((profiles || [])
        .filter(p => p.user_id)
        .map(p => ({ id: p.user_id!, name: p.full_name || p.email || 'Unknown', email: p.email })));
    })();
  }, [open, user]);

  const submit = async () => {
    if (!user || !toBrokerId) { toast.error('Select a broker'); return; }
    setSending(true);
    const { error } = await supabase.from('lead_referrals').insert({
      lead_id: leadId,
      from_broker_id: user.id,
      to_broker_id: toBrokerId,
      message: message.trim() || null,
    } as any);
    setSending(false);
    if (error) { toast.error('Failed to send referral'); return; }

    // Notify the receiving broker via email (best-effort)
    try {
      const recipient = brokers.find(b => b.id === toBrokerId);
      const { data: fromProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .maybeSingle();
      const fromName = fromProfile?.full_name || fromProfile?.email || 'A broker';
      if (recipient?.email) {
        const html = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 0;">
            <h2 style="color:#1a1a1a;margin-bottom:8px;">New lead referral</h2>
            <p style="color:#555;font-size:15px;line-height:1.6;">
              ${fromName} has referred a lead to you on Margin Connect:
            </p>
            <div style="background:#f5f5f5;border-left:4px solid #16a34a;padding:16px;border-radius:4px;margin:20px 0;">
              <p style="margin:0;font-size:16px;font-weight:600;color:#1a1a1a;">${leadName}</p>
              ${message.trim() ? `<p style="margin:12px 0 0;color:#555;font-size:14px;white-space:pre-wrap;">"${message.trim().replace(/</g,'&lt;')}"</p>` : ''}
            </div>
            <p style="color:#555;font-size:14px;">Log in to your CRM to accept or decline this referral.</p>
            <p style="color:#888;font-size:13px;margin-top:24px;">— Margin Finance</p>
          </div>
        `;
        await supabase.functions.invoke('send-email', {
          body: {
            to: recipient.email,
            subject: `🤝 New lead referral: ${leadName}`,
            html,
          },
        });
      }
    } catch (e) {
      console.error('[refer-lead] email notify failed', e);
    }

    toast.success('Referral sent');
    setOpen(false);
    setToBrokerId('');
    setMessage('');
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" /> Refer to broker
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refer {leadName}</DialogTitle>
          <DialogDescription>
            Send this lead to another broker. They'll need to accept it before taking over. You'll keep read-only access to track progress.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Send to broker</Label>
            <Select value={toBrokerId} onValueChange={setToBrokerId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a broker" /></SelectTrigger>
              <SelectContent>
                {brokers.length === 0 && <SelectItem value="__none" disabled>No other brokers available</SelectItem>}
                {brokers.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}{b.email ? ` (${b.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Message (optional)</Label>
            <Textarea
              className="mt-1"
              rows={3}
              maxLength={1000}
              placeholder="Add context for the receiving broker..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={sending || !toBrokerId}>
            <Send className="w-4 h-4 mr-1" /> Send referral
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}