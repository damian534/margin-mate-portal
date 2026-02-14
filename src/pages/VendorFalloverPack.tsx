import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Download, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const protectionStrategies = [
  { title: 'Require Pre-Approval Evidence', desc: 'Ask buyers to provide a valid pre-approval letter from a recognised lender before accepting offers.' },
  { title: 'Shorter Finance Clauses', desc: 'Negotiate tighter finance clause periods (14 days vs 21+) to surface issues early.' },
  { title: 'Deposit Verification', desc: 'Confirm deposit funds are genuinely available and not subject to conditions.' },
  { title: 'Backup Buyer Strategy', desc: 'Keep second-best offers warm in case the primary buyer falls through.' },
  { title: 'Settlement Timeline Alignment', desc: "Ensure the settlement date works with the buyer's finance timeline to reduce risk." },
  { title: 'Communication Protocol', desc: 'Establish regular check-ins between agent, broker and solicitor throughout the process.' },
];

export default function VendorFalloverPack() {
  const navigate = useNavigate();
  const [vendorName, setVendorName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [agentNotes, setAgentNotes] = useState('');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tools')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tools
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Vendor Finance Fallover Protection</h1>
          <p className="text-muted-foreground text-sm">Strategies and documentation to protect vendors against buyer finance fall-through</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Property details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Vendor Name</Label>
                <Input placeholder="e.g. Jane & Robert Smith" value={vendorName} onChange={e => setVendorName(e.target.value)} />
              </div>
              <div>
                <Label>Property Address</Label>
                <Input placeholder="e.g. 42 Example St, Melbourne VIC 3000" value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} />
              </div>
              <div>
                <Label>Expected Sale Price ($)</Label>
                <Input type="number" placeholder="e.g. 950000" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
              </div>
              <div>
                <Label>Agent Notes</Label>
                <Textarea placeholder="Any specific concerns or context..." value={agentNotes} onChange={e => setAgentNotes(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Risk overview */}
          <div className="space-y-5">
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-warning shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Why Finance Falls Through</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Buyer's pre-approval expires before settlement</li>
                      <li>• Property valuation comes in below purchase price</li>
                      <li>• Buyer's financial situation changes (job loss, new debts)</li>
                      <li>• Incomplete documentation delays formal approval</li>
                      <li>• Lender policy changes or tighter lending criteria</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 text-center">
                <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Implementing these strategies can significantly reduce the risk of finance fallover for your vendors.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Protection strategies */}
        <div>
          <h2 className="text-lg font-heading font-semibold mb-4">Protection Strategies</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {protectionStrategies.map(strategy => (
              <Card key={strategy.title}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm mb-1">{strategy.title}</p>
                      <p className="text-xs text-muted-foreground">{strategy.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="pt-5 pb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Generate Protection Pack PDF</p>
              <p className="text-xs text-muted-foreground">Coming soon — download a branded PDF summary for your vendor</p>
            </div>
            <Button size="sm" disabled>
              <Download className="w-4 h-4 mr-1" /> Download PDF
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> This tool provides general guidance only. It does not constitute legal or financial advice. Always consult with qualified professionals for specific situations.
        </p>
      </main>
    </div>
  );
}
