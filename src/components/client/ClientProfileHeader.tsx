import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';
import type { ClientContact, ClientDeal } from '@/hooks/useClientProfile';

interface Props {
  contact: ClientContact;
  deals: ClientDeal[];
  onBack: () => void;
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function ClientProfileHeader({ contact, deals, onBack }: Props) {
  const settled = deals.filter(d => d.status === 'settled' || !!d.settled_date);
  const totalLending = deals.reduce((s, d) => s + Number(d.loan_amount || 0), 0);
  const initials = `${contact.first_name?.[0] ?? ''}${contact.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="border-b bg-card">
      <div className="container py-5">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2 gap-1.5 text-muted-foreground" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to contacts
        </Button>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary text-lg font-semibold flex items-center justify-center shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight truncate">
              {contact.first_name} {contact.last_name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                contact.type === 'client' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
              }`}>
                {contact.type === 'client' ? 'Client' : 'Referrer'}
              </span>
              <span>Added {format(new Date(contact.created_at), 'MMM yyyy')}</span>
              <span>·</span>
              <span>{deals.length} deal{deals.length === 1 ? '' : 's'}</span>
              {settled.length > 0 && <><span>·</span><span>{settled.length} settled</span></>}
              {totalLending > 0 && <><span>·</span><span className="tabular-nums font-medium text-foreground">{money(totalLending)} lending</span></>}
              {contact.company && (
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {contact.company}</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {contact.email && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`mailto:${contact.email}`}><Mail className="w-3.5 h-3.5" /> Email</a>
              </Button>
            )}
            {contact.phone && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={`tel:${contact.phone}`}><Phone className="w-3.5 h-3.5" /> Call</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
