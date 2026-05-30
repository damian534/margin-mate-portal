import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Company } from '@/components/CompanyManagement';
import { ReferrerProfileData } from '@/components/ReferrerProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, X, Mail, Send } from 'lucide-react';

interface ReferrerEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrer: ReferrerProfileData | null;
  companies: Company[];
  isPreviewMode?: boolean;
  onSaved?: () => void;
}

export function ReferrerEditSheet({ open, onOpenChange, referrer, companies, isPreviewMode, onSaved }: ReferrerEditSheetProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<Partial<ReferrerProfileData>>({});
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (referrer) {
      setForm({
        company_id: referrer.company_id,
        date_of_birth: referrer.date_of_birth,
        spouse_name: referrer.spouse_name,
        interests: referrer.interests,
        address: referrer.address,
        license_number: referrer.license_number,
        broker_notes: referrer.broker_notes,
        custom_fields: referrer.custom_fields || {},
      });
    }
  }, [referrer]);

  const saveProfile = async () => {
    if (!referrer) return;
    if (isPreviewMode) { toast.success('Profile updated (preview)'); onOpenChange(false); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      company_id: form.company_id || null,
      date_of_birth: form.date_of_birth || null,
      spouse_name: (form.spouse_name as string)?.trim() || null,
      interests: (form.interests as string)?.trim() || null,
      address: (form.address as string)?.trim() || null,
      license_number: (form.license_number as string)?.trim() || null,
      broker_notes: (form.broker_notes as string)?.trim() || null,
      custom_fields: form.custom_fields || {},
    } as any).eq('id', referrer.id);
    setSaving(false);
    if (error) { toast.error('Failed to update profile'); return; }
    toast.success('Profile updated');
    onOpenChange(false);
    onSaved?.();
  };

  const sendInvite = async () => {
    if (!referrer?.email) { toast.error('This partner has no email address'); return; }
    if (isPreviewMode) { toast.success('Invite sent (preview)'); return; }
    setInviting(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error: codeErr } = await supabase.from('invite_codes').insert({
        broker_id: user!.id,
        code,
        label: `Invite for ${referrer.full_name || referrer.email}`,
        max_uses: 1,
      } as any);
      if (codeErr) { toast.error('Failed to generate invite code'); setInviting(false); return; }

      const registerUrl = `${window.location.origin}/register?code=${code}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You're Invited to Margin Finance</h2>
          <p>Hi ${referrer.full_name || 'there'},</p>
          <p>You've been invited to join <strong>Margin Finance</strong> as a referral partner.</p>
          <div style="margin: 24px 0;">
            <a href="${registerUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Register Now</a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy this link: <a href="${registerUrl}">${registerUrl}</a></p>
        </div>`;
      const { error: emailErr } = await supabase.functions.invoke('send-email', {
        body: { to: referrer.email, subject: "You're Invited to Margin Finance", html },
      });
      if (emailErr) { toast.error('Failed to send invite'); setInviting(false); return; }
      toast.success(`Invite sent to ${referrer.email}`);
    } catch (e) {
      console.error(e); toast.error('Failed to send invite');
    }
    setInviting(false);
  };

  const addCustomField = () => {
    if (!customFieldKey.trim()) return;
    setForm(f => ({ ...f, custom_fields: { ...(f.custom_fields || {}), [customFieldKey.trim()]: customFieldValue.trim() } }));
    setCustomFieldKey(''); setCustomFieldValue('');
  };
  const removeCustomField = (key: string) => {
    setForm(f => { const cf = { ...(f.custom_fields || {}) }; delete cf[key]; return { ...f, custom_fields: cf }; });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {referrer && (
          <>
            <SheetHeader>
              <SheetTitle className="text-xl">{referrer.full_name || 'Unnamed Agent'}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Contact Info</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {referrer.email && (<div className="flex items-center gap-2"><p className="text-muted-foreground">Email</p><p className="font-medium flex-1 truncate">{referrer.email}</p></div>)}
                  {referrer.phone && (<div className="flex items-center gap-2"><p className="text-muted-foreground">Phone</p><p className="font-medium flex-1">{referrer.phone}</p></div>)}
                </div>
                {referrer.email && (!referrer.user_id || referrer.user_id.startsWith('contact-')) && (
                  <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={sendInvite} disabled={inviting}>
                    <Send className="w-3.5 h-3.5" />{inviting ? 'Sending...' : 'Send Registration Invite'}
                  </Button>
                )}
                {referrer.user_id && !referrer.user_id.startsWith('contact-') && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-2">
                    <Mail className="w-3.5 h-3.5" /> Registered user
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={form.company_id || 'none'} onValueChange={v => setForm(f => ({ ...f, company_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No company</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Personal Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth || ''} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
                  <div><Label>Spouse / Partner</Label><Input value={form.spouse_name || ''} onChange={e => setForm(f => ({ ...f, spouse_name: e.target.value }))} maxLength={200} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} maxLength={500} /></div>
                <div><Label>License / ID Number</Label><Input value={form.license_number || ''} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} maxLength={100} /></div>
                <div><Label>Interests / Hobbies</Label><Input value={form.interests || ''} onChange={e => setForm(f => ({ ...f, interests: e.target.value }))} placeholder="e.g. Golf, AFL, Cooking" maxLength={500} /></div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Custom Fields</h3>
                {Object.entries(form.custom_fields || {}).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="flex-1 text-sm"><span className="text-muted-foreground">{key}:</span> <span className="font-medium">{val}</span></div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCustomField(key)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input placeholder="Field name" value={customFieldKey} onChange={e => setCustomFieldKey(e.target.value)} className="flex-1" maxLength={100} />
                  <Input placeholder="Value" value={customFieldValue} onChange={e => setCustomFieldValue(e.target.value)} className="flex-1" maxLength={500} />
                  <Button variant="outline" size="sm" onClick={addCustomField} disabled={!customFieldKey.trim()}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Your Notes</Label>
                <Textarea value={form.broker_notes || ''} onChange={e => setForm(f => ({ ...f, broker_notes: e.target.value }))} placeholder="Private notes about this agent..." rows={4} maxLength={5000} />
              </div>

              <Button onClick={saveProfile} className="w-full" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}