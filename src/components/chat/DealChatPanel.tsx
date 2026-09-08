import { Loader2, MessagesSquare } from 'lucide-react';
import { ChatConversationView } from '@/components/chat/ChatConversationView';
import { useDealConversation } from '@/hooks/useDealChat';
import { useOrgPeople } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  leadId: string;
  /** Optional secondary line under the title, e.g. "$1,400,000 · NAB · Refinance". */
  subtitle?: string;
}

/** The deal's own team conversation, shown inside the loan file. */
export function DealChatPanel({ leadId, subtitle }: Props) {
  const { user, isPreviewMode } = useAuth();
  const { people } = useOrgPeople();
  const { conversation, loading, error, reload } = useDealConversation(leadId, !isPreviewMode);

  if (isPreviewMode) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <MessagesSquare className="w-7 h-7 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Deal chat is not available in demo mode.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="py-16 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !conversation) {
    return <p className="py-16 text-center text-sm text-muted-foreground">{error || 'Could not open the deal chat.'}</p>;
  }

  return (
    <div className="flex flex-col h-[70vh] min-h-[420px] border rounded-lg overflow-hidden bg-card">
      <ChatConversationView
        key={conversation.id}
        conversation={conversation}
        people={people}
        myId={user?.id || ''}
        onChanged={reload}
        subtitle={subtitle}
      />
    </div>
  );
}
