import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAlertSettings } from '@/hooks/useAlerts';

export function AlertsBell({ compact = false }: { compact?: boolean }) {
  const { settings, setSettings, permission, requestPermission } = useAlertSettings();

  const Row = ({ id, label, hint, checked, onChange, disabled }: {
    id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
  }) => (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm">{label}</Label>
        {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={compact ? 'h-8 w-8 p-0' : 'h-8 w-8 p-0'} aria-label="Alert settings" title="Alerts">
          {settings.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <p className="text-sm font-semibold mb-1">Alerts</p>
        <p className="text-[11px] text-muted-foreground mb-2">Get told straight away when someone messages you or something happens on a deal.</p>
        <div className="divide-y">
          <Row id="alerts-on" label="Alerts on" checked={settings.enabled} onChange={v => setSettings(s => ({ ...s, enabled: v }))} />
          <Row id="alerts-sound" label="Play a sound" checked={settings.sound} disabled={!settings.enabled} onChange={v => setSettings(s => ({ ...s, sound: v }))} />
          <Row
            id="alerts-desktop"
            label="Pop-ups on my screen"
            hint={permission === 'denied' ? 'Blocked in your browser settings.' : 'Shows even when Connect is in another tab.'}
            checked={settings.desktop && permission === 'granted'}
            disabled={!settings.enabled || permission === 'denied' || permission === 'unsupported'}
            onChange={async v => {
              if (v && permission !== 'granted') { await requestPermission(); return; }
              setSettings(s => ({ ...s, desktop: v }));
            }}
          />
          <Row
            id="alerts-mentions"
            label="Mentions only"
            hint="In group chats and channels, only alert when someone types @your name. Direct messages always alert."
            checked={settings.mentionsOnly}
            disabled={!settings.enabled}
            onChange={v => setSettings(s => ({ ...s, mentionsOnly: v }))}
          />
          <Row
            id="alerts-deals"
            label="Deal activity"
            hint="New deals, tasks given to you and client document uploads."
            checked={settings.dealActivity}
            disabled={!settings.enabled}
            onChange={v => setSettings(s => ({ ...s, dealActivity: v }))}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
