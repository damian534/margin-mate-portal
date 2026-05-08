import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalIcon, RefreshCw, Plug, Unplug, ChevronDown, ChevronRight } from 'lucide-react';
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
  _calendarId?: string;
};

type GCalendar = {
  id: string;
  summary: string;
  summaryOverride?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
  accessRole?: string;
};

export function CalendarView() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [events, setEvents] = useState<GEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ start?: string; end?: string }>({});
  const [calendars, setCalendars] = useState<GCalendar[]>([]);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [editingEvent, setEditingEvent] = useState<GEvent | null>(null);
  const [allDayCollapsed, setAllDayCollapsed] = useState<boolean>(() => localStorage.getItem('gcal_allday_collapsed') === '1');

  const calendarColorMap = useMemo(() => {
    const m = new Map<string, { bg: string; fg: string }>();
    calendars.forEach(c => m.set(c.id, { bg: c.backgroundColor || '#3b82f6', fg: c.foregroundColor || '#ffffff' }));
    return m;
  }, [calendars]);

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

  const loadCalendars = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('google-cal-events', {
      body: { action: 'calendars' },
    });
    if (error) return;
    if (data?.not_connected) { setConnected(false); return; }
    const cals: GCalendar[] = data?.calendars || [];
    setCalendars(cals);
    setVisibleIds(prev => {
      if (prev.size > 0) return prev;
      const stored = localStorage.getItem('gcal_visible');
      if (stored) {
        try { return new Set(JSON.parse(stored)); } catch { /* ignore */ }
      }
      return new Set(cals.filter(c => c.selected !== false).map(c => c.id));
    });
  }, []);

  const loadEvents = useCallback(async (ids?: string[]) => {
    const calendar_ids = ids ?? Array.from(visibleIds);
    if (calendar_ids.length === 0) { setEvents([]); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('google-cal-events', {
      body: { action: 'list', calendar_ids },
    });
    setLoading(false);
    if (error) { toast.error('Failed to load events'); return; }
    if (data?.not_connected) { setConnected(false); return; }
    setEvents(data?.events || []);
  }, [visibleIds]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (connected) loadCalendars();
  }, [connected, loadCalendars]);

  useEffect(() => {
    if (connected && visibleIds.size > 0) {
      localStorage.setItem('gcal_visible', JSON.stringify(Array.from(visibleIds)));
      loadEvents(Array.from(visibleIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, visibleIds]);

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

  const fcEvents = events
    .filter(e => !e._calendarId || visibleIds.has(e._calendarId))
    .map(e => {
      const colors = e._calendarId ? calendarColorMap.get(e._calendarId) : undefined;
      return {
        id: e.id,
        title: e.summary || '(no title)',
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        allDay: !e.start?.dateTime,
        backgroundColor: colors?.bg,
        borderColor: colors?.bg,
        textColor: colors?.fg,
        extendedProps: { description: e.description, location: e.location, hangoutLink: e.hangoutLink, htmlLink: e.htmlLink },
      };
    });

  const toggleCalendar = (id: string) => {
    setVisibleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const myCals = calendars.filter(c => c.accessRole === 'owner' || c.primary);
  const otherCals = calendars.filter(c => c.accessRole !== 'owner' && !c.primary);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">
          Connected as <span className="font-medium text-foreground">{email}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadEvents()} disabled={loading}>
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

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        <Card className="p-4 h-fit">
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4">
              <CalendarGroup title="My calendars" cals={myCals} visibleIds={visibleIds} onToggle={toggleCalendar} />
              {otherCals.length > 0 && (
                <CalendarGroup title="Other calendars" cals={otherCals} visibleIds={visibleIds} onToggle={toggleCalendar} />
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = !allDayCollapsed;
                setAllDayCollapsed(next);
                localStorage.setItem('gcal_allday_collapsed', next ? '1' : '0');
              }}
            >
              {allDayCollapsed ? <ChevronRight className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {allDayCollapsed ? 'Show all-day events' : 'Hide all-day events'}
            </Button>
          </div>
          <div className={allDayCollapsed ? 'fc-hide-allday' : ''}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            height="auto"
            nowIndicator
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            scrollTime="08:00:00"
            events={fcEvents}
            selectable
            select={(info) => {
              setCreateDefaults({ start: info.startStr, end: info.endStr });
              setEditingEvent(null);
              setCreateOpen(true);
            }}
            eventClick={(info) => {
              info.jsEvent.preventDefault();
              const ev = events.find(e => e.id === info.event.id);
              if (ev) {
                setEditingEvent(ev);
                setCreateOpen(true);
              }
            }}
          />
          </div>
        </Card>
      </div>

      <CreateEventDialog
        open={createOpen}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditingEvent(null); }}
        defaultStart={editingEvent ? (editingEvent.start?.dateTime || editingEvent.start?.date) : createDefaults.start}
        defaultEnd={editingEvent ? (editingEvent.end?.dateTime || editingEvent.end?.date) : createDefaults.end}
        eventId={editingEvent?.id}
        defaultTitle={editingEvent?.summary}
        defaultDescription={editingEvent?.description}
        defaultLocation={editingEvent?.location}
        htmlLink={editingEvent?.htmlLink}
        onCreated={() => loadEvents()}
      />
    </div>
  );
}

function CalendarGroup({
  title, cals, visibleIds, onToggle,
}: {
  title: string;
  cals: GCalendar[];
  visibleIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</div>
      <div className="space-y-1.5">
        {cals.map(c => {
          const checked = visibleIds.has(c.id);
          const color = c.backgroundColor || '#3b82f6';
          return (
            <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm py-1 hover:bg-muted/50 rounded px-1">
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(c.id)}
                style={checked ? { backgroundColor: color, borderColor: color } : { borderColor: color }}
              />
              <span className="truncate flex-1" title={c.summaryOverride || c.summary}>
                {c.summaryOverride || c.summary}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}