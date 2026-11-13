CREATE TABLE public.fact_find_settings (
 broker_id uuid PRIMARY KEY,
 business_name text NOT NULL DEFAULT '',
 privacy_url text NOT NULL DEFAULT '',
 credit_guide_url text NOT NULL DEFAULT '',
 privacy_version text NOT NULL DEFAULT '1',
 privacy_summary text NOT NULL DEFAULT '',
 approved boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fact_find_settings TO authenticated;
GRANT ALL ON public.fact_find_settings TO service_role;
ALTER TABLE public.fact_find_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers read legal settings" ON public.fact_find_settings FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()) OR (public.is_broker_or_staff(auth.uid()) AND broker_id=public.get_my_broker_id(auth.uid())));
CREATE TABLE public.fact_finds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 deal_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
 broker_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','submitted')),
 progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
 submitted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(deal_id)
);
GRANT SELECT ON public.fact_finds TO authenticated;
GRANT ALL ON public.fact_finds TO service_role;
ALTER TABLE public.fact_finds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Broker reads own fact finds" ON public.fact_finds FOR SELECT TO authenticated USING (public.can_manage_lead(deal_id));
CREATE TABLE public.fact_find_applicants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fact_find_id uuid NOT NULL REFERENCES public.fact_finds(id) ON DELETE CASCADE,
 source_applicant_id uuid,
 name text NOT NULL DEFAULT '',
 email text NOT NULL DEFAULT '',
 phone text NOT NULL DEFAULT '',
 display_order integer NOT NULL DEFAULT 0,
 answers jsonb NOT NULL DEFAULT '{}'::jsonb,
 current_step integer NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 2),
 revision integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(fact_find_id, display_order)
);
GRANT SELECT ON public.fact_find_applicants TO authenticated;
GRANT ALL ON public.fact_find_applicants TO service_role;
ALTER TABLE public.fact_find_applicants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Broker reads own applicants" ON public.fact_find_applicants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.fact_finds f WHERE f.id=fact_find_id AND public.can_manage_lead(f.deal_id)));
CREATE TABLE public.fact_find_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 applicant_id uuid NOT NULL REFERENCES public.fact_find_applicants(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '30 days'),
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.fact_find_links TO service_role;
ALTER TABLE public.fact_find_links ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.fact_find_consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 applicant_id uuid NOT NULL UNIQUE REFERENCES public.fact_find_applicants(id) ON DELETE CASCADE,
 typed_name text NOT NULL,
 privacy_version text NOT NULL,
 privacy_text text NOT NULL,
 privacy_url text NOT NULL,
 credit_guide_url text NOT NULL,
 privacy_accepted boolean NOT NULL,
 credit_accepted boolean NOT NULL,
 ip text,
 user_agent text NOT NULL DEFAULT '',
 accepted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fact_find_consents TO authenticated;
GRANT SELECT, INSERT ON public.fact_find_consents TO service_role;
ALTER TABLE public.fact_find_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Broker reads consent evidence" ON public.fact_find_consents FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.fact_find_applicants a JOIN public.fact_finds f ON f.id=a.fact_find_id WHERE a.id=applicant_id AND public.can_manage_lead(f.deal_id)));
CREATE INDEX fact_find_applicant_parent_idx ON public.fact_find_applicants(fact_find_id);
CREATE OR REPLACE FUNCTION public.fact_find_save_draft(_applicant_id uuid, _revision integer, _answers jsonb, _step integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF _step NOT BETWEEN 0 AND 2 THEN RAISE EXCEPTION 'Invalid screen'; END IF;
 IF _step>0 AND NOT EXISTS(SELECT 1 FROM public.fact_find_consents WHERE applicant_id=_applicant_id AND privacy_accepted AND credit_accepted) THEN RAISE EXCEPTION 'Consent required'; END IF;
 UPDATE public.fact_find_applicants SET answers=_answers,current_step=_step,revision=revision+1,updated_at=now() WHERE id=_applicant_id AND revision=_revision;
 RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.fact_find_save_draft(uuid,integer,jsonb,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fact_find_save_draft(uuid,integer,jsonb,integer) TO service_role;