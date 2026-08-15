import { useState } from "react";
import { ChevronDown, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShowCalculation({ lines, label = "Show calculation" }: { lines: string[]; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Calculator className="h-3 w-3" /> {label}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground font-mono">
          {lines.join("\n")}
        </pre>
      )}
    </div>
  );
}
