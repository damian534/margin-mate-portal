import { useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Mail, Phone, MessageSquare, Pencil, Plus, Send, Pin, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormAnswersCard } from '@/components/lead/FormAnswersCard';
import { SmsComposeDialog } from '@/components/lead/SmsComposeDialog';

interface Attachment { id: string; file_name: string }
interface Note { id: string; content: string; created_at: string; pinned?: boolean; author_id: string | null; attachments?: Attachment[] }
interface Props {
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  stageGroups: { board: string; label: string; options: { value: string; label: string }[] }[];
  source: string | null;
  sources: { name: string; label: string }[];
  createdAt: string;
  customFields: Record<string, unknown>;
  notes: Note[];
  authorName: (id: string | null) => string;
  onStatus: (value: string) => void;
  onSource: (value: string) => void;
  onEditContact?: () => void;
  onSaveNote: (text: string, type: 'note' | 'call' | 'email' | 'text') => Promise<void>;
  onPin: (id: string) => void;
  onAttachment: (noteId: string, attachmentId: string) => void;
  onAddTask: () => void;
  taskCount: number;
  tasks: ReactNode;
  taskForm: ReactNode;
  fullFile: ReactNode;
}

export function SimpleLeadCard(props: Props) {
  const [text, setText] = useState('');
  const [type, setType] = useState<'note' | 'call' | 'email' | 'text'>('note');
  const [saving, setSaving] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  return (
    <div className="bg-background text-foreground">
      <header className="border-b px-5 pb-5 pt-8 sm:px-8">
        <h2 className="font-heading text-2xl font-bold pr-8 break-words">{props.name}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Select value={props.status} onValueChange={props.onStatus}>
            <SelectTrigger aria-label="Lead stage" className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-96">{props.stageGroups.map(g => (
              <SelectGroup key={g.board}><SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">{g.label}</SelectLabel>
                {g.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectGroup>))}</SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">Added {format(new Date(props.createdAt), 'dd MMM yyyy')}</span>
          <div className="sm:ml-auto">{props.fullFile}</div>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="order-2 lg:order-1 border-t lg:border-t-0 lg:border-r px-5 py-6 sm:px-8 lg:px-6 space-y-7">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Contact details</h3>
              {props.onEditContact && <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit contact" aria-label="Edit contact" onClick={props.onEditContact}><Pencil className="h-3.5 w-3.5" /></Button>}
            </div>
            <dl className="space-y-4 text-sm">
              <div><dt className="text-xs text-muted-foreground mb-1">Mobile</dt><dd className="break-all">{props.phone || 'No mobile number'}</dd></div>
              <div><dt className="text-xs text-muted-foreground mb-1">Email</dt><dd className="break-all">{props.email || 'No email address'}</dd></div>
            </dl>
            <div className="flex gap-2 mt-4">
              {props.phone && <Button asChild size="icon" variant="outline" title="Call" aria-label="Call"><a href={`tel:${props.phone}`}><Phone className="h-4 w-4" /></a></Button>}
              {props.phone && <Button size="icon" variant="outline" title="Text" aria-label="Text" onClick={() => setSmsOpen(true)}><MessageSquare className="h-4 w-4" /></Button>}
              {props.email && <Button asChild size="icon" variant="outline" title="Email" aria-label="Email"><a href={`mailto:${props.email}`}><Mail className="h-4 w-4" /></a></Button>}
            </div>
          </section>
          <section className="border-t pt-5">
            <h3 className="text-xs text-muted-foreground mb-2">Lead source</h3>
            <Select value={props.source || ''} onValueChange={props.onSource}>
              <SelectTrigger aria-label="Lead source" className="text-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>{props.sources.map(s => <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </section>
          <section className="border-t pt-5">
            <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold">Tasks <span className="text-muted-foreground font-normal">{props.taskCount}</span></h3><Button variant="ghost" size="icon" className="h-7 w-7" title="Add task" aria-label="Add task" onClick={props.onAddTask}><Plus className="h-4 w-4" /></Button></div>
            {props.taskForm}
            {props.tasks}
          </section>
        </aside>
        <main className="order-1 lg:order-2 min-w-0 px-5 py-6 sm:px-8">
          <h3 className="text-base font-semibold mb-4">Notes & activity</h3>
          <div className="border rounded-lg overflow-hidden mb-6">
            <Textarea aria-label="New lead note" placeholder="Add a note…" value={text} onChange={e => setText(e.target.value)} className="min-h-[110px] border-0 rounded-none shadow-none resize-y" maxLength={2000} />
            <div className="border-t px-3 py-2 flex items-center justify-between gap-2">
              <Select value={type} onValueChange={v => setType(v as typeof type)}><SelectTrigger aria-label="Activity type" className="h-8 w-28 text-xs border-0 shadow-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="note">Note</SelectItem><SelectItem value="call">Call</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="text">Text</SelectItem></SelectContent></Select>
              <Button size="sm" disabled={!text.trim() || saving} className="gap-2" onClick={async () => { setSaving(true); try { await props.onSaveNote(text, type); setText(''); } catch { /* Keep the draft when saving fails; the shared handler reports the error. */ } finally { setSaving(false); } }}><Send className="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Save note'}</Button>
            </div>
          </div>
          <FormAnswersCard customFields={props.customFields} />
          <div className="divide-y">
            {props.notes.length === 0 && <p className="text-sm text-muted-foreground py-8">No notes yet</p>}
            {props.notes.map(note => <article key={note.id} className="py-5 first:pt-0">
              <div className="flex items-center justify-between gap-3 mb-2"><p className="text-xs text-muted-foreground">{format(new Date(note.created_at), 'dd MMM yyyy, h:mm a')} · {props.authorName(note.author_id)}</p><Button variant="ghost" size="icon" className={note.pinned ? 'h-7 w-7 text-primary' : 'h-7 w-7 text-muted-foreground'} aria-label={note.pinned ? 'Unpin note' : 'Pin note'} title={note.pinned ? 'Unpin note' : 'Pin note'} onClick={() => props.onPin(note.id)}><Pin className="h-3.5 w-3.5" /></Button></div>
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{note.content}</p>
              {note.attachments?.map(att => <Button key={att.id} variant="outline" size="sm" className="mt-2 gap-2 max-w-full" onClick={() => props.onAttachment(note.id, att.id)}><Download className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{att.file_name}</span></Button>)}
            </article>)}
          </div>
        </main>
      </div>
      <SmsComposeDialog
        lead={smsOpen ? { first_name: props.name, phone: props.phone } : null}
        onClose={() => setSmsOpen(false)}
        onLog={async content => { await props.onSaveNote(content, 'text'); }}
      />
    </div>
  );
}