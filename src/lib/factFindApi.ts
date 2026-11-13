import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
export async function factFindCall(body: unknown) {
  const { data, error } = await supabase.functions.invoke('fact-find', { body });
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
    throw new Error(details?.error ?? error.message);
  }
  return data;
}
export type FactFindAnswers = { privacy?: boolean; credit?: boolean; typed_name?: string; first_name?: string; last_name?: string; email?: string; phone?: string };
export type FactFindLegal = { business_name: string; privacy_url: string; credit_guide_url: string; privacy_summary: string; privacy_version: string; approved: boolean };