CREATE TABLE public.client_workflows (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), broker_id uuid NOT NULL, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120), active boolean NOT NULL DEFAULT false, steps jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_workflows TO authenticated; GRANT ALL ON public.client_workflows TO service_role;
ALTER TABLE public.client_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_read ON public.client_workflows FOR SELECT TO authenticated USING (broker_id = public.get_my_broker_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY workflow_write ON public.client_workflows FOR ALL TO authenticated USING ((broker_id=auth.uid() AND public.has_role(auth.uid(),'broker')) OR public.is_super_admin(auth.uid())) WITH CHECK ((broker_id=auth.uid() AND public.has_role(auth.uid(),'broker')) OR public.is_super_admin(auth.uid()));
CREATE TRIGGER workflow_updated BEFORE UPDATE ON public.client_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TABLE public.client_workflow_runs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workflow_id uuid NOT NULL REFERENCES public.client_workflows(id), broker_id uuid NOT NULL, lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE, workflow_name text NOT NULL, steps jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','completed','failed','cancelled')), results jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, UNIQUE(workflow_id,lead_id));
GRANT SELECT ON public.client_workflow_runs TO authenticated; GRANT ALL ON public.client_workflow_runs TO service_role;
ALTER TABLE public.client_workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_run_read ON public.client_workflow_runs FOR SELECT TO authenticated USING (broker_id=public.get_my_broker_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE TABLE public.client_workflow_dispatch (run_id uuid PRIMARY KEY REFERENCES public.client_workflow_runs(id) ON DELETE CASCADE, token uuid NOT NULL DEFAULT gen_random_uuid());
GRANT ALL ON public.client_workflow_dispatch TO service_role; REVOKE ALL ON public.client_workflow_dispatch FROM anon,authenticated;
ALTER TABLE public.client_workflow_dispatch ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.client_workflow_optouts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), broker_id uuid NOT NULL, channel text NOT NULL CHECK(channel IN ('email','sms')), recipient text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(broker_id,channel,recipient));
GRANT SELECT, INSERT ON public.client_workflow_optouts TO authenticated; GRANT ALL ON public.client_workflow_optouts TO service_role;
ALTER TABLE public.client_workflow_optouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_optout_read ON public.client_workflow_optouts FOR SELECT TO authenticated USING(broker_id=public.get_my_broker_id(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY workflow_optout_insert ON public.client_workflow_optouts FOR INSERT TO authenticated WITH CHECK((broker_id=auth.uid() AND public.has_role(auth.uid(),'broker')) OR public.is_super_admin(auth.uid()));
CREATE TABLE public.client_workflow_unsubscribe (token uuid PRIMARY KEY DEFAULT gen_random_uuid(), broker_id uuid NOT NULL, lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE, channel text NOT NULL, recipient text NOT NULL);
GRANT ALL ON public.client_workflow_unsubscribe TO service_role; REVOKE ALL ON public.client_workflow_unsubscribe FROM anon,authenticated;
ALTER TABLE public.client_workflow_unsubscribe ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.enqueue_client_workflows() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.client_workflows; r uuid; t uuid;
BEGIN
 FOR w IN SELECT * FROM public.client_workflows WHERE broker_id=NEW.broker_id AND active LOOP
 INSERT INTO public.client_workflow_runs(workflow_id,broker_id,lead_id,workflow_name,steps) VALUES(w.id,w.broker_id,NEW.id,w.name,w.steps) ON CONFLICT(workflow_id,lead_id) DO NOTHING RETURNING id INTO r;
 IF r IS NOT NULL THEN
 INSERT INTO public.client_workflow_dispatch(run_id) VALUES(r) RETURNING token INTO t;
 PERFORM net.http_post(url:='https://capydxuqpclcwadhwgvz.supabase.co/functions/v1/client-workflow',headers:=jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('run_id',r,'dispatch_token',t),timeout_milliseconds:=15000);
 END IF;
 END LOOP; RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Could not queue client workflow'; RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_client_workflows() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_client_workflows AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.enqueue_client_workflows();