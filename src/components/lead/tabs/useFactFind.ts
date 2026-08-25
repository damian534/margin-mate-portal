import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FactFindMap = Record<string, Record<string, any>>;

/** Loads all fact find sections for a lead as { sectionKey: data }. */
export function useFactFind(leadId: string, isPreviewMode: boolean) {
  const [data, setData] = useState<FactFindMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (isPreviewMode) { setData({}); setLoading(false); return; }
      setLoading(true);
      const { data: rows } = await supabase
        .from('fact_find_responses')
        .select('section, data')
        .eq('lead_id', leadId);
      if (cancelled) return;
      const map: FactFindMap = {};
      for (const r of (rows as any[]) || []) map[r.section] = r.data || {};
      setData(map);
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [leadId, isPreviewMode]);

  return { factFind: data, loading };
}

export interface Applicant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  employment_type: string | null;
  display_order: number;
}

export function useApplicants(leadId: string, isPreviewMode: boolean) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  const refresh = async () => {
    if (isPreviewMode) { setApplicants([]); return; }
    const { data } = await supabase
      .from('lead_applicants')
      .select('id, name, email, phone, employment_type, display_order')
      .eq('lead_id', leadId)
      .order('display_order', { ascending: true });
    setApplicants((data as any[]) || []);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [leadId, isPreviewMode]);

  return { applicants, refreshApplicants: refresh };
}
