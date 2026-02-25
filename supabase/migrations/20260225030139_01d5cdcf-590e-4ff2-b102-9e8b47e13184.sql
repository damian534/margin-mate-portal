-- Allow directors to view profiles of agents in their same company
CREATE POLICY "Directors can view company profiles"
ON public.profiles
FOR SELECT
USING (
  company_id IS NOT NULL
  AND company_id = get_director_company_id(auth.uid())
);
