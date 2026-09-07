import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { CheckCircle2, ExternalLink, FileText, Loader2, Shield } from 'lucide-react';
import { SignaturePad } from '@/components/esign/SignaturePad';
import { PdfCanvas } from '@/components/esign/PdfCanvas';

interface SignField {
  id: string;
  field_type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox';
  page_number: number;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
  required: boolean;
  value: string | null;
}

interface PortalData {
  document: { id: string; title: string; message: string | null; status: string; file_name: string; file_url: string | null };
  signer: { name: string; email: string; status: string; signed_at: string | null };
  waiting_on: string[];
  sender: string;
  fields?: SignField[];
}

export default function SignDocument() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [fullName, setFullName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [sigType, setSigType] = useState<'drawn' | 'typed'>('drawn');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      if (!token) { setError('Invalid link'); setLoading(false); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/esign-portal?token=${encodeURIComponent(token)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'This signing link is invalid or has expired.');
        setLoading(false);
        return;
      }
      const json = (await res.json()) as PortalData;
      setData(json);
      setFullName(json.signer.name || '');
      setDone(json.signer.status === 'signed');
      const seed: Record<string, string> = {};
      (json.fields || []).forEach(f => {
        if (f.field_type === 'date') seed[f.id] = f.value || new Date().toLocaleDateString('en-AU');
        else if (f.field_type === 'text') seed[f.id] = f.value || '';
        else if (f.field_type === 'checkbox') seed[f.id] = f.value || '';
      });
      setFieldValues(seed);
      setLoading(false);
    };
    load();
  }, [token]);

  const submit = async () => {
    if (!signature) { toast.error('Please add your signature first'); return; }
    if (!fullName.trim()) { toast.error('Please enter your full name'); return; }
    if (!agreed) { toast.error('Please confirm you agree to sign electronically'); return; }
    setSubmitting(true);
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/esign-sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        signature,
        typed_name: fullName.trim(),
        signature_type: sigType,
        fields: (data?.fields || []).map(f => ({
          id: f.id,
          value: f.field_type === 'signature' || f.field_type === 'initials'
            ? 'signed'
            : f.field_type === 'checkbox'
              ? (fieldValues[f.id] === 'checked' ? 'checked' : '')
              : (fieldValues[f.id] || ''),
        })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || 'Could not record your signature');
      return;
    }
    setDone(true);
    toast.success('Signed — thank you');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 font-[Poppins,sans-serif]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <CardTitle>Link unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const waiting = data.waiting_on.length > 0 && !done;
  const fields = data.fields || [];

  return (
    <div className="min-h-screen bg-background font-[Poppins,sans-serif]">
      <Sonner />
      <div className="max-w-3xl mx-auto p-4 py-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">{data.document.title}</h1>
          <p className="text-sm text-muted-foreground">Sent by {data.sender}</p>
        </div>

        {data.document.message && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{data.document.message}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">{data.document.file_name}</span>
              </div>
              {data.document.file_url && (
                <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
                  <a href={data.document.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </a>
                </Button>
              )}
            </div>
            {data.document.file_url && data.document.file_name.toLowerCase().endsWith('.pdf') && (
              fields.length > 0 ? (
                <div className="max-h-[70vh] overflow-y-auto rounded-lg border bg-muted/40 p-2">
                  <PdfCanvas
                    src={data.document.file_url}
                    width={640}
                    overlay={pageNumber => (
                      <>
                        {fields.filter(f => f.page_number === pageNumber).map(f => {
                          const style = {
                            left: `${f.x_pct * 100}%`,
                            top: `${f.y_pct * 100}%`,
                            width: `${f.width_pct * 100}%`,
                            height: `${f.height_pct * 100}%`,
                          } as const;
                          if (f.field_type === 'signature' || f.field_type === 'initials') {
                            return (
                              <div key={f.id} className="absolute rounded border-2 border-dashed border-primary/70 bg-primary/10 flex items-center justify-center overflow-hidden" style={style}>
                                {signature
                                  ? <img src={signature} alt="Your signature" className="max-w-full max-h-full object-contain" />
                                  : <span className="text-[9px] font-medium text-primary px-1 truncate">
                                      {f.field_type === 'initials' ? 'Initials here' : 'Sign here'}
                                    </span>}
                              </div>
                            );
                          }
                          if (f.field_type === 'checkbox') {
                            const checked = fieldValues[f.id] === 'checked';
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setFieldValues(p => ({ ...p, [f.id]: checked ? '' : 'checked' }))}
                                className="absolute rounded border-2 border-primary/70 bg-white/90 flex items-center justify-center"
                                style={style}
                                aria-label="Tick box"
                              >
                                {checked && <CheckCircle2 className="w-full h-full text-primary p-[1px]" />}
                              </button>
                            );
                          }
                          return (
                            <input
                              key={f.id}
                              value={fieldValues[f.id] || ''}
                              onChange={e => setFieldValues(p => ({ ...p, [f.id]: e.target.value }))}
                              placeholder={f.field_type === 'date' ? 'Date' : 'Type here'}
                              className="absolute rounded border-2 border-dashed border-primary/70 bg-white/90 text-[10px] px-1"
                              style={style}
                            />
                          );
                        })}
                      </>
                    )}
                  />
                </div>
              ) : (
                <iframe
                  title="Document preview"
                  src={data.document.file_url}
                  className="w-full h-[520px] rounded-lg border bg-muted"
                />
              )
            )}
          </CardContent>
        </Card>

        {done ? (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
              <p className="font-medium">You've signed this document</p>
              <p className="text-sm text-muted-foreground">A copy will be sent to you once everyone has signed.</p>
            </CardContent>
          </Card>
        ) : waiting ? (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <Badge variant="outline">Waiting</Badge>
              <p className="text-sm text-muted-foreground">
                {data.waiting_on.join(', ')} {data.waiting_on.length > 1 ? 'need' : 'needs'} to sign before you.
                We'll email you when it's your turn.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your signature</CardTitle>
              <CardDescription>
                {fields.length > 0
                  ? 'Draw or type your signature — it will appear in the highlighted spots above.'
                  : 'Draw or type your signature, then confirm to sign.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SignaturePad
                fullName={fullName}
                onFullNameChange={setFullName}
                onChange={(url, type) => { setSignature(url); setSigType(type); }}
              />
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox checked={agreed} onCheckedChange={v => setAgreed(v === true)} className="mt-0.5" />
                <span>
                  I agree to sign this document electronically and accept that my electronic signature is
                  legally binding. My name, email, date, time and IP address will be recorded.
                </span>
              </label>
              <Button className="w-full rounded-full" disabled={submitting} onClick={submit}>
                {submitting ? 'Signing…' : 'Sign document'}
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground pt-2">
          Securely transmitted and stored. Questions? Reply to the email that sent you this link.
        </p>
      </div>
    </div>
  );
}
