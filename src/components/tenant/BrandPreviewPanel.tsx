import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, Upload, RotateCcw, ExternalLink } from 'lucide-react';
import { setBrandPreview, saveBrandPreviewConfig, clearBrandPreview, getBrandPreviewConfig } from '@/lib/brandPreview';

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

/**
 * Demo the whole platform in a prospect's branding — logo, name and colours —
 * without saving anything. Session-only, so your own brand is untouched.
 */
export function BrandPreviewPanel() {
  const existing = getBrandPreviewConfig();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(existing?.name ?? '');
  const [logoUrl, setLogoUrl] = useState<string | null>(existing?.logoUrl ?? null);
  const [primaryHex, setPrimaryHex] = useState('#1d4ed8');
  const [accentHex, setAccentHex] = useState('#e2e8f0');

  const pickLogo = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Please use a logo under 2MB for the demo');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const buildBrand = () => ({
    name: name.trim() || 'Preview brand',
    logoUrl,
    primary_color: hexToHsl(primaryHex) ?? '',
    accent_color: hexToHsl(accentHex) ?? '',
  });

  const start = () => {
    setBrandPreview(buildBrand());
    toast.success('Demo branding on in this tab only — your team still sees your brand');
  };

  /** Opens a clean, sample-data copy of the app in their branding. */
  const launchDemo = () => {
    saveBrandPreviewConfig(buildBrand());
    window.open('/admin?preview=true', '_blank', 'noopener');
  };


  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Eye className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Demo for a prospect</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Drop in their logo and colours, then open a demo window: the whole platform appears in their
        branding, filled with realistic sample deals, contacts and settlements. None of your live client
        data is loaded, nothing is saved, and your own brand is unaffected.
      </p>


      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Their business name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Finance" />
        </div>
        <div className="space-y-2">
          <Label>Their logo</Label>
          <div className="flex items-center gap-3">
            <div className="h-12 w-28 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
              {logoUrl
                ? <img src={logoUrl} alt="Prospect logo preview" className="max-h-10 max-w-24 object-contain" />
                : <span className="text-xs text-muted-foreground">No logo</span>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickLogo(f); }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />Choose file
            </Button>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Primary colour</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={primaryHex} onChange={e => setPrimaryHex(e.target.value)}
              className="h-10 w-14 rounded border bg-background" />
            <Input value={primaryHex} onChange={e => setPrimaryHex(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Accent colour</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={accentHex} onChange={e => setAccentHex(e.target.value)}
              className="h-10 w-14 rounded border bg-background" />
            <Input value={accentHex} onChange={e => setAccentHex(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={launchDemo}>
          <ExternalLink className="w-4 h-4 mr-2" />Open demo app (sample data)
        </Button>
        <Button variant="outline" onClick={start}>
          <Eye className="w-4 h-4 mr-2" />Preview branding here
        </Button>
        <Button variant="outline" onClick={() => { clearBrandPreview(); toast.success('Back to your brand'); }}>
          <RotateCcw className="w-4 h-4 mr-2" />Reset to my brand
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        "Open demo app" is the safe one to screen-share: it runs on sample data only. x
      </p>

    </div>
  );
}
