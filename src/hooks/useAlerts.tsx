import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePersistedState } from '@/hooks/usePersistedState';
import { toast } from 'sonner';

export interface AlertSettings {
  /** Master switch for all alerts. */
  enabled: boolean;
  /** Play a short chime when something arrives. */
  sound: boolean;
  /** Show a desktop pop-up even when Connect is in another tab. */
  desktop: boolean;
  /** Only alert for direct messages and messages that mention me. */
  mentionsOnly: boolean;
  /** Alert on new deals, tasks assigned to me and client document uploads. */
  dealActivity: boolean;
}

const DEFAULTS: AlertSettings = {
  enabled: true,
  sound: true,
  desktop: false,
  mentionsOnly: true,
  dealActivity: true,
};

interface AlertsContextValue {
  settings: AlertSettings;
  setSettings: React.Dispatch<React.SetStateAction<AlertSettings>>;
  permission: NotificationPermission | 'unsupported';
  requestPermission: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextValue>({
  settings: DEFAULTS,
  setSettings: () => {},
  permission: 'unsupported',
  requestPermission: async () => {},
});

export const useAlertSettings = () => useContext(AlertsContext);

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.25);
    });
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* audio not available */
  }
}

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { user, isPreviewMode, effectiveBrokerId } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = usePersistedState<AlertSettings>('connect.alerts', DEFAULTS);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported',
  );
  const [myName, setMyName] = useState<string>('');
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('full_name, email').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setMyName((data as { full_name?: string } | null)?.full_name || ''));
  }, [user]);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') setSettings(s => ({ ...s, enabled: true, desktop: true }));
  }, [setSettings]);

  const notify = useCallback((title: string, body: string, path?: string) => {
    const s = settingsRef.current;
    if (!s.enabled) return;
    toast(title, {
      description: body,
      action: path ? { label: 'Open', onClick: () => navigate(path) } : undefined,
    });
    if (s.sound) playChime();
    if (s.desktop && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body, tag: `${title}-${body}`.slice(0, 60) });
        n.onclick = () => { window.focus(); if (path) navigate(path); n.close(); };
      } catch {
        /* notification blocked */
      }
    }
  }, [navigate]);

  // Chat message alerts
  useEffect(() => {
    if (!user || isPreviewMode) return;
    let myConversations: Record<string, { type: string; name: string | null }> = {};
    let cancelled = false;

    const loadConversations = async () => {
      const { data } = await supabase
        .from('conversation_members')
        .select('conversation_id, conversations(type, name)')
        .eq('user_id', user.id);
      if (cancelled) return;
      myConversations = {};
      for (const row of (data || []) as unknown as { conversation_id: string; conversations: { type: string; name: string | null } | null }[]) {
        if (row.conversations) myConversations[row.conversation_id] = row.conversations;
      }
    };
    loadConversations();

    const channel = supabase
      .channel('alerts-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
        const m = payload.new as { conversation_id: string; sender_id: string | null; body: string | null };
        if (!m || m.sender_id === user.id) return;
        if (!myConversations[m.conversation_id]) {
          await loadConversations();
          if (!myConversations[m.conversation_id]) return;
        }
        const conv = myConversations[m.conversation_id];
        const body = m.body || 'Sent an attachment';
        const first = (myName || '').split(/\s+/)[0]?.toLowerCase();
        const mentioned = !!first && body.toLowerCase().includes(`@${first}`);
        if (settingsRef.current.mentionsOnly && conv.type !== 'direct' && !mentioned) return;
        const title = conv.type === 'direct' ? 'New message' : mentioned ? `Mentioned in ${conv.name || 'chat'}` : conv.name || 'New message';
        notify(title, body.slice(0, 140), '/chat');
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user, isPreviewMode, myName, notify]);

  // Deal activity alerts
  useEffect(() => {
    if (!user || isPreviewMode) return;
    const mine = (brokerId?: string | null) => !!brokerId && (brokerId === user.id || brokerId === effectiveBrokerId);

    const channel = supabase
      .channel('alerts-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, payload => {
        if (!settingsRef.current.dealActivity) return;
        const l = payload.new as { broker_id?: string | null; assigned_to?: string | null; first_name?: string; last_name?: string; opportunity_name?: string };
        if (!mine(l.broker_id) && l.assigned_to !== user.id) return;
        const name = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.opportunity_name || 'Unnamed';
        notify('New deal', name, '/admin?tab=leads');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, payload => {
        if (!settingsRef.current.dealActivity) return;
        const t = payload.new as { assigned_to?: string | null; title?: string; created_by?: string | null };
        if (t.assigned_to !== user.id || t.created_by === user.id) return;
        notify('New task for you', t.title || 'Untitled task', '/admin?tab=tasks');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'document_request_files' }, payload => {
        if (!settingsRef.current.dealActivity) return;
        const f = payload.new as { file_name?: string };
        notify('Client uploaded a document', f.file_name || 'New file', '/admin?tab=leads');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, isPreviewMode, effectiveBrokerId, notify]);

  const value = useMemo(
    () => ({ settings, setSettings, permission, requestPermission }),
    [settings, setSettings, permission, requestPermission],
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}
