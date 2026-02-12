import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SAMPLE_LEADS, SAMPLE_NOTES } from '@/lib/sample-data';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  loan_amount: number | null;
  loan_purpose: string | null;
  status: string;
  created_at: string;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

export default function PartnerDashboard() {
  const { user, isPreviewMode } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode) {
      setLeads(SAMPLE_LEADS as Lead[]);
      setLoading(false);
      return;
    }
    if (!user) return;
    fetchLeads();
  }, [user, isPreviewMode]);

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  const fetchNotes = async (leadId: string) => {
    if (isPreviewMode) {
      setNotes((SAMPLE_NOTES[leadId] || []) as Note[]);
      return;
    }
    const { data } = await supabase
      .from('notes')
      .select('id, content, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    setNotes((data as Note[]) || []);
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    fetchNotes(lead.id);
  };

  const stats = {
    total: leads.length,
    active: leads.filter(l => !['settled', 'lost'].includes(l.status)).length,
    settled: leads.filter(l => l.status === 'settled').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">My Referrals</h1>
            <p className="text-muted-foreground">Track all your submitted leads</p>
          </div>
          <Button onClick={() => navigate('/submit-referral')}>
            <Plus className="w-4 h-4 mr-2" /> New Referral
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.settled}</p>
                <p className="text-sm text-muted-foreground">Settled</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Leads</CardTitle>
            <CardDescription>Click on a lead to see broker updates</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : leads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No referrals yet</p>
                <Button onClick={() => navigate('/submit-referral')}>
                  <Plus className="w-4 h-4 mr-2" /> Submit Your First Referral
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map(lead => (
                    <TableRow key={lead.id} className="cursor-pointer" onClick={() => openLead(lead)}>
                      <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                      <TableCell>{lead.loan_purpose || '—'}</TableCell>
                      <TableCell>{lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '—'}</TableCell>
                      <TableCell><StatusBadge status={lead.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(lead.created_at), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openLead(lead); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>{selectedLead?.first_name} {selectedLead?.last_name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex gap-2 flex-wrap">
                                {selectedLead && <StatusBadge status={selectedLead.status} />}
                                {selectedLead?.loan_purpose && (
                                  <span className="text-sm text-muted-foreground">{selectedLead.loan_purpose}</span>
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Broker Notes</h4>
                                <ScrollArea className="h-48">
                                  {notes.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No updates yet</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {notes.map(note => (
                                        <div key={note.id} className="bg-muted rounded-lg p-3">
                                          <p className="text-sm">{note.content}</p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {format(new Date(note.created_at), 'dd MMM yyyy, HH:mm')}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </ScrollArea>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
