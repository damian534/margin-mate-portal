import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'broker' | 'referral_partner' | 'super_admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  isPreviewMode: boolean;
  isBrokerOrAdmin: boolean;
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
  signOut: async () => {},
  setPreviewRole: () => {},
});

function getIsPreviewMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('preview') === 'true';
}

const FAKE_USER = {
  id: 'preview-user-id',
  email: 'creator@marginfinance.com',
  app_metadata: {},
  user_metadata: { full_name: 'Creator Preview' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

async function fetchRole(userId: string): Promise<AppRole | null> {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    return (data?.role as AppRole) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreviewMode] = useState(getIsPreviewMode);
  const [previewRole, setPreviewRole] = useState<AppRole>('broker');

  useEffect(() => {
    if (isPreviewMode) {
      setUser(FAKE_USER);
      setRole(previewRole);
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 5000);

    // 1. Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const userRole = await fetchRole(newSession.user.id);
        if (isMounted) {
          setRole(userRole);
          setLoading(false);
        }
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    // 2. Then get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      // Only set if we haven't already been updated by onAuthStateChange
      setSession(prev => prev ?? initialSession);
      setUser(prev => prev ?? initialSession?.user ?? null);

      if (initialSession?.user) {
        const userRole = await fetchRole(initialSession.user.id);
        if (isMounted) {
          setRole(prev => prev ?? userRole);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [isPreviewMode, previewRole]);

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
  };

  const isBrokerOrAdmin = role === 'broker' || role === 'super_admin';

  return (
    <AuthContext.Provider value={{ user, session, role, loading, isPreviewMode, isBrokerOrAdmin, signOut, setPreviewRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
