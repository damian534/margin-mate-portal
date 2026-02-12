import { useAuth } from '@/hooks/useAuth';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PreviewBanner() {
  const { isPreviewMode, role, setPreviewRole } = useAuth();

  if (!isPreviewMode) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm flex items-center justify-center gap-3 flex-wrap">
      <Eye className="w-4 h-4" />
      <span className="font-medium">Creator Preview Mode</span>
      <span className="text-primary-foreground/70">— Viewing as:</span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={role === 'broker' ? 'secondary' : 'ghost'}
          className={role === 'broker' ? 'h-6 text-xs' : 'h-6 text-xs text-primary-foreground/70 hover:text-primary-foreground'}
          onClick={() => setPreviewRole('broker')}
        >
          Broker
        </Button>
        <Button
          size="sm"
          variant={role === 'referral_partner' ? 'secondary' : 'ghost'}
          className={role === 'referral_partner' ? 'h-6 text-xs' : 'h-6 text-xs text-primary-foreground/70 hover:text-primary-foreground'}
          onClick={() => setPreviewRole('referral_partner')}
        >
          Partner
        </Button>
      </div>
      <span className="text-primary-foreground/50 text-xs">Data is sample only</span>
    </div>
  );
}
