import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  onAdd: (data: any) => Promise<void>;
}

const APP_TYPES = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'refinance', label: 'Refinance' },
  { value: 'top_up', label: 'Top Up' },
  { value: 'purchase_refinance', label: 'Purchase & Refinance' },
];

export function AddSettlementDialog({ onAdd }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    client_name: '',
    settlement_date: '',
    loan_amount: '',
    loan_amount_display: '',
    lender: '',
    application_type: 'purchase',
    lead_source: '',
    security_address: '',
    status: 'booked',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name || !form.settlement_date || !form.loan_amount) return;
    setSubmitting(true);
    await onAdd({
      broker_id: user?.id || '',
      lending_assistant_id: null,
      client_name: form.client_name.trim(),
      settlement_date: form.settlement_date,
      loan_amount: parseFloat(form.loan_amount),
      lender: form.lender || null,
      application_type: form.application_type || null,
      lead_source: form.lead_source || null,
      security_address: form.security_address || null,
      status: form.status,
      discharge_completed: false,
      pre_settlement_check_completed: false,
      contact_name: null,
      notes: null,
    });
    setSubmitting(false);
    setOpen(false);
    setForm({ client_name: '', settlement_date: '', loan_amount: '', loan_amount_display: '', lender: '', application_type: 'purchase', lead_source: '', security_address: '', status: 'booked' });
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Settlement</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Settlement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Client Name *</Label>
              <Input value={form.client_name} onChange={e => update('client_name', e.target.value)} required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Settlement Date *</Label>
              <Input type="date" value={form.settlement_date} onChange={e => update('settlement_date', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Loan Amount *</Label>
              <Input
                value={form.loan_amount_display}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const num = raw ? parseInt(raw, 10) : 0;
                  update('loan_amount', raw);
                  setForm(prev => ({ ...prev, loan_amount: raw, loan_amount_display: raw ? num.toLocaleString('en-AU') : '' }));
                }}
                placeholder="e.g. 500,000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Lender</Label>
              <Input value={form.lender} onChange={e => update('lender', e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Application Type</Label>
              <Select value={form.application_type} onValueChange={v => update('application_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Status</Label>
              <Select value={form.status} onValueChange={v => update('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div className="space-y-1.5">
              <Label className="text-sm">Lead Source</Label>
              <Input value={form.lead_source} onChange={e => update('lead_source', e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Security Address</Label>
              <Input value={form.security_address} onChange={e => update('security_address', e.target.value)} maxLength={200} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add Settlement'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
