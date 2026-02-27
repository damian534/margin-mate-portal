import { AlertTriangle } from "lucide-react";

export function Disclaimer() {
  return (
    <div className="mt-12 p-6 rounded-lg bg-secondary/50 border border-border/50">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">Disclaimer</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This calculator provides general information only and does not constitute financial, tax, 
            or legal advice. Results are estimates only and should not be relied upon for decision-making. 
            Actual outcomes may vary significantly based on individual circumstances, market conditions, 
            tax law changes, and other factors. Always seek independent professional advice from a 
            qualified financial adviser, accountant, or tax professional before making any investment decisions.
          </p>
        </div>
      </div>
    </div>
  );
}