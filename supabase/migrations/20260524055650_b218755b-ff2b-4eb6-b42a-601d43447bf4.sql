-- 1. Add dedicated column for the referring contact
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS referred_by_contact_id uuid;

-- 2. Backfill: where source_contact_id was misused to hold the REFERRER,
--    move it to referred_by_contact_id and try to relink the actual client.
WITH affected AS (
  SELECT id, broker_id, email, phone, first_name, last_name, source_contact_id
  FROM public.leads
  WHERE source IN ('client_referral','existing_client')
    AND source_contact_id IS NOT NULL
), relinked AS (
  SELECT
    a.id AS lead_id,
    a.source_contact_id AS old_source_contact_id,
    (
      SELECT c.id FROM public.contacts c
      WHERE c.created_by = a.broker_id
        AND c.id <> a.source_contact_id
        AND (
          (a.email IS NOT NULL AND lower(c.email) = lower(a.email))
          OR (a.phone IS NOT NULL AND c.phone = a.phone)
          OR (
            lower(c.first_name) = lower(a.first_name)
            AND lower(c.last_name) = lower(a.last_name)
          )
        )
      ORDER BY
        (CASE WHEN a.email IS NOT NULL AND lower(c.email) = lower(a.email) THEN 0 ELSE 1 END),
        (CASE WHEN a.phone IS NOT NULL AND c.phone = a.phone THEN 0 ELSE 1 END),
        c.created_at ASC
      LIMIT 1
    ) AS new_source_contact_id
  FROM affected a
)
UPDATE public.leads l
SET referred_by_contact_id = r.old_source_contact_id,
    source_contact_id = r.new_source_contact_id
FROM relinked r
WHERE l.id = r.lead_id;

-- 3. Index for lookups
CREATE INDEX IF NOT EXISTS idx_leads_referred_by_contact_id
  ON public.leads(referred_by_contact_id);