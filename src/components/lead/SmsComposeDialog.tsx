import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/** Normalise an Australian phone number into an sms: link (opens iMessage/Messages on iPhone & Mac). */
export function smsHref(phone: string | null, body?: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) digits = `61${digits.slice(1)}`;
  const base = `sms:+${digits}`;
  return body ? `${base}?&body=${encodeURIComponent(body)}` : base;
}

export interface SmsLead {
  /** Only needed for the built-in note logging; optional when onLog is provided. */
  id?: string;
  first_name: string;
  last_name?: string;
  phone: string | null;
}

interface SmsComposeDialogProps {
  lead: SmsLead | null;
  onClose: () => void;
  /** Optional logging override (e.g. the lead file's shared note handler). Receives the raw message. */
  onLog?: (content: string) => Promise<void>;
}

export function SmsComposeDialog({ lead, onClose, onLog }: SmsComposeDialogProps) {
  const { user, isPreviewMode } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const close = () => {
    setMessage('');
    onClose();
  };

  const send = async () => {
    const content = message.trim();
    if (!lead?.phone || !content || sending) return;
    setSending(true);
    try {
      if (onLog) {
        await onLog(content);
      } else if (isPreviewMode) {
        toast.success('Text logged (preview)');
      } else if (user && lead.id) {
        const { error } = await supabase.from('notes').insert({
          lead_id: lead.id,
          author_id: user.id,
          content: `💬 Texted ${lead.phone}\n${content}`,
          notify_partner: false,
        });
        if (error) {
          toast.error('Messages opened, but the log failed to save');
        } else {
          toast.success('Opening Messages — text logged to the lead');
        }
      }
      const href = smsHref(lead.phone, content);
      if (href) window.location.href = href;
      close();
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!lead} onOpenChange={open => !open && close()}>
      <DialogContent className="sm:max-w-md" onClick={e => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Text {lead?.first_name}
          </DialogTitle>
          <DialogDescription>
            Write the message below. We'll open it in Messages on your device and log it on the lead.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">To: {lead?.phone}</p>
          <Textarea
            autoFocus
            aria-label="Text message"
            placeholder={`Hi ${lead?.first_name ?? ''}, …`}
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="min-h-[120px] resize-y"
            maxLength={1000}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={send} disabled={!message.trim() || sending} className="gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            {sending ? 'Logging…' : 'Open Messages & log'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
