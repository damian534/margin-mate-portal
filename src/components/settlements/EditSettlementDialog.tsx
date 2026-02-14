import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Settlement } from '@/hooks/useSettlements';

interface Props {
  settlement: Settlement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Settlement>) => void;
  lenders: string[];
}

function formatAmountWithCommas(value: number): string {
  return value.toLocaleString('en-AU');
}

export function EditSettlementDialog({ settlement, open, onOpenChange, onSave, lenders }: Props) {
  const [date, setDate] = useState('');

  useEffect(() => {
    if (open && settlement) {
      setDate(settlement.settlement_date);
    }
  }, [open, settlement]);

  const handleSave = () => {
    if (!settlement) return;
    onSave(settlement.id, { settlement_date: date });
    onOpenChange(false);
  };

  if (!settlement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Settlement Date</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Client</Label>
            <p className="text-sm font-medium">{settlement.client_name}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Loan Amount</Label>
            <p className="text-sm font-medium font-mono">${formatAmountWithCommas(Number(settlement.loan_amount))}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Lender</Label>
            <p className="text-sm font-medium">{settlement.lender || '—'}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Settlement Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
