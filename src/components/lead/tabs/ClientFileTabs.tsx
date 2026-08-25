import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ClientFileTab =
  | 'summary'
  | 'clients'
  | 'addresses'
  | 'employment'
  | 'financials'
  | 'consent'
  | 'lending'
  | 'funding'
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
  { key: 'funding', label: 'Funds Position' },
  { key: 'documents', label: 'Documents' },
  { key: 'notes', label: 'Notes' },
  { key: 'communications', label: 'Communications' },
];

interface Props {
  value: ClientFileTab;
  onChange: (tab: ClientFileTab) => void;
  /** Optional action rendered at the right end of the strip (e.g. broker fact find entry). */
  action?: ReactNode;
}

/** Horizontal tab strip across the top of the client file. */
export function ClientFileTabs({ value, onChange, action }: Props) {
  return (
    <div className="sticky top-0 z-20 bg-background border-b">
      <div className="flex items-stretch gap-2 px-4">
      <div
        className="flex flex-1 items-stretch gap-1 overflow-x-auto min-w-0"
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
      {action && <div className="flex items-center shrink-0 py-1.5">{action}</div>}
      </div>
    </div>

  );
}
