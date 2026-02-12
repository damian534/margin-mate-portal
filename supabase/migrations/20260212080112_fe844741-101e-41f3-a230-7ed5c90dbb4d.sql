
-- Step 1: Add super_admin to enum + create tables/columns (no references to 'super_admin' in functions)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Add broker_id columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS broker_id uuid;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS broker_id uuid;

-- Create invite_codes table
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  label text,
  used_count integer NOT NULL DEFAULT 0,
  max_uses integer,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
