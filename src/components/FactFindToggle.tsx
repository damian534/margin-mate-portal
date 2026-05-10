import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ClipboardList } from 'lucide-react';
import { useFactFindEnabled, setFactFindEnabled } from '@/hooks/useFactFindEnabled';

export function FactFindToggle() {
  const enabled = useFactFindEnabled();
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Fact Find</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Temporarily hide the Fact Find feature across the app while it's being refined.
        When off, the Financial Position card on deal cards and all fact-find buttons are hidden.
      </p>
      <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
        <div className="space-y-0.5">
          <Label htmlFor="ff-toggle" className="text-sm font-medium">
            Fact Find {enabled ? 'enabled' : 'disabled'}
          </Label>
          <p className="text-xs text-muted-foreground">
            {enabled ? 'Visible on deal cards and client portal links.' : 'Hidden everywhere in the app.'}
          </p>
        </div>
        <Switch id="ff-toggle" checked={enabled} onCheckedChange={setFactFindEnabled} />
      </div>
    </div>
  );
}
