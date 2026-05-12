import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { PenLine } from 'lucide-react';

export function EmailSignatureSettings() {
  const { user } = useAuth();
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('email_signature')
        .eq('user_id', user.id)
        .maybeSingle();
      setSignature((data as any)?.email_signature || '');
      setLoading(false);
    })();
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ email_signature: signature })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Signature saved');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="w-5 h-5" /> My email signature
        </CardTitle>
        <CardDescription>
          Appended to the bottom of emails you send (e.g. milestone updates). Plain text — line breaks are preserved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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