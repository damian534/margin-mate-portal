
-- Add is_director flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_director boolean NOT NULL DEFAULT false;

-- Update RLS on leads so directors can see all leads from agents in their company
CREATE OR REPLACE FUNCTION public.get_director_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id FROM public.profiles
  WHERE user_id = _user_id AND is_director = true
  LIMIT 1
$$;

-- Directors can view leads from agents in their company
CREATE POLICY "Directors can view company leads"
ON public.leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_director = true
      AND p.company_id IS NOT NULL
      AND leads.referral_partner_id IN (
        SELECT pp.user_id FROM public.profiles pp
        WHERE pp.company_id = p.company_id AND pp.user_id IS NOT NULL
      )
  )
);

-- Directors can view notes on company leads
CREATE POLICY "Directors can view company lead notes"
ON public.notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_director = true
      AND p.company_id IS NOT NULL
      AND notes.lead_id IN (
        SELECT l.id FROM public.leads l
        WHERE l.referral_partner_id IN (
          SELECT pp.user_id FROM public.profiles pp
          WHERE pp.company_id = p.company_id AND pp.user_id IS NOT NULL
        )
      )
  )
);
