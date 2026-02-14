import { useState } from 'react';
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
}

const STATUSES = [
  { value: 'settled', label: 'Settled' },
  { value: 'booked', label: 'Booked' },
  { value: 'docs_issue', label: 'Docs Issue' },
  { value: 'docs_returned', label: 'Docs Returned' },
  { value: 'docs_issued', label: 'Docs Issued' },
  { value: 'pending_approval', label: 'Pending Approval' },
];

export function EditSettlementDialog({ settlement, open, onOpenChange, onSave }: Props) {
  const [date, setDate] = useState(settlement?.settlement_date || '');
  const [status, setStatus] = useState(settlement?.status || '');
  const [loanAmount, setLoanAmount] = useState(settlement?.loan_amount?.toString() || '');
  const [lender, setLender] = useState(settlement?.lender || '');
  const [clientName, setClientName] = useState(settlement?.client_name || '');

  // Sync state when settlement changes
  if (settlement && date !== settlement.settlement_date && !open) {
    setDate(settlement.settlement_date);
    setStatus(settlement.status);
    setLoanAmount(settlement.loan_amount?.toString() || '');
    setLender(settlement.lender || '');
    setClientName(settlement.client_name || '');
  }

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && settlement) {
      setDate(settlement.settlement_date);
      setStatus(settlement.status);
      setLoanAmount(settlement.loan_amount?.toString() || '');
      setLender(settlement.lender || '');
      setClientName(settlement.client_name || '');
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    if (!settlement) return;
    onSave(settlement.id, {
      settlement_date: date,
      status,
      loan_amount: Number(loanAmount),
      lender: lender || null,
      client_name: clientName,
    });
    onOpenChange(false);
  };

  if (!settlement) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Settlement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Client Name</Label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Settlement Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Loan Amount</Label>
            <Input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Lender</Label>
            <Input value={lender} onChange={e => setLender(e.target.value)} />
          </div>
          <Button onClick={handleSave} className="w-full">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
