import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileCheck2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    title: 'Pre-Offer',
    items: [
      { id: 'pre-approval', label: 'Pre-approval obtained and still valid' },
      { id: 'budget', label: 'Budget confirmed including stamp duty and legal fees' },
      { id: 'solicitor', label: 'Solicitor/conveyancer engaged' },
      { id: 'inspection', label: 'Building and pest inspection arranged or completed' },
      { id: 'strata', label: 'Strata report reviewed (if applicable)' },
    ],
  },
  {
    title: 'Making an Offer',
    items: [
      { id: 'contract-review', label: 'Contract of sale reviewed by solicitor' },
      { id: 'section-32', label: 'Section 32 / Vendor Statement reviewed' },
      { id: 'special-conditions', label: 'Finance and building inspection clauses included' },
      { id: 'cooling-off', label: 'Cooling-off period terms understood' },
      { id: 'deposit-ready', label: 'Deposit funds ready (typically 5-10%)' },
    ],
  },
  {
    title: 'Post-Offer / Finance',
    items: [
      { id: 'formal-application', label: 'Formal loan application submitted to lender' },
      { id: 'valuation', label: 'Property valuation ordered by lender' },
      { id: 'conditions-met', label: 'All loan conditions satisfied' },
      { id: 'unconditional', label: 'Formal (unconditional) approval received' },
      { id: 'insurance', label: 'Building insurance arranged from contract date' },
    ],
  },
  {
    title: 'Settlement',
    items: [
      { id: 'final-inspection', label: 'Final property inspection completed' },
      { id: 'settlement-funds', label: 'Settlement funds confirmed with lender' },
      { id: 'utilities', label: 'Utility transfers arranged' },
      { id: 'keys', label: 'Key collection arranged with agent' },
    ],
  },
];

export default function PrivateSaleChecklist() {
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
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Private Sale Finance Checklist</h1>
          <p className="text-muted-foreground text-sm">Step-by-step finance readiness for private sale transactions</p>
        </div>

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
                <FileCheck2 className="w-4 h-4 text-primary" /> {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.items.map(item => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={!!checked[item.id]} onCheckedChange={() => toggle(item.id)} className="mt-0.5" />
                  <span className={`text-sm ${checked[item.id] ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        ))}

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> This checklist is a general guide only. Requirements vary by state/territory. Always seek professional legal and financial advice.
        </p>
      </main>
    </div>
  );
}
