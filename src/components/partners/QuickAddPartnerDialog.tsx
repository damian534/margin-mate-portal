import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  /** Called with the newly created profile so callers can select it immediately. */
  onCreatedProfile?: (profile: { id: string; full_name: string | null; email: string | null }) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function QuickAddPartnerDialog({ open, onOpenChange, onCreated, onCreatedProfile }: Props) {
  const { user, isPreviewMode } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => { setFullName(''); setEmail(''); setPhone(''); setSendInvite(true); };

  const handleSave = async () => {
    const name = fullName.trim();
    const mail = email.trim().toLowerCase();
    if (!name || !mail) { toast.error('Name and email are required'); return; }
    if (!EMAIL_RE.test(mail)) { toast.error('Please enter a valid email address'); return; }
    if (isPreviewMode) { toast.success(`${name} added (preview)`); reset(); onOpenChange(false); return; }

    setSaving(true);
    try {
      const { data: existing } = await supabase.from('profiles').select('id').eq('email', mail).maybeSingle();
      if (existing) { toast.error('A partner or user with this email already exists'); return; }

      const { data: profile, error } = await supabase.from('profiles').insert({
        user_id: null,
        email: mail,
        full_name: name,
        phone: phone.trim() || null,
        broker_id: user?.id || null,
        company_id: null,
        company_name: null,
      } as any).select('id').single();
      if (error || !profile) { console.error(error); toast.error('Could not create partner'); return; }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error: codeErr } = await supabase.from('invite_codes').insert({
        broker_id: user!.id,
        code,
        label: `Invite for ${name}`,
        max_uses: 1,
        target_role: 'referral_partner',
        profile_id: profile.id,
      } as any);
      if (codeErr) console.error(codeErr);

      if (sendInvite && !codeErr) {
        const registerUrl = `${window.location.origin}/register?code=${code}`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">You're Invited to Margin Finance</h2>
            <p>Hi ${name},</p>
            <p>You've been invited to join <strong>Margin Finance</strong> as a referral partner. Register to get started — your details are already filled in.</p>
            <div style="margin: 24px 0;">
              <a href="${registerUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Register Now</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy this link: <a href="${registerUrl}">${registerUrl}</a></p>
            <p style="color: #999; font-size: 12px; margin-top: 32px;">This invitation is for ${mail} only.</p>
          </div>`;
        const { error: emailErr } = await supabase.functions.invoke('send-email', {
          body: { to: mail, subject: "You're Invited to Margin Finance", html },
        });
        if (emailErr) toast.error(`${name} added, but the invite email failed — resend it from User Management`);
        else toast.success(`${name} added as an independent partner — invite sent to ${mail}`);
      } else {
        toast.success(`${name} added as an independent partner`);
      }

      reset();
      onOpenChange(false);
      onCreated?.();
      onCreatedProfile?.({ id: profile.id, full_name: name, email: mail });
    } catch (e) {
      console.error(e);
      toast.error('Could not create partner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add independent partner</DialogTitle>
          <DialogDescription>For agents you work with directly — no company needed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full name <span className="text-destructive">*</span></Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Briggs" />
          </div>
          <div className="space-y-1.5">
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Mobile</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0400 000 000" />
          </div>
          <label className="flex items-center gap-2 text-sm pt-1 cursor-pointer">
            <Checkbox checked={sendInvite} onCheckedChange={(v) => setSendInvite(!!v)} />
            Email them an invite to register now
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {sendInvite ? 'Add & send invite' : 'Add partner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
