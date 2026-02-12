
-- 1. Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  website text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can do everything with companies"
  ON public.companies FOR ALL
  USING (has_role(auth.uid(), 'broker'::app_role));

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Extend profiles table with referrer-specific fields
ALTER TABLE public.profiles
  ADD COLUMN company_id uuid REFERENCES public.companies(id),
  ADD COLUMN date_of_birth date,
  ADD COLUMN spouse_name text,
  ADD COLUMN interests text,
  ADD COLUMN address text,
  ADD COLUMN license_number text,
  ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN broker_notes text;

-- 3. Now add the partner company visibility policy (company_id exists now)
CREATE POLICY "Partners can view their own company"
  ON public.companies FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.company_id = companies.id
      AND profiles.user_id = auth.uid()
  ));
