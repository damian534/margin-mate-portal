import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/lead/SectionCard';
import { FileText, Download, ExternalLink } from 'lucide-react';
import type { ClientDeal, ClientDocument } from '@/hooks/useClientProfile';

interface Props {
  deals: ClientDeal[];
  documents: ClientDocument[];
  onOpenDeal: (leadId: string) => void;
}

export function ClientDocumentsTab({ deals, documents, onOpenDeal }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const open = async (doc: ClientDocument) => {
    if (!doc.file_path) return;
    setBusy(doc.id);
    const { data, error } = await supabase.storage.from('client-documents').createSignedUrl(doc.file_path, 60);
    setBusy(null);
    if (error || !data?.signedUrl) { toast.error('Could not open document'); return; }
    window.open(data.signedUrl, '_blank');
  };

  if (!deals.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No deals linked, so no documents yet.</p>;
  }

  return (
    <div className="space-y-4">
      {deals.map(deal => {
        const docs = documents.filter(d => d.lead_id === deal.id);
        const uploaded = docs.filter(d => !!d.file_path);
        return (
          <SectionCard
            key={deal.id}
            icon={FileText}
            title={deal.opportunity_name || `${deal.first_name} ${deal.last_name}`}
            tone="neutral"
            subtitle={`${uploaded.length} of ${docs.length} collected`}
            rightSlot={
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onOpenDeal(deal.id)}>
                <ExternalLink className="w-3 h-3" /> Open deal
              </Button>
            }
          >
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">No documents requested on this deal.</p>
            ) : (
              <div className="space-y-1.5">
                {docs.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.section || 'General'}
                        {d.uploaded_at ? ` · uploaded ${format(new Date(d.uploaded_at), 'd MMM yy')}` : ''}
                      </p>
                    </div>
                    {d.file_path ? (
                      <Button variant="ghost" size="sm" className="gap-1 shrink-0" disabled={busy === d.id} onClick={() => open(d)}>
                        <Download className="w-3.5 h-3.5" /> View
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground capitalize shrink-0">{d.status?.replace(/_/g, ' ') || 'pending'}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}
