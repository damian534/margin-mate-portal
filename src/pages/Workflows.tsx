import { useCallback, useEffect, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/AppHeader';
import { AppSideNav } from '@/components/AppSideNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Mail, MessageSquare, ArrowDown, Save, Trash2, FlaskConical, Workflow, UserPlus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkflowStep } from '../../supabase/functions/client-workflow/rules';

type Definition={id:string;name:string;active:boolean;steps:unknown};
type Run={id:string;workflow_name:string;lead_id:string;status:string;created_at:string;results:unknown};
type Check={step:number;channel:string;status:string;reason?:string;subject?:string;message?:string};
const emptyStep=(channel:'email'|'sms'):WorkflowStep=>({channel,subject:channel==='email'?'Thanks for your enquiry':'',message:'Hi {{first_name}}, thanks for your enquiry. {{broker_name}} will be in touch shortly.'});
function readSteps(value:unknown):WorkflowStep[] { return Array.isArray(value)?value.filter((s):s is WorkflowStep=>!!s&&typeof s==='object'&&['email','sms'].includes(s.channel)&&typeof s.message==='string'):[]; }
export default function Workflows(){
 const {effectiveBrokerId,isPreviewMode,role}=useAuth();
 const editable=!isPreviewMode&&['broker','super_admin'].includes(role??'');
 const [items,setItems]=useState<Definition[]>([]);const [runs,setRuns]=useState<Run[]>([]);
 const [id,setId]=useState<string>();const [name,setName]=useState('');const [active,setActive]=useState(false);const [steps,setSteps]=useState<WorkflowStep[]>([]);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [dirty,setDirty]=useState(false);
 const [leads,setLeads]=useState<{id:string;first_name:string;last_name:string}[]>([]);const [leadId,setLeadId]=useState('');const [checks,setChecks]=useState<Check[]>([]);
 const load=useCallback(async()=>{
  if(isPreviewMode||!effectiveBrokerId){setLoading(false);return;}
  const [w,r,l]=await Promise.all([
   supabase.from('client_workflows').select('id,name,active,steps').eq('broker_id',effectiveBrokerId).order('created_at',{ascending:false}),
   supabase.from('client_workflow_runs').select('id,workflow_name,lead_id,status,created_at,results').eq('broker_id',effectiveBrokerId).order('created_at',{ascending:false}).limit(100),
   supabase.from('leads').select('id,first_name,last_name').eq('broker_id',effectiveBrokerId).order('created_at',{ascending:false}).limit(100)
  ]);
  if(w.error||r.error||l.error)toast.error('Could not load workflows');
  setItems(w.data??[]);setRuns(r.data??[]);setLeads(l.data??[]);setLoading(false);
 },[effectiveBrokerId,isPreviewMode]);
 useEffect(()=>{void load();},[load]);
 const open=(w?:Definition)=>{setId(w?.id);setName(w?.name??'New lead follow-up');setActive(w?.active??false);setSteps(w?readSteps(w.steps):[emptyStep('email')]);setDirty(!w);setChecks([]);};
 const call=async(body:unknown)=>{
  const {data,error}=await supabase.functions.invoke('client-workflow',{body});
  if(error){let text=error.message;if(error instanceof FunctionsHttpError){const details=await error.context.json().catch(()=>null);text=details?.error??text;}throw new Error(text);}
  if(!data?.ok)throw new Error(data?.error??'Workflow request failed');return data;
 };
 const save=async()=>{if(!effectiveBrokerId||!editable)return;if(!name.trim()||!steps.length||steps.some(s=>!s.message.trim()||(s.channel==='email'&&!s.subject.trim()))){toast.error('Add a name, action and complete messages');return;}
  setBusy(true);try{const data=await call({action:'save',id,broker_id:effectiveBrokerId,name,active,steps});setId(data.id);setDirty(false);await load();toast.success(active?'Workflow switched on for new leads':'Workflow saved as draft');}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 };
 const preview=async()=>{if(!id||!leadId)return;setBusy(true);try{const data=await call({action:'dry_run',workflow_id:id,lead_id:leadId});setChecks(data.results);toast.success('Check complete — no messages sent');}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}};
 const remove=async()=>{if(!id||!window.confirm('Delete this workflow?'))return;setBusy(true);try{await call({action:'delete',workflow_id:id});setName('');setSteps([]);setId(undefined);await load();}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}};
 const change=(index:number,patch:Partial<WorkflowStep>)=>{setSteps(steps.map((s,i)=>i===index?{...s,...patch}:s));setDirty(true);};
 return <div className="min-h-screen bg-background"><AppHeader/><div className="flex"><div className="hidden lg:block"><AppSideNav/></div><main className="min-w-0 flex-1 p-4 md:p-8 space-y-6">
  <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold flex items-center gap-2"><Workflow className="w-6 h-6 text-primary"/>Workflows</h1></div><div className="flex gap-2"><Button variant="outline" size="icon" title="Refresh workflows" onClick={()=>load()}><RefreshCw className="w-4 h-4"/></Button><Button onClick={()=>open()} disabled={!editable}><Plus className="w-4 h-4 mr-2"/>New workflow</Button></div></header>
  <Tabs defaultValue="builder"><TabsList><TabsTrigger value="builder">Workflows</TabsTrigger><TabsTrigger value="history">Run history</TabsTrigger></TabsList>
   <TabsContent value="builder" className="mt-6"><div className="grid xl:grid-cols-[260px_minmax(0,1fr)] gap-8">
    <aside className="space-y-2">{loading?<p className="text-muted-foreground">Loading…</p>:items.length?items.map(w=><Button key={w.id} variant={id===w.id?'secondary':'ghost'} className="h-auto min-h-14 w-full justify-start text-left gap-3" onClick={()=>open(w)}><span className={`w-2 h-2 shrink-0 rounded-full ${w.active?'bg-success':'bg-muted-foreground'}`}/><span className="min-w-0"><span className="block whitespace-normal break-words">{w.name}</span><span className="text-xs text-muted-foreground">{w.active?'Active':'Draft'} · {readSteps(w.steps).length} actions</span></span></Button>):<p className="text-sm text-muted-foreground py-4">No workflows yet.</p>}</aside>
    {name?<div className="space-y-6 max-w-3xl min-w-0"><div className="flex flex-wrap items-end gap-4 border-b border-border pb-5"><div className="space-y-2 flex-1 min-w-[200px]"><Label htmlFor="workflow-name">Workflow name</Label><Input id="workflow-name" value={name} maxLength={120} disabled={!editable} onChange={e=>{setName(e.target.value);setDirty(true);}}/></div><div className="flex items-center gap-2 pb-2"><Switch id="workflow-active" checked={active} disabled={!editable} onCheckedChange={v=>{setActive(v);setDirty(true);}}/><Label htmlFor="workflow-active">Active</Label></div><Button onClick={save} disabled={!editable||busy}><Save className="w-4 h-4 mr-2"/>{busy?'Working…':'Save workflow'}</Button>{id&&<Button variant="outline" size="icon" title="Delete workflow" disabled={!editable||busy} onClick={remove}><Trash2 className="w-4 h-4"/></Button>}</div>
     <div className="flex items-center gap-3 py-3"><UserPlus className="w-5 h-5 text-success"/><div><p className="text-xs text-muted-foreground uppercase">Trigger</p><h2 className="font-medium">New lead received</h2></div></div>
     {steps.map((s,i)=><div key={i} className="space-y-4"><ArrowDown className="w-4 h-4 mx-auto text-muted-foreground"/><article className="border border-border rounded-lg p-4 md:p-5 space-y-4"><div className="flex items-center gap-3">{s.channel==='email'?<Mail className="w-5 h-5 text-info"/>:<MessageSquare className="w-5 h-5 text-success"/>}<h3 className="font-medium flex-1">{i+1}. Send {s.channel==='email'?'email':'SMS'} to client</h3><Button variant="ghost" size="icon" title="Remove action" disabled={!editable} onClick={()=>{setSteps(steps.filter((_,j)=>j!==i));setDirty(true);}}><Trash2 className="w-4 h-4"/></Button></div>{s.channel==='email'&&<div className="space-y-2"><Label htmlFor={`subject-${i}`}>Subject</Label><Input id={`subject-${i}`} value={s.subject} maxLength={200} disabled={!editable} onChange={e=>change(i,{subject:e.target.value})}/></div>}<div className="space-y-2"><Label htmlFor={`message-${i}`}>Message</Label><Textarea id={`message-${i}`} rows={5} maxLength={2000} value={s.message} disabled={!editable} onChange={e=>change(i,{message:e.target.value})}/></div><div className="flex flex-wrap gap-2">{['first_name','last_name','broker_name'].map(key=><Button key={key} size="sm" variant="outline" disabled={!editable} onClick={()=>change(i,{message:s.message+` {{${key}}}`})}>{key.replace(/_/g,' ')}</Button>)}</div><p className="text-xs text-muted-foreground">Client {s.channel==='email'?'email':'SMS'} follow-up consent required. {s.channel==='email'?'Email sender setup pending.':'Twilio charges apply; opt-out link included.'}</p></article></div>)}
     <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!editable||steps.length>=10} onClick={()=>{setSteps([...steps,emptyStep('email')]);setDirty(true);}}><Plus className="w-4 h-4 mr-2"/>Email</Button><Button variant="outline" disabled={!editable||steps.length>=10} onClick={()=>{setSteps([...steps,emptyStep('sms')]);setDirty(true);}}><Plus className="w-4 h-4 mr-2"/>SMS</Button></div>
     <section className="border-t border-border pt-6 space-y-4"><h2 className="font-medium">Check with a client — no messages sent</h2><div className="flex flex-wrap gap-2"><Select value={leadId} onValueChange={setLeadId}><SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Select a client"/></SelectTrigger><SelectContent>{leads.map(l=><SelectItem key={l.id} value={l.id}>{l.first_name} {l.last_name}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={!editable||busy||!id||dirty||!leadId} onClick={preview}><FlaskConical className="w-4 h-4 mr-2"/>Check workflow</Button></div>{checks.map(c=><div key={c.step} className="border-l-2 border-border pl-4 space-y-1"><p className="font-medium text-sm">{c.step}. {c.channel.toUpperCase()} · {c.status}</p>{c.reason&&<p className="text-warning text-sm">{c.reason}</p>}<p className="text-sm font-medium">{c.subject}</p><p className="text-sm whitespace-pre-wrap break-words">{c.message}</p></div>)}</section>
    </div>:<div className="py-16 text-center text-muted-foreground"><Workflow className="w-8 h-8 mx-auto mb-4"/><p>Select a workflow or create a new one.</p></div>}
   </div></TabsContent>
   <TabsContent value="history" className="mt-6 space-y-3">{runs.length?runs.map(r=><article key={r.id} className="border-b border-border py-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-medium">{r.workflow_name}</h2><span className="text-sm text-muted-foreground">{r.status} · {new Date(r.created_at).toLocaleString('en-AU')}</span></div><a className="text-primary text-sm" href={`/admin?lead=${r.lead_id}`}>Open client deal</a>{Array.isArray(r.results)&&r.results.map((result,i)=><p key={i} className="text-sm text-muted-foreground break-words">{String((result as unknown as Check).channel??'Run')} · {String((result as unknown as Check).status)} {(result as unknown as Check).reason??''}</p>)}</article>):<p className="text-muted-foreground py-8">No workflow runs yet.</p>}</TabsContent>
  </Tabs>
 </main></div></div>;
}