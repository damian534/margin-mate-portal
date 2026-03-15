import { useState, useEffect } from 'react';
import { notifyNewLead } from '@/lib/notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LOAN_PURPOSES = [
  'Home Purchase',
  'Refinance',
  'Investment Property',
  'Construction',
  'Commercial',
  'Personal',
  'Business',
  'Other',
];

export default function SubmitReferral() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [brokerId, setBrokerId] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    loan_amount: '',
    loan_purpose: '',
    notes: '',
  });

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('broker_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.broker_id) setBrokerId(data.broker_id as string); });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to submit a referral');
      return;
    }
    setLoading(true);

    const { error } = await supabase.from('leads').insert({
      referral_partner_id: user.id,
      broker_id: brokerId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      loan_amount: form.loan_amount ? parseFloat(form.loan_amount) : null,
      loan_purpose: form.loan_purpose || null,
      custom_fields: form.notes ? { initial_notes: form.notes } : {},
    });

    if (error) {
      toast.error('Failed to submit referral');
      setLoading(false);
      return;
    }

    toast.success('Referral submitted successfully!');

    // Notify broker of new lead
    notifyNewLead({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      loan_amount: form.loan_amount ? parseFloat(form.loan_amount) : null,
      loan_purpose: form.loan_purpose || null,
      source: 'referral_partner',
    }, brokerId);

    navigate('/dashboard');
    setLoading(false);
  };

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-2xl py-10">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl">Submit a Referral</CardTitle>
            <CardDescription>
              Send us a new client lead. We'll follow up and keep you updated on progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => update('first_name', e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => update('last_name', e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Client Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Client Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  placeholder="Any additional details about the client..."
                  rows={3}
                  maxLength={1000}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit Referral
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
