import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Loader2, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { factFindCall, type FactFindAnswers, type FactFindLegal } from '@/lib/factFindApi';
import { privacyDraft, validConsent, creditText } from '../../supabase/functions/_shared/factFindRules';

export default function FactFindClient() {
  const { token } = useParams(); const demo = token === 'preview';
  const [answers, setAnswers] = useState<FactFindAnswers>({}); const [step, setStep] = useState(0);
  const [legal, setLegal] = useState<FactFindLegal | null>(null); const [ready, setReady] = useState(false);
  const [consented, setConsented] = useState(false); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [saveError, setSaveError] = useState(''); const [saved, setSaved] = useState(false); const [busy, setBusy] = useState(false);
  const revision = useRef(0); const latest = useRef({ answers, step }); const queue = useRef<Promise<void>>(Promise.resolve()); const timer = useRef<ReturnType<typeof setTimeout>>();
  const business = legal?.business_name || 'your broker';
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (demo) {
          const cached = sessionStorage.getItem('fact-find-preview'); const draft = cached ? JSON.parse(cached) : null;
          if (!active) return;
          setAnswers(draft?.answers ?? {}); setStep(draft?.step ?? 0); setConsented(draft?.step > 0);
          latest.current = { answers: draft?.answers ?? {}, step: draft?.step ?? 0 };
          setLegal({ business_name: 'Margin Finance', privacy_url: '', credit_guide_url: '', privacy_summary: privacyDraft, privacy_version: 'Preview only', approved: false }); setReady(true);
        } else {
          const data = await factFindCall({ action: 'load', token }); if (!active) return;
          setAnswers(data.applicant.answers); setStep(data.applicant.current_step); revision.current = data.applicant.revision;
          latest.current = { answers: data.applicant.answers, step: data.applicant.current_step };
          setLegal(data.legal); setReady(data.ready); setConsented(!!data.consent);
        }
        setSaved(true);
      } catch (e) { if (active) setError((e as Error).message); }
      finally { if (active) setLoading(false); }
    }; void load();
    return () => { active = false; if (timer.current) clearTimeout(timer.current); };
  }, [token, demo]);
  const save = (snapshot = latest.current) => {
    setSaved(false); setSaveError('');
    const work = queue.current.catch(() => {}).then(async () => {
      if (demo) sessionStorage.setItem('fact-find-preview', JSON.stringify(snapshot));
      else { const data = await factFindCall({ action: 'save', token, revision: revision.current, answers: snapshot.answers, step: snapshot.step }); revision.current = data.revision; }
      if (latest.current === snapshot) setSaved(true);
    });
    queue.current = work;
    work.catch(e => setSaveError((e as Error).message));
    return work;
  };
  const change = (patch: Partial<FactFindAnswers>) => {
    const next = { ...latest.current.answers, ...patch }; setAnswers(next); latest.current = { answers: next, step };
    setSaved(false); if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(); }, 400);
  };
  const move = async (next: number) => {
    setBusy(true); if (timer.current) clearTimeout(timer.current);
    const previous = latest.current;
    try {
      await save();
      if (step === 0 && next > 0 && !consented) {
        if (!validConsent(answers)) throw new Error('Tick both boxes and enter your full name.');
        if (!demo) await factFindCall({ action: 'consent', token, answers, version: legal?.privacy_version });
        setConsented(true);
      }
      const snapshot = { answers: latest.current.answers, step: next }; latest.current = snapshot;
      await save(snapshot); setStep(next); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { latest.current = previous; setSaveError((e as Error).message); } finally { setBusy(false); }
  };
  if (loading) return <main className="min-h-dvh grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading fact find" /></main>;
  if (error) return <main className="min-h-dvh grid place-items-center bg-background p-6"><div className="max-w-sm text-center space-y-4"><LockKeyhole className="w-9 h-9 mx-auto text-muted-foreground"/><h1 className="text-2xl font-semibold">Unable to open your fact find</h1><p className="text-muted-foreground">{error}</p></div></main>;
  return <main className="min-h-dvh bg-background font-[Poppins,sans-serif] text-foreground pb-36">
    <header className="max-w-xl mx-auto px-6 pt-5 space-y-4">
      <div className="flex items-center justify-between h-11"><Button variant="ghost" size="icon" aria-label="Back" disabled={step === 0 || busy} onClick={() => void move(step - 1)}><ArrowLeft className="w-5 h-5"/></Button><span className="text-sm font-medium">Fact Find</span><span className="w-11 text-right text-xs text-muted-foreground">{step === 0 ? '1' : '2'} / 7</span></div>
      <div className="h-1 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={step === 0 ? 0 : 14} aria-valuemin={0} aria-valuemax={100}><div className={`h-full bg-primary transition-all ${step === 0 ? 'w-0' : 'w-[14%]'}`}/></div>
      <div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>{demo ? 'Test preview · no legal consent recorded' : business}</span><span role="status" className="flex gap-1 items-center shrink-0">{saveError ? 'Not saved' : saved ? <><Check className="w-3 h-3"/>Saved</> : 'Saving…'}</span></div>
    </header>
    <section className="max-w-xl mx-auto px-6 pt-10 sm:pt-16 space-y-8">
      {step === 0 ? <>
        <div className="inline-flex bg-primary/10 text-primary p-3 rounded-lg"><ShieldCheck className="w-7 h-7"/></div>
        <div className="space-y-3"><p className="text-sm text-muted-foreground">Before we begin</p><h1 className="text-3xl font-semibold leading-tight">Your information.<br/>Your permission.</h1><p className="text-sm text-muted-foreground leading-7">{legal?.privacy_summary || privacyDraft}</p></div>
        {!ready && <p className="text-sm text-warning border-l-2 border-warning pl-3">Your broker is preparing the privacy documents. You can return to this link when they’re ready.</p>}
        <div className="flex flex-wrap gap-4 text-sm">{legal?.privacy_url && <a href={legal.privacy_url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">Privacy Policy ↗</a>}{legal?.credit_guide_url && <a href={legal.credit_guide_url} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">Credit Guide ↗</a>}</div>
        <div className="space-y-5"><label className="flex items-start gap-3 min-h-12 cursor-pointer"><Checkbox className="h-6 w-6 mt-0.5 shrink-0" checked={answers.privacy ?? false} disabled={!ready || consented} onCheckedChange={v => change({ privacy: v === true })}/><span className="text-sm leading-6">I’ve read and accept the Privacy Policy and Credit Guide.</span></label><label className="flex items-start gap-3 min-h-12 cursor-pointer"><Checkbox className="h-6 w-6 mt-0.5 shrink-0" checked={answers.credit ?? false} disabled={!ready || consented} onCheckedChange={v => change({ credit: v === true })}/><span className="text-sm leading-6">{creditText(business)}</span></label></div>
        <div className="space-y-2"><Label htmlFor="signature">Your full name</Label><Input id="signature" autoComplete="name" placeholder="Type your full name" className="h-14 text-base" maxLength={200} value={answers.typed_name ?? ''} disabled={consented} onChange={e => change({ typed_name: e.target.value })}/><p className="text-xs text-muted-foreground">Typing your name acts as your signature.</p></div>
      </> : step === 1 ? <>
        <div className="space-y-3"><p className="text-sm text-muted-foreground">About you</p><h1 className="text-3xl font-semibold">Let’s start with you.</h1></div>
        <div className="space-y-5">{[{ key: 'first_name', label: 'First name', type: 'text', autocomplete: 'given-name' }, { key: 'last_name', label: 'Last name', type: 'text', autocomplete: 'family-name' }, { key: 'email', label: 'Email', type: 'email', autocomplete: 'email' }, { key: 'phone', label: 'Mobile', type: 'tel', autocomplete: 'tel' }].map(field => <div key={field.key} className="space-y-2"><Label htmlFor={field.key}>{field.label}</Label><Input id={field.key} type={field.type} autoComplete={field.autocomplete} className="h-14 text-base" maxLength={field.key === 'phone' ? 30 : 100} value={answers[field.key as keyof FactFindAnswers] as string ?? ''} onChange={e => change({ [field.key]: e.target.value })}/></div>)}</div>
      </> : <>
        <Check className="w-10 h-10 text-success"/><div className="space-y-3"><h1 className="text-3xl font-semibold">Your progress is saved.</h1><p className="text-muted-foreground leading-7">The next sections are being prepared. This fact find has not been submitted. Your link will bring you back here.</p></div><div className="border-t border-border pt-5"><p className="text-sm text-muted-foreground">Saved for</p><p className="font-medium">{answers.first_name} {answers.last_name}</p></div>
      </>}
      {saveError && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{saveError}</p><Button variant="outline" disabled={busy} onClick={() => void save()}>Retry saving</Button></div>}
    </section>
    <footer className="fixed bottom-0 inset-x-0 bg-background border-t border-border"><div className="max-w-xl mx-auto px-6 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]"><Button className="w-full h-14 text-base gap-2" disabled={busy || step === 2 || (step === 0 && (!ready || !validConsent(answers)))} onClick={() => void move(step + 1)}>{busy ? <Loader2 className="w-5 h-5 animate-spin"/> : step === 2 ? 'Saved — more to come' : <>Continue<ArrowRight className="w-4 h-4"/></>}</Button></div></footer>
  </main>;
}