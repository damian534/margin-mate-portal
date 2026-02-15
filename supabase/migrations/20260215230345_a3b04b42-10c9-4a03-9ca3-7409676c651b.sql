-- Drop the FK constraint on referral_partner_id that references auth.users
-- This allows storing profile IDs for manually-created referral partners who don't have auth accounts yet
ALTER TABLE public.leads DROP CONSTRAINT leads_referral_partner_id_fkey;