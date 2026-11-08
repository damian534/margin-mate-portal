CREATE TABLE public.meta_lead_pages (
 page_id text PRIMARY KEY CHECK (page_id ~ '^[0-9]{1,30}$'),
 broker_id uuid NOT NULL,
 page_name text,
 enabled boolean NOT NULL DEFAULT true,
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.meta_lead_pages TO service_role;
ALTER TABLE public.meta_lead_pages ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.meta_lead_deliveries (
 page_id text NOT NULL REFERENCES public.meta_lead_pages(page_id),
 leadgen_id text NOT NULL,
 broker_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'received',
 lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
 error text,
 received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(page_id,leadgen_id)
);
GRANT ALL ON public.meta_lead_deliveries TO service_role;
ALTER TABLE public.meta_lead_deliveries ENABLE ROW LEVEL SECURITY;
CREATE INDEX meta_lead_deliveries_broker_date ON public.meta_lead_deliveries(broker_id, received_at DESC);
CREATE OR REPLACE FUNCTION public.ingest_meta_lead(_page_id text, _leadgen_id text, _first_name text, _last_name text, _email text, _phone text, _custom_fields jsonb, _notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; result_id uuid; contact_id uuid; prior_status text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(_page_id || ':' || _leadgen_id, 0));
 SELECT broker_id INTO owner_id FROM public.meta_lead_pages WHERE page_id = _page_id AND enabled FOR UPDATE;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Page is not connected'; END IF;
 SELECT lead_id,status INTO result_id,prior_status FROM public.meta_lead_deliveries WHERE page_id=_page_id AND leadgen_id=_leadgen_id;
 IF prior_status='imported' THEN RETURN jsonb_build_object('lead_id',result_id,'duplicate',true); END IF;
 INSERT INTO public.lead_sources(name,label,display_order) VALUES ('facebook_instagram_ad','Facebook / Instagram Ad',100) ON CONFLICT (name) DO NOTHING;
 INSERT INTO public.contacts(first_name,last_name,email,phone,type,created_by,notes) VALUES (_first_name,_last_name,nullif(_email,''),nullif(_phone,''),'client',owner_id,_notes) RETURNING id INTO contact_id;
 INSERT INTO public.leads(first_name,last_name,email,phone,source,status,broker_id,source_contact_id,custom_fields) VALUES (_first_name,_last_name,nullif(_email,''),nullif(_phone,''),'facebook_instagram_ad','new',owner_id,contact_id,_custom_fields) RETURNING id INTO result_id;
 INSERT INTO public.notes(lead_id,content,author_id) VALUES(result_id,_notes,owner_id);
 INSERT INTO public.meta_lead_deliveries(page_id,leadgen_id,broker_id,status,lead_id,error) VALUES (_page_id,_leadgen_id,owner_id,'imported',result_id,null)
 ON CONFLICT(page_id,leadgen_id) DO UPDATE SET status='imported',lead_id=excluded.lead_id,error=null;
 RETURN jsonb_build_object('lead_id',result_id,'duplicate',false);
END;
$$;
REVOKE ALL ON FUNCTION public.ingest_meta_lead(text,text,text,text,text,text,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_meta_lead(text,text,text,text,text,text,jsonb,text) TO service_role;