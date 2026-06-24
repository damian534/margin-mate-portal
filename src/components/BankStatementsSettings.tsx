import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Banknote, ExternalLink } from 'lucide-react';

/**
 * Per-broker setting for the unique bankstatements.com.au share link.
 * This URL is auto-substituted into every Bank Statements document request
 * description, so clients always receive the broker-specific upload link.
 */
export function BankStatementsSettings() {
  const { user, isPreviewMode } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isPreviewMode || !user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('bankstatements_url')
        .eq('user_id', user.id)
        .maybeSingle();
      setUrl(((data as any)?.bankstatements_url as string) || '');
      setLoading(false);
    })();
  }, [user, isPreviewMode]);

  const save = async () => {
    if (!user) return;
    const trimmed = url.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      toast.error('URL must start with https://');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ bankstatements_url: trimmed || null } as any)
      .eq('user_id', user.id);
    setSaving(false);
    if (error) { toast.error('Failed to save: ' + error.message); return; }
    toast.success('Bank statements URL saved');
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Banknote className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Bank Statements share link</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Your unique <strong>bankstatements.com.au</strong> link. It's pasted into
        every Bank Statements document request automatically so clients always
        see the correct broker-specific URL.
      </p>
      <div className="space-y-2">
        <Label htmlFor="bs-url">Share URL</Label>
        <Input
          id="bs-url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://scv.bankstatements.com.au/XXXX-XXXX"
          disabled={loading || isPreviewMode}
        />
        {url && /^https?:\/\//i.test(url) && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" /> Test link
          </a>
        )}
      </div>
      <div>
        <Button onClick={save} disabled={saving || loading || isPreviewMode}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}