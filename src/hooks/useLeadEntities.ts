import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LeadEntity, LeadEntityFlow, LeadEntityRole } from '@/lib/entityMap/types';

export function useLeadEntities(leadId: string, isPreviewMode: boolean) {
  const [entities, setEntities] = useState<LeadEntity[]>([]);
  const [roles, setRoles] = useState<LeadEntityRole[]>([]);
  const [flows, setFlows] = useState<LeadEntityFlow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isPreviewMode) { setLoading(false); return; }
    const [e, r, f] = await Promise.all([
      supabase.from('lead_entities').select('*').eq('lead_id', leadId).order('sort_order'),
      supabase.from('lead_entity_roles').select('*').eq('lead_id', leadId),
      supabase.from('lead_entity_flows').select('*').eq('lead_id', leadId),
    ]);
    setEntities((e.data ?? []) as unknown as LeadEntity[]);
    setRoles((r.data ?? []) as unknown as LeadEntityRole[]);
    setFlows((f.data ?? []) as unknown as LeadEntityFlow[]);
    setLoading(false);
  }, [leadId, isPreviewMode]);

  useEffect(() => { refresh(); }, [refresh]);

  return { entities, roles, flows, loading, refresh, setEntities };
}
