import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'broker' | 'referral_partner' | 'super_admin' | 'broker_staff' | 'platform_owner';

// Highest privilege first — a user may hold several roles (e.g. super_admin + platform_owner).
const ROLE_PRIORITY: AppRole[] = ['super_admin', 'broker', 'broker_staff', 'referral_partner', 'platform_owner'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  isPreviewMode: boolean;
  isBrokerOrAdmin: boolean;
  isStaff: boolean;
  isPlatformOwner: boolean;
  effectiveBrokerId: string | null;
  signOut: () => Promise<void>;
  setPreviewRole: (role: AppRole) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  isPreviewMode: false,
  isBrokerOrAdmin: false,
  isStaff: false,
  isPlatformOwner: false,
  effectiveBrokerId: null,
  signOut: async () => {},
  setPreviewRole: () => {},
});

function getIsPreviewMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('preview') === 'true';
}

const FAKE_USER = {
  id: 'preview-user-id',
  email: 'demo@brokerage.com',
  app_metadata: {},
  user_metadata: { full_name: 'Demo User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

async function fetchRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  if (error) {
    console.error('fetchRoles error:', error.message);
    return [];
  }
  return ((data as { role: AppRole }[] | null) ?? []).map((r) => r.role);
}

function primaryRole(roles: AppRole[]): AppRole | null {
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r;
  return roles[0] ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(getIsPreviewMode);
  const [previewRole, setPreviewRole] = useState<AppRole>('broker');
  const [staffBrokerId, setStaffBrokerId] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const isMountedRef = useRef(true);

  // Demo mode lives in the URL (?preview=true). Client-side navigation can drop it,
  // so keep watching the address bar and fall back to the real session when it goes.
  useEffect(() => {
    const sync = () => setIsPreviewMode(getIsPreviewMode());
    sync();
    window.addEventListener('popstate', sync);
    const interval = setInterval(sync, 500);
    return () => {
      window.removeEventListener('popstate', sync);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isPreviewMode) {
      setUser(FAKE_USER);
      setRole(previewRole);
      setLoading(false);
      return;
    }

    isMountedRef.current = true;
    // Leaving demo mode: drop the fake identity while the real session loads.
    setUser(null);
    setRole(null);
    setLoading(true);

    const timeout = setTimeout(() => {
      if (isMountedRef.current) setLoading(false);
    }, 5000);


    const handleSession = async (newSession: Session | null) => {
      if (!isMountedRef.current) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        const userRoles = await fetchRoles(newSession.user.id);
        const userRole = primaryRole(userRoles);
        if (isMountedRef.current) {
          setRoles(userRoles);
          setRole(userRole);
          // If broker_staff, fetch their broker_id from profiles
          if (userRole === 'broker_staff') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('broker_id')
              .eq('user_id', newSession.user.id)
              .maybeSingle();
            if (isMountedRef.current) {
              setStaffBrokerId(profile?.broker_id ?? null);
            }
          } else {
            setStaffBrokerId(null);
          }
          setLoading(false);
        }
      } else {
        setRole(null);
        setRoles([]);
        setStaffBrokerId(null);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handleSession(newSession);
    });

    // Also read the stored session directly, so returning from demo mode restores
    // the real login even if no auth event fires.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) handleSession(data.session);
    });


    return () => {
      isMountedRef.current = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [isPreviewMode]);

  useEffect(() => {
    if (isPreviewMode) {
      setRole(previewRole);
    }
  }, [previewRole, isPreviewMode]);

  const signOut = async () => {
    if (isPreviewMode) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setRoles([]);
    setStaffBrokerId(null);
  };

  const isBrokerOrAdmin = role === 'broker' || role === 'super_admin' || role === 'broker_staff';
  const isStaff = role === 'broker_staff';
  const isPlatformOwner = roles.includes('platform_owner');
  // For broker_staff, use their linked broker's ID. For brokers/admins, use their own ID.
  const effectiveBrokerId = isStaff ? staffBrokerId : (user?.id ?? null);

  return (
    <AuthContext.Provider value={{ user, session, role, loading, isPreviewMode, isBrokerOrAdmin, isStaff, isPlatformOwner, effectiveBrokerId, signOut, setPreviewRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
