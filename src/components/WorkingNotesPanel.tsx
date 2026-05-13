import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Save, StickyNote } from 'lucide-react';
import { toast } from 'sonner';

const WORKING_NOTES_TITLE = '📝 Working Notes';

interface Props {
  leadId: string;
  userId: string | null;
  isPreviewMode: boolean;
  /** Optional context used when notifying mentioned colleagues */
  leadName?: string;
}

/**
 * One persistent "Working Notes" task per lead — MyCRM-style running notes log.
 * Stored as a single task row (title = "📝 Working Notes") with the body kept
 * in `description`. Lines that begin with `[ ]` / `[x]` (optionally prefixed
 * with `-`) render as toggleable checkboxes; click any other line to edit.
 * Container is scrollable with the top pinned, so old notes stay visible.
 */
export function WorkingNotesPanel({ leadId, userId, isPreviewMode, leadName }: Props) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [body, setBody] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const initialised = useRef(false);
  const lastBodyRef = useRef<string>('');

  // Load (or lazily create) the working-notes task for this lead.
  useEffect(() => {
    initialised.current = false;
    setTaskId(null);
    setBody('');
    setEditing(false);
    if (isPreviewMode) {
      setBody('[x] Privacy form signed by John 12 May\n[ ] Privacy form pending Jane\n[ ] ID upload from co-applicant\nMet onsite — keen to lodge before EOFY.');
      initialised.current = true;
      return;
    }
    if (!leadId || leadId.startsWith('preview-')) return;
    (async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, description')
        .eq('lead_id', leadId)
        .eq('title', WORKING_NOTES_TITLE)
        .order('created_at', { ascending: true })
        .limit(1);
      if (data && data.length > 0) {
        setTaskId(data[0].id);
        setBody(data[0].description || '');
        lastBodyRef.current = data[0].description || '';
      }
      initialised.current = true;
    })();
  }, [leadId, isPreviewMode]);

  const ensureTask = async (): Promise<string | null> => {
    if (taskId) return taskId;
    if (isPreviewMode || !userId) return null;
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        lead_id: leadId,
        title: WORKING_NOTES_TITLE,
        description: '',
        created_by: userId,
      } as any)
      .select('id')
      .single();
    if (error || !data) {
      toast.error('Could not create working notes');
      return null;
    }
    setTaskId(data.id);
    return data.id;
  };

  const persist = async (next: string) => {
    const previous = lastBodyRef.current;
    setBody(next);
    if (isPreviewMode) return;
    setSaving(true);
    const id = await ensureTask();
    if (!id) { setSaving(false); return; }
    await (supabase as any)
      .from('tasks')
      .update({ description: next })
      .eq('id', id);
    lastBodyRef.current = next;
    setSaving(false);
    // Fire-and-forget mention notifications for newly-added @handles
    notifyNewMentions(previous, next).catch(() => {});
  };

  const extractMentions = (text: string): string[] => {
    const set = new Set<string>();
    const re = /(?:^|\s)@([a-zA-Z][a-zA-Z0-9._-]{1,40})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) set.add(m[1].toLowerCase());
    return Array.from(set);
  };

  const notifyNewMentions = async (prev: string, next: string) => {
    if (!userId) return;
    const before = new Set(extractMentions(prev));
    const newOnes = extractMentions(next).filter((h) => !before.has(h));
    if (newOnes.length === 0) return;

    // Resolve current user's tenant (broker_id) to scope colleague lookup
    const { data: me } = await supabase
      .from('profiles')
      .select('broker_id, full_name')
      .eq('user_id', userId)
      .maybeSingle();
    const tenantId = (me as any)?.broker_id || userId;
    const senderName = (me as any)?.full_name || 'A colleague';

    // Pull tenant colleagues once
    const { data: peers } = await supabase
      .from('profiles')
      .select('email, full_name')
      .or(`broker_id.eq.${tenantId},user_id.eq.${tenantId}`);
    if (!peers || peers.length === 0) return;

    const matches: { email: string; name: string }[] = [];
    for (const handle of newOnes) {
      const target = handle.replace(/[._-]+/g, ' ');
      const hit = peers.find((p: any) => {
        if (!p.email || !p.full_name) return false;
        const fn = p.full_name.toLowerCase();
        const first = fn.split(/\s+/)[0];
        return fn === target || first === target || fn.replace(/\s+/g, '') === handle;
      });
      if (hit) matches.push({ email: (hit as any).email, name: (hit as any).full_name });
    }
    if (matches.length === 0) return;

    const subject = `${senderName} mentioned you${leadName ? ` on ${leadName}` : ''}`;
    const snippet = next.slice(0, 600).replace(/</g, '&lt;');
    const html = `
      <div style="font-family:Arial,sans-serif;color:#111;max-width:560px">
        <p>${senderName} mentioned you in working notes${leadName ? ` for <strong>${leadName}</strong>` : ''}.</p>
        <pre style="white-space:pre-wrap;background:#f6f6f6;border:1px solid #e5e5e5;border-radius:8px;padding:12px;font-family:inherit;font-size:13px">${snippet}</pre>
        <p style="color:#666;font-size:12px">Open Margin Connect to reply.</p>
      </div>`;

    await Promise.all(matches.map(({ email, name }) =>
      supabase.functions.invoke('send-email', { body: { to: email, subject, html } })
        .then(() => toast.success(`Notified ${name.split(' ')[0]}`))
        .catch(() => {})
    ));
  };

  const startEditing = () => {
    setDraft(body);
    setEditing(true);
  };

  const saveEdit = async () => {
    setEditing(false);
    await persist(draft);
  };

  // Parse body into renderable rows. Each line is either a checkbox row or plain text.
  const rows = useMemo(() => parseRows(body), [body]);

  const toggleRow = async (rowIdx: number) => {
    const lines = body.split('\n');
    const target = rows[rowIdx];
    if (!target || target.kind !== 'check') return;
    const original = lines[target.lineIndex];
    const flipped = target.checked
      ? original.replace(/\[(x|X)\]/, '[ ]')
      : original.replace(/\[ \]/, '[x]');
    lines[target.lineIndex] = flipped;
    await persist(lines.join('\n'));
  };

  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-amber-100/60 dark:bg-amber-900/20 border-b border-amber-200/60">
        <div className="flex items-center gap-2 min-w-0">
          <StickyNote className="w-4 h-4 text-amber-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">Working Notes</span>
          {saving && <span className="text-[10px] text-muted-foreground">Saving…</span>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Tip: <code className="bg-background/80 px-1 rounded">[]</code> = checkbox · <code className="bg-background/80 px-1 rounded">@name</code> emails a colleague
          </span>
          {!editing ? (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={startEditing}>
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          ) : (
            <Button size="sm" className="h-7 px-2 text-xs" onClick={saveEdit}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
        </div>
      </div>

      <div className="p-3">
        {editing ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`One note per line. Use [] for a checkbox, e.g.\n[ ] Credit check completed — John signed 12 May, Jane pending\n[ ] ID upload from co-applicant\nGeneral context goes on its own line.`}
            className="text-sm min-h-[180px] max-h-80 overflow-y-auto resize-y font-mono"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                saveEdit();
              }
              // Auto-expand `[]` to `[ ] ` for convenience
              if (e.key === ']' && e.currentTarget.value.endsWith('[')) {
                e.preventDefault();
                const t = e.currentTarget;
                const pos = t.selectionStart;
                const before = t.value.slice(0, pos);
                const after = t.value.slice(pos);
                const next = `${before}] ${after}`;
                setDraft(next);
                requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = pos + 2; });
              }
            }}
          />
        ) : (
          <div
            className="text-sm max-h-80 overflow-y-auto pr-1 space-y-1 cursor-text"
            onClick={(e) => {
              // Clicking outside checkboxes enters edit mode
              const target = e.target as HTMLElement;
              if (target.closest('[data-row-checkbox]')) return;
              startEditing();
            }}
          >
            {rows.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No working notes yet — click to start a running log for this client.
              </p>
            ) : (
              rows.map((row, idx) =>
                row.kind === 'check' ? (
                  <label
                    key={idx}
                    data-row-checkbox
                    className="flex items-start gap-2 leading-relaxed"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={row.checked}
                      onCheckedChange={() => toggleRow(idx)}
                      className="mt-0.5"
                    />
                    <span className={row.checked ? 'line-through text-muted-foreground' : ''}>
                      {row.text || <span className="text-muted-foreground italic">(empty)</span>}
                    </span>
                  </label>
                ) : (
                  <p key={idx} className="leading-relaxed whitespace-pre-wrap">
                    {row.text || <span>&nbsp;</span>}
                  </p>
                )
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Row =
  | { kind: 'check'; lineIndex: number; checked: boolean; text: string }
  | { kind: 'text'; lineIndex: number; text: string };

function parseRows(body: string): Row[] {
  if (!body) return [];
  const lines = body.split('\n');
  const rows: Row[] = [];
  lines.forEach((raw, lineIndex) => {
    const line = raw.trimEnd();
    const m = line.match(/^\s*-?\s*\[( |x|X)\]\s?(.*)$/);
    if (m) {
      rows.push({ kind: 'check', lineIndex, checked: m[1] !== ' ', text: m[2] });
    } else {
      rows.push({ kind: 'text', lineIndex, text: line });
    }
  });
  return rows;
}