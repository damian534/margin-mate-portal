import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Building2, Trash2 } from 'lucide-react';

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

interface CompanyManagementProps {
  companies: Company[];
  onRefresh: () => void;
  isPreviewMode?: boolean;
}

export function CompanyManagement({ companies, onRefresh, isPreviewMode }: CompanyManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', website: '', notes: '' });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', address: '', phone: '', email: '', website: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({ name: c.name, address: c.address || '', phone: c.phone || '', email: c.email || '', website: c.website || '', notes: c.notes || '' });
    setDialogOpen(true);
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

  const deleteCompany = async (id: string) => {
    if (isPreviewMode) { toast.success('Company deleted (preview)'); return; }
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) { toast.error('Failed to delete company. It may still have referrers assigned.'); return; }
    toast.success('Company deleted');
    onRefresh();
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
                  <TableHead>Website</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map(c => (
                  <TableRow key={c.id}>
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
                    <TableCell className="text-sm text-muted-foreground">{c.website || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCompany(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
