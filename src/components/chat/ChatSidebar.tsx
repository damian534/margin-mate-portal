import { useMemo, useState } from 'react';
import { ChevronDown, Hash, Home, Plus, Search, SquarePen, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  conversationTitle, initials, type ChatConversation, type ChatPerson,
} from '@/hooks/useChat';

interface Props {
  conversations: ChatConversation[];
  people: ChatPerson[];
  myId: string;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewMessage: () => void;
  onNewChannel: () => void;
  className?: string;
}

function Section({
  title, items, activeId, onSelect, renderIcon,
}: {
  title: string;
  items: { id: string; label: string; unread: number }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  renderIcon: (label: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1 px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn('w-3 h-3 transition-transform', !open && '-rotate-90')} />
        {title}
      </button>
      {open && (
        <div className="space-y-0.5 px-2">
          {items.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground/70">Nothing here yet</p>
          ) : items.map(i => (
            <button
              key={i.id}
              onClick={() => onSelect(i.id)}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                activeId === i.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                i.unread > 0 && activeId !== i.id && 'text-foreground font-medium',
              )}
            >
              {renderIcon(i.label)}
              <span className="truncate flex-1 text-left">{i.label}</span>
              {i.unread > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 shrink-0">
                  {i.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatSidebar({
  conversations, people, myId, activeId, onSelect, onNewMessage, onNewChannel, className,
}: Props) {
  const [q, setQ] = useState('');

  const withTitles = useMemo(
    () => conversations.map(c => ({ c, label: conversationTitle(c, people, myId) })),
    [conversations, people, myId],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? withTitles.filter(x => x.label.toLowerCase().includes(s)) : withTitles;
  }, [withTitles, q]);

  const pick = (types: string[]) =>
    filtered.filter(x => types.includes(x.c.type)).map(x => ({ id: x.c.id, label: x.label, unread: x.c.unread }));

  return (
    <div className={cn('w-full md:w-72 shrink-0 border-r bg-card flex flex-col', className)}>
      <div className="px-3 pt-3 pb-2 space-y-2">
        <h2 className="text-sm font-semibold">Connect Chat</h2>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search conversations"
            className="h-8 pl-8 text-sm" />
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-xs" onClick={onNewMessage}>
            <SquarePen className="w-3 h-3" /> Message
          </Button>
          <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 text-xs" onClick={onNewChannel}>
            <Plus className="w-3 h-3" /> Channel
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <Section title="Direct messages" items={pick(['direct'])} activeId={activeId} onSelect={onSelect}
          renderIcon={label => (
            <span className="w-5 h-5 rounded-full bg-muted text-[9px] font-semibold flex items-center justify-center shrink-0">
              {initials(label)}
            </span>
          )} />
        <Section title="Groups" items={pick(['group'])} activeId={activeId} onSelect={onSelect}
          renderIcon={() => <Users className="w-4 h-4 shrink-0" />} />
        <Section title="Channels" items={pick(['channel'])} activeId={activeId} onSelect={onSelect}
          renderIcon={() => <Hash className="w-4 h-4 shrink-0" />} />
        <Section title="Deal chats" items={pick(['deal'])} activeId={activeId} onSelect={onSelect}
          renderIcon={() => <Home className="w-4 h-4 shrink-0" />} />
      </div>
    </div>
  );
}
