import { cn } from '@/lib/utils';

export interface UnderlineTab<T extends string = string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  tabs: UnderlineTab<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

/** Underline-style tab bar matching the EMPLOYMENT/ID screenshot. */
export function UnderlineTabs<T extends string>({ tabs, value, onChange, className }: Props<T>) {
  return (
    <div className={cn('border-b border-border overflow-x-auto', className)}>
      <div className="flex items-end gap-6 sm:gap-10 px-1 min-w-max">
        {tabs.map(t => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange(t.value)}
              className={cn(
                'relative pb-3 pt-2 text-xs sm:text-sm uppercase tracking-[0.12em] transition-colors whitespace-nowrap',
                active
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground/80 font-medium',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'absolute left-0 right-0 -bottom-px h-0.5 rounded-full transition-all',
                  active ? 'bg-primary' : 'bg-transparent',
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
