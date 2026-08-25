import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { quoteLmi } from '@/lib/fundsPosition/lmiProviders';
import { useLenderLmi, type LenderWithLmi } from '@/hooks/useLenderLmi';

const money = (n: number) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  baseLoan: number;
  lvr: number;
  investment: boolean;
  selectedLenderId?: string | null;
  onSelect: (lender: LenderWithLmi) => void;
}

const providerLabel = (l: LenderWithLmi) =>
  l.feeLabel ||
  (l.provider === 'self_insured'
    ? 'Self-insured'
    : l.provider === 'none'
      ? 'No LMI'
      : l.provider === 'generic'
        ? 'Lender quote'
        : l.provider.toUpperCase());

/** Side-by-side LMI premium across the broker's accredited lenders. */
export function LenderLmiCompare({ baseLoan, lvr, investment, selectedLenderId, onSelect }: Props) {
  const { lenders, loading } = useLenderLmi(true);

  const propertyValue = lvr > 0 ? baseLoan / (lvr / 100) : 0;

  const rows = useMemo(() => {
    return lenders
      .map(lender => {
        const quote = quoteLmi(lender, baseLoan, lvr, investment);
        const totalLvr = propertyValue > 0 ? ((baseLoan + (quote.eligible ? quote.premium : 0)) / propertyValue) * 100 : 0;
        return { lender, quote, totalLvr };
      })
      .sort((a, b) => {
        if (a.quote.eligible !== b.quote.eligible) return a.quote.eligible ? -1 : 1;
        return a.quote.premium - b.quote.premium;
      });
  }, [lenders, baseLoan, lvr, investment, propertyValue]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">LMI by lender</CardTitle>
        <p className="text-xs text-muted-foreground">
          Premium at {lvr.toFixed(2)}% LVR on a {`$${Math.round(baseLoan).toLocaleString('en-AU')}`} base loan, priced
          from each lender's LMI settings (Settings → Lenders). Indicative only. Click a row to apply that lender.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {loading && <p className="px-6 pb-4 text-sm text-muted-foreground">Loading lenders…</p>}
        {!loading && rows.length === 0 && (
          <p className="px-6 pb-4 text-sm text-muted-foreground">
            No accredited lenders yet — add them in Settings → Lenders to compare LMI.
          </p>
        )}
        {rows.length > 0 && (
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <tr className="text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Lender</th>
                  <th className="px-4 py-2 text-right font-medium">Premium ↑</th>
                  <th className="px-4 py-2 text-right font-medium">Total LVR (%)</th>
                  <th className="px-4 py-2 text-right font-medium">Premium (%)</th>
                  <th className="px-4 py-2 text-left font-medium">Provider</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ lender, quote, totalLvr }) => {
                  const zero = quote.eligible && quote.premium <= 0;
                  return (
                    <tr
                      key={lender.lenderId}
                      onClick={() => onSelect(lender)}
                      title={quote.note ?? lender.notes ?? undefined}
                      className={`cursor-pointer border-t transition-colors hover:bg-muted/50 ${
                        selectedLenderId === lender.lenderId ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{lender.lenderName}</span>
                          {quote.waived && <Badge variant="secondary" className="text-[10px]">Waived</Badge>}
                          {!quote.eligible && <Badge variant="outline" className="text-[10px]">Outside policy</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {!quote.eligible ? (
                          <span className="text-muted-foreground">—</span>
                        ) : zero ? (
                          <span className="rounded-md bg-success/10 px-2 py-0.5 font-medium text-success">$0</span>
                        ) : (
                          money(quote.premium)
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {quote.eligible ? `${totalLvr.toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {quote.eligible ? `${quote.ratePct.toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{providerLabel(lender)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
