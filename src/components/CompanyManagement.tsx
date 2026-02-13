import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Pencil, Building2, Trash2, Users, Mail, Phone, User, UserPlus, Link2 } from 'lucide-react';

export interface Company {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: 'referrer' | 'contact';
}

interface CompanyManagementProps {
  companies: Company[];
  onRefresh: () => void;
  onRefreshContacts?: () => void;
  isPreviewMode?: boolean;
  onOpenContact?: (contactId: string) => void;
  referrers?: Array<{
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    company_id: string | null;
    company_name: string | null;
  }>;
  contacts?: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    type: string;
  }>;
}

export function CompanyManagement({ companies, onRefresh, onRefreshContacts, isPreviewMode, onOpenContact, referrers = [], contacts = [] }: CompanyManagementProps) {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', website: '', notes: '' });
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [agentForm, setAgentForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [savingAgent, setSavingAgent] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', address: '', phone: '', email: '', website: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (c: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(c);
    setForm({ name: c.name, address: c.address || '', phone: c.phone || '', email: c.email || '', website: c.website || '', notes: c.notes || '' });
    setDialogOpen(true);
  };

  const openCompany = (c: Company) => {
    setSelectedCompany(c);
    setSheetOpen(true);
  };

  const getCompanyAgents = (company: Company): Agent[] => {
    const agents: Agent[] = [];
    const seen = new Set<string>();

    // Referral partners linked by company_id OR matching company_name
    referrers.forEach(r => {
      const matchById = r.company_id === company.id;
      const matchByName = r.company_name && r.company_name.toLowerCase() === company.name.toLowerCase();
      if (matchById || matchByName) {
        const key = r.email?.toLowerCase() || r.id;
        if (!seen.has(key)) {
          seen.add(key);
          agents.push({
            id: r.id,
            name: r.full_name || 'Unnamed',
            email: r.email,
            phone: r.phone,
            type: 'referrer',
          });
        }
      }
    });

    // Contacts with matching company name
    contacts.forEach(c => {
      if (c.company && c.company.toLowerCase() === company.name.toLowerCase()) {
        const key = c.email?.toLowerCase() || c.id;
        if (!seen.has(key)) {
          seen.add(key);
          agents.push({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`,
            email: c.email,
            phone: c.phone,
            type: 'contact',
          });
        }
      }
    });

    return agents;
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Company name is required'); return; }
    if (isPreviewMode) {
      toast.success(editing ? 'Company updated (preview)' : 'Company created (preview)');
      setDialogOpen(false);
      return;
    }
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from('companies').update(payload).eq('id', editing.id);
      if (error) { toast.error('Failed to update company'); return; }
      toast.success('Company updated');
    } else {
      const { error } = await supabase.from('companies').insert(payload);
      if (error) { toast.error('Failed to create company'); return; }
      toast.success('Company created');
    }
    setDialogOpen(false);
    onRefresh();
  };

  const deleteCompany = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPreviewMode) { toast.success('Company deleted (preview)'); return; }
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) { toast.error('Failed to delete company. It may still have referrers assigned.'); return; }
    toast.success('Company deleted');
    onRefresh();
  };

  const saveAgent = async () => {
    if (!agentForm.firstName.trim() || !agentForm.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!selectedCompany) return;

    if (isPreviewMode) {
      toast.success('Agent added (preview)');
      setAddAgentOpen(false);
      setAgentForm({ firstName: '', lastName: '', email: '', phone: '' });
      return;
    }

    setSavingAgent(true);
    try {
      const { error } = await supabase.from('contacts').insert({
        first_name: agentForm.firstName.trim(),
        last_name: agentForm.lastName.trim(),
        email: agentForm.email.trim() || null,
        phone: agentForm.phone.trim() || null,
        company: selectedCompany.name,
        type: 'prospect',
        created_by: user?.id || null,
      });
      if (error) { toast.error('Failed to add agent'); return; }
      toast.success('Agent added to ' + selectedCompany.name);
      setAddAgentOpen(false);
      setAgentForm({ firstName: '', lastName: '', email: '', phone: '' });
      onRefreshContacts?.();
    } finally {
      setSavingAgent(false);
    }
  };

  const inviteAgent = async (agent: Agent) => {
    if (!user) { toast.error('You must be logged in'); return; }
    if (isPreviewMode) {
      toast.success('Invite link copied (preview)');
      return;
    }

    // Generate code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MF-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const { error } = await supabase.from('invite_codes').insert({
      broker_id: user.id,
      code,
      label: `${agent.name} – ${selectedCompany?.name || 'Agent'}`,
      max_uses: 1,
    });
    if (error) { toast.error('Failed to create invite'); return; }

    const url = `${window.location.origin}/register?code=${code}`;
    await navigator.clipboard.writeText(url);
    toast.success(`Invite link copied! Share it with ${agent.name}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">Companies</h2>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Company</Button>
      </div>

      {companies.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No companies yet. Add one to start grouping referrers.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map(c => {
                  const agentCount = getCompanyAgents(c).length;
                  return (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openCompany(c)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{c.name}</p>
                            {c.address && <p className="text-xs text-muted-foreground">{c.address}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.email && <p>{c.email}</p>}
                        {c.phone && <p className="text-muted-foreground">{c.phone}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{agentCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.website || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => openEdit(c, e)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => deleteCompany(c.id, e)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Company Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCompany && (() => {
            const agents = getCompanyAgents(selectedCompany);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    {selectedCompany.name}
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  {/* Company details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedCompany.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{selectedCompany.email}</span>
                      </div>
                    )}
                    {selectedCompany.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{selectedCompany.phone}</span>
                      </div>
                    )}
                    {selectedCompany.website && (
                      <div className="flex items-center gap-2 col-span-2">
                        <span className="text-muted-foreground">{selectedCompany.website}</span>
                      </div>
                    )}
                    {selectedCompany.address && (
                      <div className="flex items-center gap-2 col-span-2">
                        <span className="text-muted-foreground">{selectedCompany.address}</span>
                      </div>
                    )}
                  </div>

                  {selectedCompany.notes && (
                    <p className="text-sm text-muted-foreground">{selectedCompany.notes}</p>
                  )}

                  <Separator />

                  {/* Agents list */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4" /> Agents ({agents.length})
                      </h3>
                      <Button size="sm" variant="outline" onClick={() => { setAgentForm({ firstName: '', lastName: '', email: '', phone: '' }); setAddAgentOpen(true); }}>
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Agent
                      </Button>
                    </div>

                    {agents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No agents linked to this company yet. Click "Add Agent" to add one.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {agents.map(agent => (
                          <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => {
                            if (agent.type === 'contact') {
                              onOpenContact?.(agent.id);
                            }
                          }}>
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                              {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{agent.name}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {agent.email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail className="w-3 h-3 shrink-0" /> {agent.email}
                                  </span>
                                )}
                                {agent.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 shrink-0" /> {agent.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {agent.type !== 'referrer' && (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); inviteAgent(agent); }}>
                                  <Link2 className="w-3 h-3 mr-1" /> Invite
                                </Button>
                              )}
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {agent.type === 'referrer' ? 'Partner' : 'Contact'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Add Agent Dialog */}
      <Dialog open={addAgentOpen} onOpenChange={setAddAgentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Agent to {selectedCompany?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={agentForm.firstName} onChange={e => setAgentForm(f => ({ ...f, firstName: e.target.value }))} maxLength={100} /></div>
              <div><Label>Last Name *</Label><Input value={agentForm.lastName} onChange={e => setAgentForm(f => ({ ...f, lastName: e.target.value }))} maxLength={100} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={agentForm.email} onChange={e => setAgentForm(f => ({ ...f, email: e.target.value }))} maxLength={255} /></div>
            <div><Label>Phone</Label><Input value={agentForm.phone} onChange={e => setAgentForm(f => ({ ...f, phone: e.target.value }))} maxLength={20} /></div>
            <Button onClick={saveAgent} className="w-full" disabled={savingAgent}>
              {savingAgent ? 'Adding…' : 'Add Agent'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Company' : 'Add Company'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ray White Glenroy" maxLength={200} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, Glenroy VIC" maxLength={500} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} maxLength={20} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} maxLength={255} /></div>
            </div>
            <div><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." maxLength={500} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} maxLength={2000} /></div>
            <Button onClick={save} className="w-full">{editing ? 'Update' : 'Create'} Company</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
