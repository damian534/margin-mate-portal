import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
const page=(text:string,status=200)=>new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Margin Connect — Message preferences</title></head><body><main><h1>Message preferences</h1><p>${text}</p></main></body></html>`,{status,headers:{...corsHeaders,'Content-Type':'text/html; charset=utf-8'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
 const token=z.string().uuid().safeParse(new URL(req.url).searchParams.get('t'));
 if(!token.success) return page('This link is invalid.',400);
 const db=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'');
 const {data:record}=await db.from('client_workflow_unsubscribe').select('broker_id,channel,recipient').eq('token',token.data).maybeSingle();
 if(!record) return page('This link is no longer available.',404);
 if(req.method==='GET') return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Margin Connect — Message preferences</title></head><body><h1>Stop automated follow-ups?</h1><form method="post"><button type="submit">Stop automated messages</button></form></body></html>`,{headers:{...corsHeaders,'Content-Type':'text/html; charset=utf-8'}});
 if(req.method!=='POST') return page('Method not allowed.',405);
 const {error}=await db.from('client_workflow_optouts').upsert(record,{onConflict:'broker_id,channel,recipient'});
 return error?page('We could not save your preference. Please try again.',500):page('You will no longer receive automated follow-ups on this channel from this brokerage.');
});