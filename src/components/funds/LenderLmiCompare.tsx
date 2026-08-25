import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { quoteLmi } from '@/lib/fundsPosition/lmiProviders';
import { useLenderLmi, type LenderWithLmi } from '@/hooks/useLenderLmi';

const money = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`;

interface Props {
  baseLoan: number;
  lvr: number;
  investment: boolean;
  selectedLenderId?: string | null;
  onSelect: (lender: LenderWithLmi) => void;
}

/** Side-by-side LMI premium across the broker's accredited lenders. */
export function LenderLmiCompare({ baseLoan, lvr, investment, selectedLenderId, onSelect }: Props) {
  const { lenders, loading } = useLenderLmi(true);

  const rows = useMemo(() => {
    return lenders
      .map(l => ({ lender: l, quote: quoteLmi(l, baseLoan, lvr, investment) }))
      .sort((a, b) => {
        if (a.quote.eligible !== b.quote.eligible) return a.quote.eligible ? -1 : 1;
        return a.quote.premium - b.quote.premium;
      });
  }, [lenders, baseLoan, lvr, investment]);

  const cheapest = rows.find(r => r.quote.eligible && !r.quote.waived && r.quote.premium > 0)?.quote.premium;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">LMI by lender</CardTitle>
        <p className="text-xs text-muted-foreground">
          Premium at {lvr.toFixed(2)}% LVR on a {money(baseLoan)} base loan, priced from each lender's LMI
          settings (Settings → Lenders). Indicative only.
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading && <p className="text-sm text-muted-foreground">Loading lenders…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No accredited lenders yet — add them in Settings → Lenders to compare LMI.
          </p>
        )}
        {rows.map(({ lender, quote }) => (
          <div
            key={lender.lenderId}
            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
              selectedLenderId === lender.lenderId ? 'border-primary bg-primary/5' : 'bg-card'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{lender.lenderName}</span>
                {quote.waived && <Badge variant="secondary" className="text-[10px]">Waived</Badge>}
                {!quote.eligible && <Badge variant="outline" className="text-[10px]">Outside policy</Badge>}
                {cheapest != null && quote.eligible && !quote.waived && quote.premium === cheapest && (
                  <Badge className="text-[10px]">Cheapest</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {quote.note ?? `${lender.provider === 'self_insured' ? 'Self-insured' : lender.provider.toUpperCase()} · max ${lender.maxLvr}% LVR`}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-sm font-semibold">{quote.eligible ? money(quote.premium) : '—'}</p>
                {quote.ratePct > 0 && (
                  <p className="text-[11px] text-muted-foreground">{quote.ratePct.toFixed(3)}%</p>
                )}
              </div>
              <Button size="sm" variant={selectedLenderId === lender.lenderId ? 'default' : 'outline'}
                onClick={() => onSelect(lender)}>
                Use
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
