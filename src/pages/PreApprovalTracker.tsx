import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CalendarClock, Plus, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format, addDays } from 'date-fns';

interface PreApproval {
  id: string;
  clientName: string;
  lender: string;
  approvalDate: string;
  expiryDate: string;
  amount: string;
  notes: string;
}

function getStatus(expiryDate: string) {
  const daysLeft = differenceInDays(new Date(expiryDate), new Date());
  if (daysLeft < 0) return { label: 'Expired', color: 'destructive' as const, icon: AlertTriangle, daysLeft };
  if (daysLeft <= 14) return { label: 'Expiring Soon', color: 'default' as const, icon: Clock, daysLeft };
  if (daysLeft <= 30) return { label: 'Attention', color: 'secondary' as const, icon: Clock, daysLeft };
  return { label: 'Active', color: 'outline' as const, icon: CheckCircle2, daysLeft };
}

const fmt = (v: number) => `$${Math.round(v).toLocaleString()}`;

export default function PreApprovalTracker() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState<PreApproval[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [clientName, setClientName] = useState('');
  const [lender, setLender] = useState('');
  const [approvalDate, setApprovalDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!clientName || !expiryDate) return;
    const newApproval: PreApproval = {
      id: crypto.randomUUID(),
      clientName,
      lender,
      approvalDate: approvalDate || new Date().toISOString().split('T')[0],
      expiryDate,
      amount,
      notes,
    };
    setApprovals(prev => [...prev, newApproval].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()));
    setClientName('');
    setLender('');
    setApprovalDate('');
    setExpiryDate('');
    setAmount('');
    setNotes('');
    setShowForm(false);
  };

  const handleRemove = (id: string) => {
    setApprovals(prev => prev.filter(a => a.id !== id));
  };

  const handleApprovalDateChange = (date: string) => {
    setApprovalDate(date);
    if (date && !expiryDate) {
      setExpiryDate(format(addDays(new Date(date), 90), 'yyyy-MM-dd'));
    }
  };

  const sortedApprovals = [...approvals].sort((a, b) => {
    const statusA = getStatus(a.expiryDate);
    const statusB = getStatus(b.expiryDate);
    return statusA.daysLeft - statusB.daysLeft;
  });

  const expiredCount = approvals.filter(a => getStatus(a.expiryDate).daysLeft < 0).length;
  const urgentCount = approvals.filter(a => { const d = getStatus(a.expiryDate).daysLeft; return d >= 0 && d <= 14; }).length;
  const activeCount = approvals.filter(a => getStatus(a.expiryDate).daysLeft > 14).length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Pre-Approval Expiry Tracker</h1>
            <p className="text-muted-foreground text-sm">Track pre-approval dates and stay ahead of expiries</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {/* Summary cards */}
        {approvals.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-success">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card className={urgentCount > 0 ? 'border-warning/40' : ''}>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-warning">{urgentCount}</p>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </CardContent>
            </Card>
            <Card className={expiredCount > 0 ? 'border-destructive/40' : ''}>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-2xl font-bold text-destructive">{expiredCount}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Pre-Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Client Name *</Label>
                  <Input placeholder="e.g. John Smith" value={clientName} onChange={e => setClientName(e.target.value)} />
                </div>
                <div>
                  <Label>Lender</Label>
                  <Input placeholder="e.g. CBA, ANZ" value={lender} onChange={e => setLender(e.target.value)} />
                </div>
                <div>
                  <Label>Approval Date</Label>
                  <Input type="date" value={approvalDate} onChange={e => handleApprovalDateChange(e.target.value)} />
                </div>
                <div>
                  <Label>Expiry Date *</Label>
                  <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                </div>
                <div>
                  <Label>Approved Amount ($)</Label>
                  <Input type="number" placeholder="e.g. 750000" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input placeholder="Any notes..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={!clientName || !expiryDate}>Add Pre-Approval</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approvals list */}
        {sortedApprovals.length > 0 ? (
          <div className="space-y-3">
            {sortedApprovals.map(approval => {
              const status = getStatus(approval.expiryDate);
              const StatusIcon = status.icon;
              return (
                <Card key={approval.id} className={status.daysLeft < 0 ? 'border-destructive/30 bg-destructive/5' : status.daysLeft <= 14 ? 'border-warning/30 bg-warning/5' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <StatusIcon className={`w-5 h-5 mt-0.5 shrink-0 ${status.daysLeft < 0 ? 'text-destructive' : status.daysLeft <= 14 ? 'text-warning' : 'text-success'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{approval.clientName}</p>
                            <Badge variant={status.color}>{status.label}</Badge>
                            {approval.lender && <span className="text-xs text-muted-foreground">{approval.lender}</span>}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            <span>Expires: {format(new Date(approval.expiryDate), 'dd MMM yyyy')}</span>
                            {status.daysLeft >= 0 ? (
                              <span className="font-medium">{status.daysLeft} days left</span>
                            ) : (
                              <span className="font-medium text-destructive">Expired {Math.abs(status.daysLeft)} days ago</span>
                            )}
                            {approval.amount && <span>{fmt(parseFloat(approval.amount))}</span>}
                          </div>
                          {approval.notes && <p className="text-xs text-muted-foreground mt-1">{approval.notes}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleRemove(approval.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : !showForm ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarClock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-3">No pre-approvals tracked yet</p>
              <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add First Pre-Approval
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Note:</strong> Pre-approval validity periods vary by lender (typically 60–90 days). Always confirm expiry dates directly with the lender. This tracker is for reference only.
        </p>
      </main>
    </div>
  );
}
