import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    title: 'Before Auction Day',
    items: [
      { id: 'pre-approval', label: 'Pre-approval obtained and confirmed with lender' },
      { id: 'deposit', label: 'Deposit funds ready (typically 10% of purchase price)' },
      { id: 'solicitor', label: 'Solicitor/conveyancer engaged and contract reviewed' },
      { id: 'building-inspection', label: 'Building and pest inspection completed' },
      { id: 'strata-report', label: 'Strata report obtained (if applicable)' },
      { id: 'section-32', label: 'Section 32 / Vendor Statement reviewed' },
      { id: 'bidding-limit', label: 'Maximum bidding limit confirmed with broker' },
    ],
  },
  {
    title: 'Finance Readiness',
    items: [
      { id: 'loan-structure', label: 'Loan structure and product confirmed' },
      { id: 'rate-lock', label: 'Rate lock discussed with broker (if available)' },
      { id: 'lmi', label: 'LMI requirements understood (if LVR > 80%)' },
      { id: 'conditions', label: 'All pre-approval conditions understood' },
      { id: 'cooling-off', label: 'Aware there is NO cooling-off period at auction' },
    ],
  },
  {
    title: 'On Auction Day',
    items: [
      { id: 'id-docs', label: 'Photo ID and supporting documents on hand' },
      { id: 'cheque-book', label: 'Cheque book or bank transfer access ready for deposit' },
      { id: 'bidder-registration', label: 'Registered as a bidder' },
      { id: 'support-person', label: 'Support person / solicitor present (recommended)' },
      { id: 'contact-broker', label: 'Broker contact details saved for same-day queries' },
    ],
  },
];

export default function AuctionChecklist() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const progress = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const toggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Auction Finance Checklist</h1>
          <p className="text-muted-foreground text-sm">Ensure your buyer is fully prepared before auction day</p>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {progress === 100 ? <CheckCircle2 className="w-5 h-5 text-success" /> : <AlertTriangle className="w-5 h-5 text-warning" />}
                <span className="font-semibold">{checkedCount} of {totalItems} items complete</span>
              </div>
              <Badge variant={progress === 100 ? 'default' : 'secondary'}>{progress}%</Badge>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>

        {sections.map(section => (
          <Card key={section.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" /> {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.items.map(item => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                  <Checkbox checked={!!checked[item.id]} onCheckedChange={() => toggle(item.id)} className="mt-0.5" />
                  <span className={`text-sm ${checked[item.id] ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        ))}

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> This checklist is a general guide only. Requirements may vary by state/territory and individual circumstances. Always seek professional legal and financial advice.
        </p>
      </main>
    </div>
  );
}
