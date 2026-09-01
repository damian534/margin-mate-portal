WITH last_move AS (
  SELECT l.id AS lead_id,
         MAX(n.created_at) AS moved_at
  FROM public.leads l
  JOIN public.notes n ON n.lead_id = l.id
  WHERE (
      (l.wip_status IS NOT NULL AND n.content LIKE '🔄 WIP stage: %→ ' || l.wip_status)
      OR n.content LIKE '🔄 Status changed:%'
    )
  GROUP BY l.id
),
best AS (
  SELECT l.id AS lead_id,
         COALESCE(
           (SELECT MAX(n.created_at) FROM public.notes n
             WHERE n.lead_id = l.id
               AND l.wip_status IS NOT NULL
               AND n.content LIKE '🔄 WIP stage: %→ ' || l.wip_status),
           (SELECT MAX(n.created_at) FROM public.notes n
             WHERE n.lead_id = l.id
               AND n.content LIKE '🔄 Status changed:% → %' || l.status),
           l.created_at
         ) AS entered_at
  FROM public.leads l
)
UPDATE public.leads l
SET stage_entered_at = LEAST(b.entered_at, now())
FROM best b
WHERE b.lead_id = l.id
  AND b.entered_at IS NOT NULL;