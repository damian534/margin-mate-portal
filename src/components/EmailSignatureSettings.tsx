import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { PenLine, Upload, X } from 'lucide-react';

async function resizeImage(file: File, maxW = 600, maxH = 200, quality = 0.85): Promise<Blob> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const isPng = file.type === 'image/png';
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Resize failed'))), isPng ? 'image/png' : 'image/jpeg', quality)
  );
}

export function EmailSignatureSettings() {
  const { user } = useAuth();
  const [signature, setSignature] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('email_signature, email_signature_image_url')
        .eq('user_id', user.id)
        .maybeSingle();
      setSignature((data as any)?.email_signature || '');
      setImageUrl((data as any)?.email_signature_image_url || null);
      setLoading(false);
    })();
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ email_signature: signature, email_signature_image_url: imageUrl })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Signature saved');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user?.id) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image must be under 15MB');
      return;
    }
    setUploading(true);
    let blob: Blob = file;
    let contentType = file.type || 'image/png';
    let ext = file.name.split('.').pop() || 'png';
    try {
      blob = await resizeImage(file);
      contentType = blob.type;
      ext = contentType === 'image/png' ? 'png' : 'jpg';
    } catch {
      // fall back to original if resize fails
    }
    const path = `${user.id}/signature-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('signature-images')
      .upload(path, blob, { upsert: true, contentType });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { data } = supabase.storage.from('signature-images').getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
    toast.success(`Image uploaded (${(blob.size / 1024).toFixed(0)} KB) — click Save signature`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="w-5 h-5" /> My email signature
        </CardTitle>
        <CardDescription>
          Appended to the bottom of emails you send (e.g. milestone updates). Plain text — line breaks are preserved. Add an optional image (logo or headshot).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Signature image (optional)</Label>
          {imageUrl ? (
            <div className="flex items-start gap-3">
              <img src={imageUrl} alt="Signature" className="max-h-24 rounded border bg-white" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(null)}>
                <X className="w-4 h-4 mr-1" /> Remove
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-1.5" /> {uploading ? 'Uploading…' : 'Upload image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
            </Button>
          )}
          <p className="text-xs text-muted-foreground">PNG/JPG. Auto-resized to max 600×200px. Appears below your signature text.</p>
        </div>
        <Label>Signature</Label>
        <Textarea
          rows={10}
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder={`Kind regards,\nJane Smith\nFinance Broker | Margin Finance\n0400 000 000 | jane@margin.com.au`}
          disabled={loading}
        />
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save signature'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}