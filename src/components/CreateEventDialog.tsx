import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultStart?: string;
  defaultEnd?: string;
  leadId?: string;
  defaultAttendees?: string[];
  defaultTitle?: string;
  onCreated?: () => void;
  eventId?: string;
  defaultDescription?: string;
  defaultLocation?: string;
  htmlLink?: string;
}

function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateEventDialog({ open, onOpenChange, defaultStart, defaultEnd, leadId, defaultAttendees, defaultTitle, onCreated, eventId, defaultDescription, defaultLocation, htmlLink }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [attendees, setAttendees] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isEdit = !!eventId;

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle || '');
      setDescription(defaultDescription || '');
      setLocation(defaultLocation || '');
      const s = defaultStart ? toLocalInput(defaultStart) : toLocalInput(new Date(Date.now() + 3600000).toISOString());
      const e = defaultEnd ? toLocalInput(defaultEnd) : toLocalInput(new Date(Date.now() + 5400000).toISOString());
      setStart(s); setEnd(e);
      setAttendees((defaultAttendees || []).join(', '));
    }
  }, [open, defaultStart, defaultEnd, defaultAttendees, defaultTitle, defaultDescription, defaultLocation]);

  const submit = async () => {
    if (!title || !start || !end) { toast.error('Title, start and end required'); return; }
    setSaving(true);
    const attendeeList = attendees.split(',').map(a => a.trim()).filter(Boolean);
    const { data, error } = await supabase.functions.invoke('google-cal-events', {
      body: isEdit
        ? {
            action: 'update',
            event_id: eventId,
            title, description, location,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            attendees: attendeeList,
          }
        : {
            action: 'create',
            lead_id: leadId,
            title, description, location,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            attendees: attendeeList,
          },
    });
    setSaving(false);
    if (error || data?.error) { toast.error('Failed to create event'); return; }
    toast.success(isEdit ? 'Event updated' : 'Event created');
    onOpenChange(false);
    onCreated?.();
  };

  const remove = async () => {
    if (!eventId) return;
    if (!confirm('Delete this event? This will also remove it from Google Calendar.')) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('google-cal-events', {
      body: { action: 'delete', event_id: eventId },
    });
    setDeleting(false);
    if (error || data?.error) { toast.error('Failed to delete event'); return; }
    toast.success('Event deleted');
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit event' : 'New calendar event'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></div>
            <div><Label>End</Label><Input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></div>
          </div>
          <div><Label>Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Optional" /></div>
          <div><Label>Attendees (comma-separated emails)</Label><Input value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="client@example.com, partner@example.com" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
          {!isEdit && <p className="text-xs text-muted-foreground">A Google Meet link will be generated automatically.</p>}
          {isEdit && htmlLink && (
            <a href={htmlLink} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Open in Google Calendar</a>
          )}
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          {isEdit ? (
            <Button variant="destructive" onClick={remove} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create event')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}