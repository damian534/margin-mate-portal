import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Lock } from 'lucide-react';

/**
 * Blocks the app for suspended brokerages and warns owners when payment
 * has failed. Data is never deleted — access is simply paused.
 */
export function TenantStatusGate({ children }: { children: React.ReactNode }) {
  const { tenantFull, loading } = useTenant();
  const { role, isPreviewMode } = useAuth();

  if (loading || isPreviewMode || role === 'super_admin' || !tenantFull) return <>{children}</>;

  if (tenantFull.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Account paused</h1>
          <p className="text-sm text-muted-foreground">
            Access to {tenantFull.name} is currently paused. All of your data is safe and
            will be available as soon as the subscription is reactivated.
          </p>
          {tenantFull.support_email && (
            <a className="text-sm text-primary hover:underline" href={`mailto:${tenantFull.support_email}`}>
              Contact support
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {tenantFull.status === 'past_due' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-700 text-sm px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Your last payment failed. Update your billing details in Settings to avoid losing access.
        </div>
      )}
      {children}
    </>
  );
}
