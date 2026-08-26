-- 1. New role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant_owner';

-- 2. Tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  legal_name text,
  logo_url text,
  icon_url text,
  primary_color text NOT NULL DEFAULT '142 72% 29%',
  accent_color text NOT NULL DEFAULT '38 92% 50%',
  custom_domain text UNIQUE,
  support_email text,
  sender_name text,
  sender_email text,
  sender_domain_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'trialing',
  owner_user_id uuid,
  stripe_customer_id text,
  stripe_subscription_id text,
  broker_seats integer NOT NULL DEFAULT 1,
  staff_seats integer NOT NULL DEFAULT 0,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT SELECT ON public.tenants TO anon;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. tenant_id on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);

-- 4. Seed the first tenant from existing Margin data
INSERT INTO public.tenants (slug, name, legal_name, custom_domain, support_email, sender_name, sender_email, status, sender_domain_verified)
VALUES ('margin', 'Margin Finance', 'Margin Finance Pty Ltd', 'connect.margin.com.au', 'support@margin.com.au', 'Margin Finance', 'noreply@margin.com.au', 'active', true)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'margin')
WHERE tenant_id IS NULL;

-- 5. Helper
CREATE OR REPLACE FUNCTION public.get_my_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.owner_user_id = _user_id
  ) OR public.is_super_admin(_user_id)
$$;

-- 6. Policies
CREATE POLICY "Members can view their tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (id = public.get_my_tenant_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant owners can update their tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (owner_user_id = auth.uid() AND id = public.get_my_tenant_id(auth.uid()))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (owner_user_id = auth.uid() AND id = public.get_my_tenant_id(auth.uid()))
  );

CREATE POLICY "Super admins can create tenants"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete tenants"
  ON public.tenants FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 7. Public branding lookup (pre-login, no sensitive fields)
CREATE OR REPLACE FUNCTION public.get_tenant_branding(_host text DEFAULT NULL, _slug text DEFAULT NULL)
RETURNS TABLE(
  id uuid, slug text, name text, logo_url text, icon_url text,
  primary_color text, accent_color text, support_email text, status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.id, t.slug, t.name, t.logo_url, t.icon_url,
         t.primary_color, t.accent_color, t.support_email, t.status
  FROM public.tenants t
  WHERE (_host IS NOT NULL AND lower(t.custom_domain) = lower(_host))
     OR (_slug IS NOT NULL AND lower(t.slug) = lower(_slug))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_branding(text, text) TO anon, authenticated;