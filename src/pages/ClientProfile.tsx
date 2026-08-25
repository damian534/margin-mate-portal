import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientProfile } from '@/hooks/useClientProfile';
import { ClientProfileHeader } from '@/components/client/ClientProfileHeader';
import { ClientOverviewTab } from '@/components/client/ClientOverviewTab';
import { ClientDealsTab } from '@/components/client/ClientDealsTab';
import { ClientDocumentsTab } from '@/components/client/ClientDocumentsTab';
import { AddressesTab } from '@/components/lead/tabs/AddressesTab';
import { EmploymentIdTab } from '@/components/lead/tabs/EmploymentIdTab';
import { FinancialsTab } from '@/components/lead/tabs/FinancialsTab';
import { CommunicationsTab } from '@/components/lead/tabs/CommunicationsTab';

type TabKey = 'overview' | 'deals' | 'profile' | 'financials' | 'documents' | 'activity';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'deals', label: 'Deals' },
  { key: 'profile', label: 'Profile' },
  { key: 'financials', label: 'Financials' },
  { key: 'documents', label: 'Documents' },
  { key: 'activity', label: 'Activity' },
];

export default function ClientProfile() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get('preview') === 'true';
  const [tab, setTab] = useState<TabKey>('overview');

  const { contact, deals, primaryLeadId, tasks, timeline, documents, loading, notFound } =
    useClientProfile(contactId, isPreviewMode);

  const openDeal = (leadId: string) => navigate(`/admin?lead=${leadId}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (notFound || !contact) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container py-24 text-center space-y-4">
          <p className="text-muted-foreground">This client could not be found.</p>
          <Button onClick={() => navigate('/admin?tab=contacts')}>Back to contacts</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <ClientProfileHeader contact={contact} deals={deals} onBack={() => navigate('/admin?tab=contacts')} />

      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container py-6 pb-16">
        {tab === 'overview' && (
          <ClientOverviewTab contact={contact} deals={deals} tasks={tasks} timeline={timeline} onOpenDeal={openDeal} />
        )}

        {tab === 'deals' && <ClientDealsTab deals={deals} onOpenDeal={openDeal} />}

        {tab === 'profile' && (
          primaryLeadId ? (
            <div className="space-y-6">
              <AddressesTab leadId={primaryLeadId} isPreviewMode={isPreviewMode} />
              <EmploymentIdTab leadId={primaryLeadId} isPreviewMode={isPreviewMode} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Personal details are captured on a deal. Create a deal for this client to record addresses and employment.
            </p>
          )
        )}

        {tab === 'financials' && (
          <ClientFinancialsTab
            contactId={contact.id}
            clientName={`${contact.first_name} ${contact.last_name}`.trim()}
            isPreviewMode={isPreviewMode}
          />
        )}

        {tab === 'documents' && <ClientDocumentsTab deals={deals} documents={documents} onOpenDeal={openDeal} />}

        {tab === 'activity' && (
          primaryLeadId ? (
            <CommunicationsTab leadId={primaryLeadId} isPreviewMode={isPreviewMode} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No activity recorded yet.</p>
          )
        )}
      </div>
    </div>
  );
}
