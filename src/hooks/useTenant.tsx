import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getBrandPreview, onBrandPreviewChange } from '@/lib/brandPreview';

export interface TenantBranding {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  icon_url: string | null;
  primary_color: string;
  accent_color: string;
  support_email: string | null;
  status: string;
}

export interface TenantFull extends TenantBranding {
  legal_name: string | null;
  custom_domain: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_domain_verified: boolean;
  owner_user_id: string | null;
  broker_seats: number;
  staff_seats: number;
}

interface TenantContextType {
  tenant: TenantBranding | null;
  tenantFull: TenantFull | null;
  loading: boolean;
  isTenantOwner: boolean;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantFull: null,
  loading: true,
  isTenantOwner: false,
  refresh: async () => {},
});

/** Resolve which brokerage this browser session belongs to, before login. */
function resolveHint() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('tenant');
  const host = window.location.hostname;
  return { slug, host };
}

/** Push the tenant's brand colours into the theme tokens the whole app already uses. */
function applyBranding(t: TenantBranding | null) {
  const root = document.documentElement;
  if (!t) return;
  if (t.primary_color) {
    root.style.setProperty('--primary', t.primary_color);
    root.style.setProperty('--sidebar-primary', t.primary_color);
    root.style.setProperty('--ring', t.primary_color);
  }
  if (t.accent_color) {
    root.style.setProperty('--accent', t.accent_color);
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [tenant, setTenant] = useState<TenantBranding | null>(null);
  const [tenantFull, setTenantFull] = useState<TenantFull | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Signed in: read the full row (row-level security scopes it to their own brokerage).
    if (user) {
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (data) {
        const full = data as unknown as TenantFull;
        setTenantFull(full);
        setTenant(full);
        applyBranding(full);
        setLoading(false);
        return;
      }
    }

    // Signed out (or no tenant row visible): branded login via public lookup.
    const { slug, host } = resolveHint();
    const { data } = await supabase.rpc('get_tenant_branding', {
      _host: host,
      _slug: slug,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setTenant(row as TenantBranding);
      applyBranding(row as TenantBranding);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const isTenantOwner =
    !!user && (role === 'super_admin' || tenantFull?.owner_user_id === user.id);

  return (
    <TenantContext.Provider value={{ tenant, tenantFull, loading, isTenantOwner, refresh: load }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
