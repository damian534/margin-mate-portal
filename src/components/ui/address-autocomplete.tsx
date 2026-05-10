import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
  id?: string;
}

/**
 * Free Australian address autocomplete using OpenStreetMap Nominatim
 * (which incorporates the GNAF dataset). No API key required.
 * Restricted to AU and debounced to respect Nominatim usage policy.
 */
export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing an address...",
  className,
  maxLength = 500,
  disabled,
  id,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = value?.trim();
    if (!q || q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("address-search", {
          method: "GET" as any,
          // pass query via querystring through the underlying fetch
        } as any);
        // The supabase-js invoke does not support querystrings cleanly; fall back to direct fetch.
        let results: Suggestion[] = [];
        if (error || !data) {
          const projectUrl = (import.meta as any).env.VITE_SUPABASE_URL;
          const anonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const res = await fetch(
            `${projectUrl}/functions/v1/address-search?q=${encodeURIComponent(q)}`,
            {
              signal: ctrl.signal,
              headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
            }
          );
          if (res.ok) results = await res.json();
        } else {
          results = data as Suggestion[];
        }
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIdx(-1);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (s: Suggestion) => {
    skipNextFetch.current = true;
    onChange(s.display_name);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoComplete="off"
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && activeIdx >= 0) {
            e.preventDefault();
            pick(suggestions[activeIdx]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {loading && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-md border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <button
              key={s.place_id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              className={cn(
                "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                i === activeIdx && "bg-accent"
              )}
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{s.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}