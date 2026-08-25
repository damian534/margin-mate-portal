import { cn } from '@/lib/utils';

export type ClientFileTab =
  | 'summary'
  | 'clients'
  | 'addresses'
  | 'employment'
  | 'financials'
  | 'consent'
  | 'lending'
  | 'documents'
  | 'notes'
  | 'communications';

export const CLIENT_FILE_TABS: { key: ClientFileTab; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'clients', label: 'Clients' },
  { key: 'addresses', label: 'Addresses' },
  { key: 'employment', label: 'Employment / ID' },
  { key: 'financials', label: 'Financials' },
  { key: 'consent', label: 'Privacy Consent' },
  { key: 'lending', label: 'Lending' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
  { key: 'communications', label: 'Communications' },
];

interface Props {
  value: ClientFileTab;
  onChange: (tab: ClientFileTab) => void;
}

/** Horizontal tab strip across the top of the client file. */
export function ClientFileTabs({ value, onChange }: Props) {
  return (
    <div className="sticky top-0 z-20 bg-background border-b">
      <div
        className="flex items-stretch gap-1 overflow-x-auto px-4"
        style={{ scrollbarWidth: 'thin' }}
        role="tablist"
        aria-label="Client file sections"
      >
        {CLIENT_FILE_TABS.map(t => {
          const active = t.key === value;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              className={cn(
                'shrink-0 whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2',
                active
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
