ALTER TABLE public.lead_statuses ADD COLUMN dashboard text;
ALTER TABLE public.wip_statuses ADD COLUMN dashboard text;

UPDATE public.lead_statuses ls SET dashboard = CASE
  WHEN k_name = 'parked' OR k_label = 'parked' THEN 'parked'
  WHEN k_name = 'lost' OR k_label = 'lost' THEN 'lost'
  WHEN k_name = 'settled' OR k_label = 'settled' THEN 'settled'
  WHEN k_name IN ('preapproved','pre_approved','preapproval','pre_approval') OR k_label IN ('preapproved','pre_approved','preapproval','pre_approval') THEN 'preapproved'
  WHEN k_name IN ('pending_fact_find','onboarding','pending_additional_docs','pending_additional_documents','sent_for_onboarding') OR k_label IN ('pending_fact_find','onboarding','pending_additional_docs','pending_additional_documents','sent_for_onboarding') THEN 'onboarding'
  ELSE 'leads'
END
FROM (SELECT id, lower(regexp_replace(btrim(name), '[\s-]+', '_', 'g')) AS k_name, lower(regexp_replace(btrim(label), '[\s-]+', '_', 'g')) AS k_label FROM public.lead_statuses) n
WHERE ls.id = n.id;

UPDATE public.wip_statuses ws SET dashboard = CASE
  WHEN k_name = 'parked' OR k_label = 'parked' THEN 'parked'
  WHEN k_name = 'lost' OR k_label = 'lost' THEN 'lost'
  WHEN k_name = 'settled' OR k_label = 'settled' THEN 'settled'
  WHEN k_name IN ('preapproved','pre_approved','preapproval','pre_approval') OR k_label IN ('preapproved','pre_approved','preapproval','pre_approval') THEN 'preapproved'
  WHEN k_name IN ('pending_fact_find','onboarding','pending_additional_docs','pending_additional_documents','sent_for_onboarding') OR k_label IN ('pending_fact_find','onboarding','pending_additional_docs','pending_additional_documents','sent_for_onboarding') THEN 'onboarding'
  ELSE 'wip'
END
FROM (SELECT id, lower(regexp_replace(btrim(name), '[\s-]+', '_', 'g')) AS k_name, lower(regexp_replace(btrim(label), '[\s-]+', '_', 'g')) AS k_label FROM public.wip_statuses) n
WHERE ws.id = n.id;

ALTER TABLE public.lead_statuses ALTER COLUMN dashboard SET DEFAULT 'leads';
ALTER TABLE public.wip_statuses ALTER COLUMN dashboard SET DEFAULT 'wip';
ALTER TABLE public.lead_statuses ALTER COLUMN dashboard SET NOT NULL;
ALTER TABLE public.wip_statuses ALTER COLUMN dashboard SET NOT NULL;
ALTER TABLE public.lead_statuses ADD CONSTRAINT lead_statuses_dashboard_check CHECK (dashboard IN ('leads','onboarding','parked','lost','preapproved','settled'));
ALTER TABLE public.wip_statuses ADD CONSTRAINT wip_statuses_dashboard_check CHECK (dashboard IN ('wip','onboarding','parked','lost','preapproved','settled'));