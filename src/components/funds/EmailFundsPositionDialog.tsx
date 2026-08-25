import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fundsPositionFileName, fundsPositionPdfBase64 } from '@/lib/pdf/fundsPositionPdf';
import type { FundsPositionInputs, FundsPositionResult } from '@/lib/fundsPosition/types';
import type { FundsWarning } from '@/lib/fundsPosition/warnings';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputs: FundsPositionInputs;
  result: FundsPositionResult;
  warnings: FundsWarning[];
  clientName?: string;
  defaultTo?: string | null;
  defaultRecipientName?: string | null;
}

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString('en-AU')}`;

export function EmailFundsPositionDialog({
  open,
  onOpenChange,
  inputs,
  result,
  warnings,
  clientName,
  defaultTo,
  defaultRecipientName,
}: Props) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTo(defaultTo ?? '');
    setSubject(`Funding position${clientName ? ` — ${clientName}` : ''}`);
    setMessage(
      `Hi ${defaultRecipientName || 'there'},\n\nPlease find attached the funding position${
        clientName ? ` for ${clientName}` : ''
      }.\n\nTotal loan: ${money(result.totalLoan)} at ${result.totalLVR.toFixed(2)}% LVR\n${
        result.netSurplus < 0
          ? `Funds to complete: ${money(Math.abs(result.netSurplus))}`
          : `Net surplus: ${money(result.netSurplus)}`
      }\n\nHappy to walk through it any time.`,
    );
  }, [open, defaultTo, defaultRecipientName, clientName, result]);

  const send = async () => {
    const email = to.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast.error('Enter a valid email address');
      return;
    }
    if (!subject.trim()) {
      toast.error('Add a subject');
      return;
    }
    setSending(true);
    try {
      const base64 = await fundsPositionPdfBase64(inputs, result, { clientName }, warnings);
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#211e16;line-height:1.6">${message
        .split('\n')
        .map(line => `<p style="margin:0 0 8px">${line.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))}</p>`)
        .join('')}</div>`;

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: subject.trim(),
          html,
          attachments: [
            {
              filename: fundsPositionFileName({ clientName }),
              content: base64,
              content_type: 'application/pdf',
            },
          ],
        },
      });
      if (error) throw error;
      toast.success('Funding position sent');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Could not send the email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email funding position</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input value={to} onChange={e => setTo(e.target.value)} placeholder="partner@agency.com.au" maxLength={255} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Message</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={8} maxLength={4000} />
          </div>
          <p className="text-xs text-muted-foreground">
            The funding position PDF (waterfall, toggles and warnings) is attached automatically.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending}>
            <Send className="mr-1 h-4 w-4" /> {sending ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
