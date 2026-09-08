import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { AppSideNav } from '@/components/AppSideNav';
import { useAuth } from '@/hooks/useAuth';
import { useConversations, useOrgPeople } from '@/hooks/useChat';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatConversationView } from '@/components/chat/ChatConversationView';
import { NewConversationDialog } from '@/components/chat/NewConversationDialog';
import { Loader2, MessagesSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Chat() {
  const { user } = useAuth();
  const { people, tenantId } = useOrgPeople();
  const { conversations, loading, reload } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'message' | 'channel' | null>(null);

  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const active = conversations.find(c => c.id === activeId) || null;

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader />
      <div className="flex w-full flex-1 min-h-0 items-stretch">
        <AppSideNav />
        <div className="flex-1 min-w-0 flex border-l">
          <ChatSidebar
            conversations={conversations}
            people={people}
            myId={user?.id || ''}
            activeId={activeId}
            onSelect={setActiveId}
            onNewMessage={() => setDialog('message')}
            onNewChannel={() => setDialog('channel')}
            className={cn(active && 'hidden md:flex')}
          />
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : active ? (
            <ChatConversationView
              key={active.id}
              conversation={active}
              people={people}
              myId={user?.id || ''}
              onChanged={reload}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-2">
              <MessagesSquare className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">No conversations yet</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Start a direct message with someone in your team, or create a channel for a topic everyone follows.
              </p>
            </div>
          )}
        </div>
      </div>

      <NewConversationDialog
        mode={dialog}
        onClose={() => setDialog(null)}
        people={people}
        myId={user?.id || ''}
        tenantId={tenantId}
        onCreated={id => { reload(); setActiveId(id); }}
      />
    </div>
  );
}
