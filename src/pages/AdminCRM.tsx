import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SAMPLE_LEADS, SAMPLE_NOTES } from '@/lib/sample-data';
import { AppHeader } from '@/components/AppHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { TasksPanel } from '@/components/TasksPanel';
import { LEAD_STATUSES } from '@/lib/supabase-helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, TrendingUp, Clock, CheckCircle, AlertCircle, Send, Filter, ListTodo } from 'lucide-react';

interface Lead {
  id: string;
  referral_partner_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  loan_amount: number | null;
  loan_purpose: string | null;
  status: string;
  custom_fields: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface Note {
  id: string;
  content: string;
  notify_partner: boolean;
  created_at: string;
  author_id: string | null;
}

export default function AdminCRM() {
  const { user, isPreviewMode } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newNote, setNewNote] = useState('');
  const [notifyPartner, setNotifyPartner] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode) {
      setLeads(SAMPLE_LEADS as Lead[]);
      setLoading(false);
      return;
    }
    fetchLeads();
  }, [isPreviewMode]);

  useEffect(() => {
    let result = leads;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        `${l.first_name} ${l.last_name}`.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(l => l.status === statusFilter);
    }
    setFilteredLeads(result);
  }, [leads, search, statusFilter]);

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
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    setNotes((data as Note[]) || []);
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSheetOpen(true);
    fetchNotes(lead.id);
  };

  const updateStatus = async (leadId: string, status: string) => {
    if (isPreviewMode) {
      toast.success('Status updated (preview)');
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
      if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status } : null);
      return;
    }
    const { error } = await supabase
      .from('leads')
      .update({ status: status as any })
      .eq('id', leadId);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success('Status updated');
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status } : null);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedLead || !user) return;
    if (isPreviewMode) {
      const fakeNote: Note = {
        id: `preview-${Date.now()}`,
        content: newNote.trim(),
        notify_partner: notifyPartner,
        created_at: new Date().toISOString(),
        author_id: user.id,
      };
      setNotes(prev => [fakeNote, ...prev]);
      toast.success(notifyPartner ? 'Note added & partner will be notified (preview)' : 'Note added (preview)');
      setNewNote('');
      setNotifyPartner(false);
      return;
    }
    const { error } = await supabase.from('notes').insert({
      lead_id: selectedLead.id,
      author_id: user.id,
      content: newNote.trim(),
      notify_partner: notifyPartner,
    });
    if (error) {
      toast.error('Failed to add note');
      return;
    }
    toast.success(notifyPartner ? 'Note added & partner will be notified' : 'Note added');
    setNewNote('');
    setNotifyPartner(false);
    fetchNotes(selectedLead.id);
  };

  const stats = {
    total: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    active: leads.filter(l => !['settled', 'lost', 'new'].includes(l.status)).length,
    settled: leads.filter(l => l.status === 'settled').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold">Lead Management</h1>
          <p className="text-muted-foreground">Manage all referral leads in one place</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: stats.total, icon: TrendingUp, accent: 'primary' },
            { label: 'New', value: stats.newLeads, icon: AlertCircle, accent: 'accent' },
            { label: 'In Progress', value: stats.active, icon: Clock, accent: 'warning' },
            { label: 'Settled', value: stats.settled, icon: CheckCircle, accent: 'success' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg bg-${s.accent}/10 flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 text-${s.accent}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs: Leads & Tasks */}
        <Tabs defaultValue="leads">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-1.5">
              <ListTodo className="w-4 h-4" /> Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {LEAD_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Leads Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <p className="text-muted-foreground text-center py-12">Loading leads...</p>
                ) : filteredLeads.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">No leads found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map(lead => (
                        <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openLead(lead)}>
                          <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {lead.email && <p>{lead.email}</p>}
                              {lead.phone && <p className="text-muted-foreground">{lead.phone}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{lead.loan_purpose || '—'}</TableCell>
                          <TableCell>{lead.loan_amount ? `$${lead.loan_amount.toLocaleString()}` : '—'}</TableCell>
                          <TableCell><StatusBadge status={lead.status} /></TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(lead.created_at), 'dd MMM')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <TasksPanel leads={leads.map(l => ({ id: l.id, first_name: l.first_name, last_name: l.last_name }))} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Lead Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">
                  {selectedLead.first_name} {selectedLead.last_name}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Lead Info */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedLead.email && (
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedLead.email}</p>
                      </div>
                    )}
                    {selectedLead.phone && (
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedLead.phone}</p>
                      </div>
                    )}
                    {selectedLead.loan_purpose && (
                      <div>
                        <p className="text-muted-foreground">Purpose</p>
                        <p className="font-medium">{selectedLead.loan_purpose}</p>
                      </div>
                    )}
                    {selectedLead.loan_amount && (
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium">${selectedLead.loan_amount.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Status Update */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedLead.status} onValueChange={(v) => updateStatus(selectedLead.id, v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Add Note */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Add Note</h3>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="e.g. Called the client, will call back after 5pm..."
                    rows={3}
                    maxLength={2000}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notify"
                      checked={notifyPartner}
                      onCheckedChange={(v) => setNotifyPartner(v === true)}
                    />
                    <Label htmlFor="notify" className="text-sm cursor-pointer">
                      Notify referral partner via email
                    </Label>
                  </div>
                  <Button onClick={addNote} disabled={!newNote.trim()} size="sm">
                    <Send className="w-4 h-4 mr-2" /> Add Note
                  </Button>
                </div>

                <Separator />

                {/* Notes List */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Activity</h3>
                  <ScrollArea className="h-64">
                    {notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                    ) : (
                      <div className="space-y-3">
                        {notes.map(note => (
                          <div key={note.id} className="bg-muted rounded-lg p-3">
                            <p className="text-sm">{note.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(note.created_at), 'dd MMM yyyy, HH:mm')}
                              </p>
                              {note.notify_partner && (
                                <span className="text-xs bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded">
                                  Partner notified
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
