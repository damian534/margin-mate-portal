-- Allow profiles without an auth user (manually added partners)
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Drop and recreate the FK to allow NULL
ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies that use user_id to handle NULLs properly
-- (existing policies already use auth.uid() = user_id which naturally handles NULL)