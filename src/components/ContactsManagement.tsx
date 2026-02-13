import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Search, Mail, Phone, Building2, User } from 'lucide-react';

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactsManagementProps {
  contacts: Contact[];
  onRefresh: () => void;
  isPreviewMode: boolean;
  openContactId?: string | null;
  onContactOpened?: () => void;
}

const CONTACT_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'referrer', label: 'Referrer' },
];

export function ContactsManagement({ contacts, onRefresh, isPreviewMode, openContactId, onContactOpened }: ContactsManagementProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Open a specific contact when openContactId changes
  useEffect(() => {
    if (openContactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === openContactId);
      if (contact) {
        setSelectedContact(contact);
        setSheetOpen(true);
        onContactOpened?.();
      }
    }
  }, [openContactId, contacts]);

  // Add form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('client');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !search || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) || c.phone?.includes(q) || c.company?.toLowerCase().includes(q);
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const resetForm = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPhone('');
    setCompany(''); setType('client'); setNotes('');
  };

  const handleAdd = async () => {
    if (!firstName.trim() || !lastName.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    if (isPreviewMode) {
      toast.success('Contact added (preview)');
      setSaving(false); resetForm(); setAddOpen(false);
      return;
    }
    const { error } = await supabase.from('contacts').insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      company: company.trim() || null,
      type,
      notes: notes.trim() || null,
    } as any);
    if (error) { toast.error('Failed to add contact'); setSaving(false); return; }
    toast.success('Contact added');
    setSaving(false); resetForm(); setAddOpen(false);
    onRefresh();
  };

  const handleUpdate = async (field: string, value: any) => {
    if (!selectedContact) return;
    const updated = { ...selectedContact, [field]: value };
    setSelectedContact(updated);
    if (isPreviewMode) return;
    const { error } = await supabase.from('contacts').update({ [field]: value } as any).eq('id', selectedContact.id);
    if (error) { toast.error('Failed to update'); return; }
    onRefresh();
  };

  const handleDelete = async () => {
    if (!selectedContact) return;
    if (isPreviewMode) { toast.success('Contact deleted (preview)'); setSheetOpen(false); return; }
    const { error } = await supabase.from('contacts').delete().eq('id', selectedContact.id);
    if (error) { toast.error('Failed to delete contact'); return; }
    toast.success('Contact deleted');
    setSheetOpen(false);
    onRefresh();
  };

  const typeLabel = (t: string) => CONTACT_TYPES.find(ct => ct.value === t)?.label || t;

  const formatPhone = (phone: string | null) => {
    if (!phone) return '—';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">Contacts</h2>
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Contact</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">First Name *</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                <div><Label className="text-xs">Last Name *</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Company</Label><Input value={company} onChange={e => setCompany(e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs">Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
              <Button onClick={handleAdd} disabled={saving || !firstName.trim() || !lastName.trim()} className="w-full">
                {saving ? 'Adding...' : 'Add Contact'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONTACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No contacts found</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedContact(c); setSheetOpen(true); }}>
                    <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                    <TableCell>{formatPhone(c.phone)}</TableCell>
                    <TableCell>{c.company || '—'}</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{typeLabel(c.type)}</span></TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Contact detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedContact && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedContact.first_name} {selectedContact.last_name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">First Name</Label><Input value={selectedContact.first_name} onChange={e => handleUpdate('first_name', e.target.value)} /></div>
                  <div><Label className="text-xs">Last Name</Label><Input value={selectedContact.last_name} onChange={e => handleUpdate('last_name', e.target.value)} /></div>
                </div>
                <div><Label className="text-xs">Email</Label><Input value={selectedContact.email || ''} onChange={e => handleUpdate('email', e.target.value || null)} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={selectedContact.phone || ''} onChange={e => handleUpdate('phone', e.target.value || null)} /></div>
                <div><Label className="text-xs">Company</Label><Input value={selectedContact.company || ''} onChange={e => handleUpdate('company', e.target.value || null)} /></div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={selectedContact.type} onValueChange={v => handleUpdate('type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={selectedContact.notes || ''} onChange={e => handleUpdate('notes', e.target.value || null)} rows={3} />
                </div>
                <Separator />
                <Button variant="destructive" size="sm" onClick={handleDelete}>Delete Contact</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
