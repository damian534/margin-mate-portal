import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import type { Settlement } from '@/hooks/useSettlements';

interface Props {
  settlement: Settlement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Settlement>) => void;
  onDelete: (id: string) => void;
  lenders: string[];
  leadSources: string[];
}

function formatAmountDisplay(value: string): string {
  const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? '' : num.toLocaleString('en-AU');
}

const REFERRED_CLIENT_SOURCE = 'Ref from Existing Client';

export function EditSettlementDialog({ settlement, open, onOpenChange, onSave, onDelete, lenders, leadSources }: Props) {
  const [date, setDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanAmountDisplay, setLoanAmountDisplay] = useState('');
  const [lender, setLender] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [contactName, setContactName] = useState('');
  const [newSource, setNewSource] = useState('');
  const [showNewSource, setShowNewSource] = useState(false);
  const [status, setStatus] = useState('');
  const [securityAddress, setSecurityAddress] = useState('');

  useEffect(() => {
    if (open && settlement) {
      setDate(settlement.settlement_date);
      setClientName(settlement.client_name);
      const amt = String(settlement.loan_amount);
      setLoanAmount(amt);
      setLoanAmountDisplay(formatAmountDisplay(amt));
      setLender(settlement.lender || '');
      setLeadSource(settlement.lead_source || '');
      setContactName(settlement.contact_name || '');
      setStatus(settlement.status || 'pending');
      setSecurityAddress(settlement.security_address || '');
      setNewSource('');
      setShowNewSource(false);
    }
  }, [open, settlement]);

  const handleSave = () => {
    if (!settlement) return;
    const source = showNewSource && newSource.trim() ? newSource.trim() : leadSource;
    onSave(settlement.id, {
      client_name: clientName,
      settlement_date: date,
      loan_amount: Number(loanAmount.replace(/[^0-9]/g, '')),
      lender: lender || null,
      lead_source: source || null,
      contact_name: source === REFERRED_CLIENT_SOURCE ? (contactName || null) : settlement.contact_name,
      status,
      security_address: securityAddress || null,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!settlement) return;
    onDelete(settlement.id);
    onOpenChange(false);
  };

  const handleLoanAmountChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '');
    setLoanAmount(raw);
    setLoanAmountDisplay(raw ? formatAmountDisplay(raw) : '');
  };

  const handleSourceChange = (val: string) => {
    if (val === '__new__') {
      setShowNewSource(true);
      setLeadSource('');
    } else {
      setShowNewSource(false);
      setNewSource('');
      setLeadSource(val);
    }
  };

  if (!settlement) return null;

  const currentSource = showNewSource ? newSource : leadSource;
  const showClientPicker = currentSource === REFERRED_CLIENT_SOURCE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit Settlement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Client name */}
          <div className="space-y-1.5">
            <Label className="text-sm">Client Name</Label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>

          {/* Settlement Date */}
          <div className="space-y-1.5">
            <Label className="text-sm">Settlement Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Loan Amount */}
          <div className="space-y-1.5">
            <Label className="text-sm">Loan Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                className="pl-7"
                value={loanAmountDisplay}
                onChange={e => handleLoanAmountChange(e.target.value)}
                placeholder="500,000"
              />
            </div>
          </div>

          {/* Lender */}
          <div className="space-y-1.5">
            <Label className="text-sm">Lender</Label>
            <Select value={lender} onValueChange={setLender}>
              <SelectTrigger><SelectValue placeholder="Select lender" /></SelectTrigger>
              <SelectContent>
                {lenders.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Lead Source */}
          <div className="space-y-1.5">
            <Label className="text-sm">Source</Label>
            {showNewSource ? (
              <div className="flex gap-2">
                <Input
                  value={newSource}
                  onChange={e => setNewSource(e.target.value)}
                  placeholder="Enter new source"
                  className="flex-1"
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowNewSource(false); setNewSource(''); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Select value={leadSource || 'none'} onValueChange={v => handleSourceChange(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Source</SelectItem>
                  {leadSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <SelectItem value="__new__">+ Add New Source</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Referred from client */}
          {showClientPicker && (
            <div className="space-y-1.5">
              <Label className="text-sm">Referred From (Client Name)</Label>
              <Input
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="Enter referring client's name"
              />
            </div>
          )}

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-sm">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="docs_issue">Docs Issue</SelectItem>
                <SelectItem value="docs_returned">Docs Returned</SelectItem>
                <SelectItem value="docs_issued">Docs Issued</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Security Address */}
          <div className="space-y-1.5">
            <Label className="text-sm">Security Address</Label>
            <Input
              value={securityAddress}
              onChange={e => setSecurityAddress(e.target.value)}
              placeholder="Enter security address"
            />
          </div>

          <Button onClick={handleSave} className="w-full">Save Changes</Button>

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete Settlement
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Settlement</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the settlement for <strong>{settlement.client_name}</strong>? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
