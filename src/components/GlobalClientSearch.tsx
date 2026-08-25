import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Result {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string | null;
}

export function GlobalClientSearch({ className = '' }: { className?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { isPreviewMode } = useAuth();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || isPreviewMode) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const like = `%${q}%`;
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, company, type')
        .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},company.ilike.${like}`)
        .order('first_name')
        .limit(8);
      setResults((data as Result[]) || []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, isPreviewMode]);

  const select = (id: string) => {
    setOpen(false);
    setQuery('');
    navigate(`/admin/clients/${id}`);
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        placeholder="Search clients or companies"
        className="w-full h-10 rounded-lg border border-border bg-background pl-9 pr-16 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition"
      />
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline-block rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        ⌘K
      </kbd>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">No contacts found.</div>
          ) : (
            results.map(r => (
              <button
                key={r.id}
                onClick={() => select(r.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                  {`${r.first_name?.[0] ?? ''}${r.last_name?.[0] ?? ''}`.toUpperCase() || <User className="w-3.5 h-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{r.first_name} {r.last_name}</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {[r.company, r.email, r.phone].filter(Boolean).join(' · ') || 'No contact details'}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
