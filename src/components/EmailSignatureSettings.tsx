import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { PenLine, Upload, X } from 'lucide-react';

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
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop() || 'png';
    const path = `${user.id}/signature-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('signature-images')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { data } = supabase.storage.from('signature-images').getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
    toast.success('Image uploaded — click Save signature');
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
          <p className="text-xs text-muted-foreground">PNG/JPG, under 2MB. Appears above your signature text.</p>
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