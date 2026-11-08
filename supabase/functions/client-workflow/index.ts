import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { normalizeSmsPhone } from '../_shared/smsPhone.ts';
import { renderWorkflowText, clientSendBlock } from './rules.ts';

const stepSchema = z.object({ channel: z.enum(['email','sms']), subject: z.string().max(200), message: z.string().trim().min(1).max(2000) });
const schema = z.union([
  z.object({ run_id: z.string().uuid(), dispatch_token: z.string().uuid() }),
  z.object({ action: z.literal('save'), id: z.string().uuid().optional(), broker_id: z.string().uuid(), name: z.string().trim().min(1).max(120), active: z.boolean(), steps: z.array(stepSchema).min(1).max(10) }),
  z.object({ action: z.literal('dry_run'), workflow_id: z.string().uuid(), lead_id: z.string().uuid() }),
  z.object({ action: z.literal('delete'), workflow_id: z.string().uuid() }),
]);
const json = (data: unknown, status=200) => new Response(JSON.stringify(data), {status,headers:{...corsHeaders,'Content-Type':'application/json'}});

Deno.serve(async req => {
  if (req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  if (req.method!=='POST') return json({error:'Method not allowed'},405);
  const db=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'');
  let runId: string | undefined;
  try {
    const parsed=schema.safeParse(await req.json().catch(()=>null));
    if (!parsed.success) return json({error:'Check the workflow name and messages',details:parsed.error.flatten()},400);
    const input=parsed.data;
    let workflow: { id: string; broker_id: string; active: boolean; steps: unknown };
    let leadId: string;
    let dryRun=false;
    if ('run_id' in input) {
      const {data: dispatch}=await db.from('client_workflow_dispatch').select('run_id').eq('run_id',input.run_id).eq('token',input.dispatch_token).maybeSingle();
      if (!dispatch) return json({error:'Invalid dispatch'},401);
      const {data:run,error}=await db.from('client_workflow_runs').update({status:'running'}).eq('id',input.run_id).eq('status','pending').select('*').maybeSingle();
      if(error) throw error;
      if(!run) return json({error:'Run already processed'},409);
      runId=run.id;
      const {data:w}=await db.from('client_workflows').select('id,broker_id,active,steps').eq('id',run.workflow_id).eq('broker_id',run.broker_id).single();
      if(!w?.active) {
        await db.from('client_workflow_runs').update({status:'cancelled',finished_at:new Date().toISOString()}).eq('id',run.id);
        return json({ok:true,cancelled:true});
      }
      workflow={...w,steps:run.steps}; leadId=run.lead_id;
    } else {
      const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
      if(!token) return json({error:'Sign in to manage workflows'},401);
      const {data:auth,error}=await db.auth.getUser(token);
      if(error||!auth.user) return json({error:'Sign in to manage workflows'},401);
      const {data:roles}=await db.from('user_roles').select('role').eq('user_id',auth.user.id);
      const superAdmin=roles?.some(r=>r.role==='super_admin');
      const broker=roles?.some(r=>r.role==='broker');
      const canManage=(id:string)=>superAdmin||(broker&&id===auth.user.id);
      if(input.action==='save') {
        if(!canManage(input.broker_id)) return json({error:'Broker or administrator access required'},403);
        if(input.steps.some(s=>s.channel==='email'&&!s.subject.trim())) return json({error:'Email subject is required'},400);
        const row={broker_id:input.broker_id,name:input.name,active:input.active,steps:input.steps};
        const result=input.id ? await db.from('client_workflows').update(row).eq('id',input.id).eq('broker_id',input.broker_id).select('id').single() : await db.from('client_workflows').insert(row).select('id').single();
        if(result.error) throw result.error;
        return json({ok:true,id:result.data.id});
      }
      const {data:w}=await db.from('client_workflows').select('id,broker_id,active,steps').eq('id',input.workflow_id).single();
      if(!w||!canManage(w.broker_id)) return json({error:'Workflow not available'},403);
      if(input.action==='delete') {
        const {data:runs}=await db.from('client_workflow_runs').select('id').eq('workflow_id',w.id).limit(1);
        if(runs?.length) return json({error:'This workflow has history. Switch it off instead of deleting.'},409);
        const {error:e}=await db.from('client_workflows').delete().eq('id',w.id);
        if(e) throw e;
        return json({ok:true});
      }
      workflow=w;leadId=input.lead_id;dryRun=true;
    }
    const {data:lead}=await db.from('leads').select('id,first_name,last_name,email,phone,source_contact_id').eq('id',leadId).eq('broker_id',workflow.broker_id).single();
    if(!lead) throw new Error('Client lead not available');
    const validated=z.array(stepSchema).min(1).max(10).safeParse(workflow.steps);
    if(!validated.success) throw new Error('Invalid saved workflow steps');
    const {data:profile}=await db.from('profiles').select('full_name').eq('user_id',workflow.broker_id).maybeSingle();
    const values={first_name:lead.first_name,last_name:lead.last_name,broker_name:profile?.full_name??'Your broker'};
    const results: Record<string,unknown>[]=[];
    for (const [index,step] of validated.data.entries()) {
      const recipient=step.channel==='sms'?normalizeSmsPhone(lead.phone??''):(lead.email??'').trim().toLowerCase();
      const consentType=step.channel==='sms'?'sms_follow_up':'email_follow_up';
      const {data:consents,error:consentError}=await db.from('lead_consents').select('granted').eq('lead_id',lead.id).eq('consent_type',consentType).is('applicant_id',null).order('updated_at',{ascending:false}).limit(1);
      const {data:optouts,error:optoutError}=await db.from('client_workflow_optouts').select('id').eq('broker_id',workflow.broker_id).eq('channel',step.channel).eq('recipient',recipient??'');
      if(consentError||optoutError) throw new Error('Could not verify client messaging permissions');
      let optedOut=!!optouts?.length;
      if(step.channel==='email'&&recipient) {
        const {data:suppression}=await db.from('email_suppressions').select('id').eq('broker_id',workflow.broker_id).ilike('email',recipient);
        optedOut=optedOut||!!suppression?.length;
        if(lead.source_contact_id) {
          const {data:contact}=await db.from('contacts').select('email_opt_out').eq('id',lead.source_contact_id).maybeSingle();
          optedOut=optedOut||!!contact?.email_opt_out;
        }
      }
      const subject=renderWorkflowText(step.subject,values);
      const message=renderWorkflowText(step.message,values);
      let blocked=clientSendBlock(step.channel,consents?.[0]?.granted??false,optedOut,!!recipient);
      // Email infrastructure must be configured and its template registered before enabling delivery.
      if(!blocked&&step.channel==='email') blocked='Email sender setup is pending';
      const result: Record<string,unknown>={step:index+1,channel:step.channel,subject,message,status:blocked?'skipped':dryRun?'ready':'pending',reason:blocked};
      if(!blocked&&!dryRun&&recipient&&step.channel==='sms') {
        const {data:settings}=await db.from('broker_email_settings').select('sms_sender_phone').eq('broker_id',workflow.broker_id).maybeSingle();
        const from=normalizeSmsPhone(settings?.sms_sender_phone??'');
        const key=Deno.env.get('LOVABLE_API_KEY');const connectionKey=Deno.env.get('TWILIO_API_KEY');
        if(!from||!key||!connectionKey) {result.status='skipped';result.reason='Twilio sending number is not configured';}
        else {
          const {data:unsub,error:unsubError}=await db.from('client_workflow_unsubscribe').insert({broker_id:workflow.broker_id,lead_id:lead.id,channel:'sms',recipient}).select('token').single();
          if(unsubError) throw unsubError;
          const response=await fetch('https://connector-gateway.lovable.dev/twilio/Messages.json',{method:'POST',headers:{Authorization:`Bearer ${key}`,'X-Connection-Api-Key':connectionKey,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({To:recipient,From:from,Body:`${message}\nOpt out: ${Deno.env.get('SUPABASE_URL')}/functions/v1/workflow-unsubscribe?t=${unsub.token}`})});
          if(!response.ok) { const details=await response.text();console.error(`Twilio workflow failed [${response.status}]: ${details}`);result.status='failed';result.reason=`[${response.status}]: ${details}`; }
          else {const data=await response.json();result.status='accepted';result.provider_id=data.sid;
            await db.from('lead_communications').insert({lead_id:lead.id,channel:'sms',direction:'outbound',body:message,participant_contact:recipient,subject:'Workflow follow-up'});
          }
        }
      }
      results.push(result);
      if(runId) await db.from('client_workflow_runs').update({results}).eq('id',runId);
    }
    if(runId) {
      await db.from('client_workflow_runs').update({status:results.some(r=>r.status==='failed')?'failed':'completed',results,finished_at:new Date().toISOString()}).eq('id',runId);
      await db.from('client_workflow_dispatch').delete().eq('run_id',runId);
    }
    return json({ok:true,dry_run:dryRun,results});
  } catch(error) {
    const message=error instanceof Error?error.message:'Workflow failed';
    if(runId) await db.from('client_workflow_runs').update({status:'failed',results:[{status:'failed',reason:message}],finished_at:new Date().toISOString()}).eq('id',runId);
    return json({error:message},500);
  }
});