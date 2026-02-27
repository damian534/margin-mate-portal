import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchSuburbsAsync } from "@/lib/suburbAnalysis";
import { cn } from "@/lib/utils";

interface SuburbSearchInputProps {
  value: string;
  selectedState: string;
  onChange: (suburb: string, state: string) => void;
  isLoading?: boolean;
}

interface SuburbSuggestion {
  suburb: string;
  state: string;
  postcode: string;
}

export function SuburbSearchInput({ value, selectedState, onChange, isLoading: externalLoading }: SuburbSearchInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SuburbSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setInputValue(value); }, [value]);

  const searchSuburbs = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); return; }
    setIsSearching(true);
    try {
      const results = await searchSuburbsAsync(query);
      setSuggestions(results);
    } catch { setSuggestions([]); }
    finally { setIsSearching(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchSuburbs(inputValue), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputValue, searchSuburbs]);

  const handleSelectSuggestion = (suburb: string, state: string) => {
    setInputValue(suburb);
    setShowSuggestions(false);
    onChange(suburb, state);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev); break;
      case "ArrowUp": e.preventDefault(); setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev); break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) handleSelectSuggestion(suggestions[highlightedIndex].suburb, suggestions[highlightedIndex].state);
        else if (inputValue.length >= 2) { setShowSuggestions(false); onChange(inputValue, selectedState); }
        break;
      case "Escape": setShowSuggestions(false); break;
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      if (inputValue.length >= 2 && inputValue !== value) onChange(inputValue, selectedState);
    }, 200);
  };

  const showLoading = externalLoading || isSearching;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">Suburb</Label>
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input ref={inputRef} type="text" value={inputValue}
            onChange={e => { setInputValue(e.target.value); setShowSuggestions(true); setHighlightedIndex(-1); }}
            onFocus={() => setShowSuggestions(true)} onKeyDown={handleKeyDown} onBlur={handleBlur}
            placeholder="Type suburb name (e.g., Essendon)" className="h-11 rounded-lg pl-10 pr-10" autoComplete="off" />
          {showLoading ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" /> : <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
        </div>

        {showSuggestions && inputValue.length >= 2 && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
            {suggestions.map((item, index) => (
              <button key={`${item.suburb}-${item.state}-${item.postcode}`} type="button"
                className={cn("w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-accent transition-colors", highlightedIndex === index && "bg-accent")}
                onMouseDown={e => e.preventDefault()} onClick={() => handleSelectSuggestion(item.suburb, item.state)} onMouseEnter={() => setHighlightedIndex(index)}>
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">{item.suburb}</span>
                <span className="text-muted-foreground">{item.state} {item.postcode}</span>
              </button>
            ))}
          </div>
        )}

        {showSuggestions && inputValue.length >= 2 && suggestions.length === 0 && !isSearching && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">
            No suburbs found matching "{inputValue}" — you can still enter it manually.
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Start typing to search 16,000+ Australian suburbs</p>
    </div>
  );
}