import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
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
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('fetchRole error:', error.message);
    return null;
  }
  return (data?.role as AppRole) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreviewMode] = useState(getIsPreviewMode);
  const [previewRole, setPreviewRole] = useState<AppRole>('broker');
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (isPreviewMode) {
      setUser(FAKE_USER);
      setRole(previewRole);
      setLoading(false);
      return;
    }

    isMountedRef.current = true;

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isMountedRef.current) setLoading(false);
    }, 5000);

    const handleSession = async (newSession: Session | null) => {
      if (!isMountedRef.current) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        const userRole = await fetchRole(newSession.user.id);
        if (isMountedRef.current) {
          setRole(userRole);
          setLoading(false);
        }
      } else {
        setRole(null);
        setLoading(false);
      }
    };

    // Set up listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handleSession(newSession);
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
  };

  const isBrokerOrAdmin = role === 'broker' || role === 'super_admin';

  return (
    <AuthContext.Provider value={{ user, session, role, loading, isPreviewMode, isBrokerOrAdmin, signOut, setPreviewRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
