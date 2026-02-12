export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
        <span className="text-primary-foreground font-heading font-bold text-sm">M</span>
      </div>
      <span className="font-heading font-bold text-lg tracking-tight">
        Margin <span className="text-accent">Finance</span>
      </span>
    </div>
  );
}
