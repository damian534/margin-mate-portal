import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface TeamMember {
  user_id: string;
  name: string;
  email: string | null;
  role: 'broker' | 'broker_staff' | 'super_admin';
}

/**
 * Returns all assignable team members (broker + their staff + super admins)
 * within the current user's tenant. Used for "Assigned to" pickers on leads
 * and tasks so a file can be allocated to a specific assistant or staffer.
 */
export function useTeamMembers() {
  const { user, isPreviewMode, effectiveBrokerId, role } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode) {
      setMembers([
        { user_id: 'preview-broker', name: 'Damian (You)', email: null, role: 'broker' },
        { user_id: 'preview-staff-1', name: 'Sarah Assistant', email: null, role: 'broker_staff' },
        { user_id: 'preview-staff-2', name: 'Tom Lending', email: null, role: 'broker_staff' },
      ]);
      setLoading(false);
      return;
    }
    if (!user) return;
    (async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['broker', 'broker_staff', 'super_admin']);
      if (!roles?.length) { setLoading(false); return; }

      const ids = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, broker_id')
        .in('user_id', ids);

      const isSuper = role === 'super_admin';
      const tenantBrokerId = effectiveBrokerId || user.id;

      const result: TeamMember[] = (profiles || [])
        .filter(p => {
          if (!p.user_id) return false;
          if (isSuper) return true;
          // Same tenant: profile.broker_id matches OR they ARE the broker
          return p.broker_id === tenantBrokerId || p.user_id === tenantBrokerId;
        })
        .map(p => {
          const r = roles.find(rr => rr.user_id === p.user_id);
          return {
            user_id: p.user_id!,
            name: p.full_name || p.email || 'Unknown',
            email: p.email,
            role: (r?.role || 'broker_staff') as TeamMember['role'],
          };
        });
      setMembers(result);
      setLoading(false);
    })();
  }, [user, isPreviewMode, effectiveBrokerId, role]);

  return { members, loading };
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}