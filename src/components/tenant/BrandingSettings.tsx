import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Palette, Upload, Globe, MailCheck, ShieldCheck, AlertTriangle } from 'lucide-react';

/** Convert a #rrggbb hex value into the "H S% L%" string the theme tokens expect. */
function hexToHsl(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  const [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hsl: string): string {
  const m = /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/.exec(hsl.trim());
  if (!m) return '#000000';
  const h = parseFloat(m[1]) / 360, s = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100;
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function BrandingSettings() {
  const { isPreviewMode } = useAuth();
  const { tenantFull, refresh, isTenantOwner } = useTenant();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: '', legal_name: '', custom_domain: '', support_email: '',
    sender_name: '', sender_email: '', primary_color: '', accent_color: '', logo_url: '',
  });

  useEffect(() => {
    if (!tenantFull) return;
    setForm({
      name: tenantFull.name ?? '',
      legal_name: tenantFull.legal_name ?? '',
      custom_domain: tenantFull.custom_domain ?? '',
      support_email: tenantFull.support_email ?? '',
      sender_name: tenantFull.sender_name ?? '',
      sender_email: tenantFull.sender_email ?? '',
      primary_color: tenantFull.primary_color ?? '',
      accent_color: tenantFull.accent_color ?? '',
      logo_url: tenantFull.logo_url ?? '',
    });
  }, [tenantFull]);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const uploadLogo = async (file: File) => {
    if (!tenantFull) return;
    setUploading(true);
    const ext = file.name.split('.').pop() || 'png';
    const path = `${tenantFull.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('tenant-branding').upload(path, file, { upsert: true });
    if (error) { setUploading(false); toast.error('Upload failed: ' + error.message); return; }
    const { data } = await supabase.storage.from('tenant-branding').createSignedUrl(path, TEN_YEARS);
    setUploading(false);
    if (!data?.signedUrl) { toast.error('Could not generate logo link'); return; }
    set('logo_url', data.signedUrl);
    toast.success('Logo uploaded — remember to save');
  };

  const save = async () => {
    if (!tenantFull) return;
    setSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        name: form.name.trim(),
        legal_name: form.legal_name.trim() || null,
        custom_domain: form.custom_domain.trim().toLowerCase() || null,
        support_email: form.support_email.trim() || null,
        sender_name: form.sender_name.trim() || null,
        sender_email: form.sender_email.trim() || null,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        logo_url: form.logo_url || null,
      } as any)
      .eq('id', tenantFull.id);
    setSaving(false);
    if (error) { toast.error('Failed to save: ' + error.message); return; }
    toast.success('Branding saved');
    refresh();
  };

  if (!tenantFull) {
    return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading brand settings…</div>;
  }

  const readOnly = isPreviewMode || !isTenantOwner;

  return (
    <div className="space-y-6 max-w-3xl">
      {readOnly && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          Only the account owner for this brokerage can change branding.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Brand</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>Legal entity name</Label>
            <Input value={form.legal_name} onChange={e => set('legal_name', e.target.value)} disabled={readOnly} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="h-16 w-40 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
              {form.logo_url
                ? <img src={form.logo_url} alt="Logo preview" className="max-h-14 max-w-36 object-contain" />
                : <span className="text-xs text-muted-foreground">No logo</span>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
            />
            <Button variant="outline" disabled={readOnly || uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />{uploading ? 'Uploading…' : 'Upload logo'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">PNG or SVG with a transparent background works best. Max 5MB.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Primary colour</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hslToHex(form.primary_color)}
                disabled={readOnly}
                onChange={e => { const h = hexToHsl(e.target.value); if (h) set('primary_color', h); }}
                className="h-10 w-14 rounded border bg-background"
              />
              <Input value={form.primary_color} onChange={e => set('primary_color', e.target.value)} disabled={readOnly} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Accent colour</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hslToHex(form.accent_color)}
                disabled={readOnly}
                onChange={e => { const h = hexToHsl(e.target.value); if (h) set('accent_color', h); }}
                className="h-10 w-14 rounded border bg-background"
              />
              <Input value={form.accent_color} onChange={e => set('accent_color', e.target.value)} disabled={readOnly} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Domain &amp; email</h2>
        </div>

        <div className="space-y-2">
          <Label>Custom domain</Label>
          <Input
            value={form.custom_domain}
            onChange={e => set('custom_domain', e.target.value)}
            placeholder="connect.yourbrokerage.com.au"
            disabled={readOnly}
          />
          <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">DNS records to add at your registrar</p>
            <p><code>A</code> &nbsp; <code>@</code> or your subdomain &nbsp;→&nbsp; <code>185.158.133.1</code></p>
            <p><code>TXT</code> &nbsp; <code>_lovable</code> &nbsp;→&nbsp; verification value shown when the domain is connected</p>
            <p>Once DNS resolves, the login screen on that domain loads this brand automatically.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Support email</Label>
            <Input value={form.support_email} onChange={e => set('support_email', e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>Sender name (outgoing email)</Label>
            <Input value={form.sender_name} onChange={e => set('sender_name', e.target.value)} disabled={readOnly} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Sender email</Label>
          <Input value={form.sender_email} onChange={e => set('sender_email', e.target.value)} placeholder="noreply@yourbrokerage.com.au" disabled={readOnly} />
          <div className={`inline-flex items-center gap-1.5 text-xs ${tenantFull.sender_domain_verified ? 'text-emerald-600' : 'text-amber-600'}`}>
            {tenantFull.sender_domain_verified
              ? <><ShieldCheck className="w-3.5 h-3.5" /> Sending domain verified</>
              : <><MailCheck className="w-3.5 h-3.5" /> Sending domain not yet verified — client emails will fall back to the platform sender</>}
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving || readOnly}>{saving ? 'Saving…' : 'Save branding'}</Button>
    </div>
  );
}
