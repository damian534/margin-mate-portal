import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  createGroupOrChannel, getOrCreateDirect, initials, type ChatPerson,
} from '@/hooks/useChat';

interface Props {
  mode: 'message' | 'channel' | null;
  onClose: () => void;
  people: ChatPerson[];
  myId: string;
  tenantId: string | null;
  onCreated: (conversationId: string) => void;
}

export function NewConversationDialog({ mode, onClose, people, myId, tenantId, onCreated }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people
      .filter(p => p.user_id !== myId)
      .filter(p => !q || (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q));
  }, [people, search, myId]);

  const reset = () => {
    setSearch(''); setSelected([]); setName(''); setDescription(''); setIsPrivate(false);
  };

  const close = () => { reset(); onClose(); };

  const toggle = (id: string) =>
    setSelected(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  const submit = async () => {
    if (!tenantId) { toast.error('Your account is not linked to a brokerage yet'); return; }
    setSaving(true);
    try {
      let id: string;
      if (mode === 'channel') {
        if (!name.trim()) { toast.error('Give the channel a name'); setSaving(false); return; }
        id = await createGroupOrChannel({
          myId, tenantId, type: 'channel',
          name: name.trim().replace(/^#/, ''),
          description: description.trim(),
          isPrivate,
          memberIds: selected,
        });
      } else {
        if (!selected.length) { toast.error('Pick at least one person'); setSaving(false); return; }
        id = selected.length === 1
          ? await getOrCreateDirect(myId, selected[0], tenantId)
          : await createGroupOrChannel({
              myId, tenantId, type: 'group',
              name: name.trim() || selected.map(u => people.find(p => p.user_id === u)?.full_name || 'Team member').join(', '),
              isPrivate: true,
              memberIds: selected,
            });
      }
      onCreated(id);
      close();
    } catch (e) {
      toast.error((e as Error).message || 'Could not start the conversation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!mode} onOpenChange={o => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'channel' ? 'New channel' : 'New message'}</DialogTitle>
          <DialogDescription>
            {mode === 'channel'
              ? 'Channels are for topics your whole team follows, like settlements or credit.'
              : 'Pick one person for a direct message, or several to start a group.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {mode === 'channel' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ch-name">Channel name</Label>
                <Input id="ch-name" value={name} onChange={e => setName(e.target.value)} placeholder="settlements" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ch-desc">Description</Label>
                <Textarea id="ch-desc" rows={2} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Anything relating to upcoming settlements." />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Private channel</p>
                  <p className="text-xs text-muted-foreground">Only invited people can see it.</p>
                </div>
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ch-people">{mode === 'channel' ? 'Add people' : 'Search people'}</Label>
            <Input id="ch-people" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people..." />
          </div>

          <div className="max-h-60 overflow-y-auto rounded-lg border divide-y">
            {candidates.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No one else found in your brokerage.</p>
            ) : candidates.map(p => {
              const on = selected.includes(p.user_id);
              const label = p.full_name || p.email || 'Team member';
              return (
                <button
                  key={p.user_id}
                  type="button"
                  onClick={() => toggle(p.user_id)}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors',
                    on && 'bg-primary/5')}
                >
                  <span className="w-7 h-7 rounded-full bg-muted text-[11px] font-semibold flex items-center justify-center shrink-0">
                    {initials(label)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm truncate">{label}</span>
                    {p.email && <span className="block text-[11px] text-muted-foreground truncate">{p.email}</span>}
                  </span>
                  {on && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'channel' ? 'Create channel' : 'Start conversation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
