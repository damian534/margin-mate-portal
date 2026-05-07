import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar as CalIcon, RefreshCw, Plug, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { CreateEventDialog } from './CreateEventDialog';

type GEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

export function CalendarView() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [events, setEvents] = useState<GEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ start?: string; end?: string }>({});

  const checkConnection = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('google_calendar_connections')
      .select('google_email')
      .eq('user_id', user.id)
      .maybeSingle();
    setConnected(!!data);
    setEmail(data?.google_email || null);
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('google-cal-events', {
      body: { action: 'list' },
    });
    setLoading(false);
    if (error) { toast.error('Failed to load events'); return; }
    if (data?.not_connected) { setConnected(false); return; }
    setEvents(data?.events || []);
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (connected) loadEvents();
  }, [connected, loadEvents]);

  const connect = async () => {
    const { data, error } = await supabase.functions.invoke('google-cal-oauth-start', {
      body: { redirect_to: window.location.href },
    });
    if (error || !data?.url) { toast.error('Failed to start connection'); return; }
    window.location.href = data.url;
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Google Calendar?')) return;
    await supabase.functions.invoke('google-cal-events', { body: { action: 'disconnect' } });
    setConnected(false);
    setEvents([]);
    setEmail(null);
    toast.success('Disconnected');
  };

  if (connected === null) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  if (!connected) {
    return (
      <Card className="p-12 text-center max-w-xl mx-auto">
        <CalIcon className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-semibold mb-2">Connect your Google Calendar</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Sync your personal Google Calendar to view, create, and manage events directly inside Margin Connect. Events you create here will appear in Google Calendar with Google Meet links automatically.
        </p>
        <Button onClick={connect}><Plug className="w-4 h-4 mr-2" />Connect Google Calendar</Button>
      </Card>
    );
  }

  const fcEvents = events.map(e => ({
    id: e.id,
    title: e.summary || '(no title)',
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    allDay: !e.start?.dateTime,
    extendedProps: { description: e.description, location: e.location, hangoutLink: e.hangoutLink, htmlLink: e.htmlLink },
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">
          Connected as <span className="font-medium text-foreground">{email}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadEvents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button size="sm" onClick={() => { setCreateDefaults({}); setCreateOpen(true); }}>
            + New event
          </Button>
          <Button variant="ghost" size="sm" onClick={disconnect}>
            <Unplug className="w-4 h-4 mr-2" />Disconnect
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          height="auto"
          events={fcEvents}
          selectable
          select={(info) => {
            setCreateDefaults({ start: info.startStr, end: info.endStr });
            setCreateOpen(true);
          }}
          eventClick={(info) => {
            const link = (info.event.extendedProps as any).htmlLink;
            if (link) window.open(link, '_blank');
          }}
        />
      </Card>

      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStart={createDefaults.start}
        defaultEnd={createDefaults.end}
        onCreated={loadEvents}
      />
    </div>
  );
}