import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Company } from '@/components/CompanyManagement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, Building2, Search, Plus, X, UserPlus } from 'lucide-react';

export interface ReferrerProfileData {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  company_id: string | null;
  date_of_birth: string | null;
  spouse_name: string | null;
  interests: string | null;
  address: string | null;
  license_number: string | null;
  custom_fields: Record<string, string>;
  broker_notes: string | null;
  created_at: string;
}

interface ReferrerProfilesProps {
  referrers: ReferrerProfileData[];
  companies: Company[];
  onRefresh: () => void;
  isPreviewMode?: boolean;
  onViewReport?: (referrerId: string) => void;
}

export function ReferrerProfiles({ referrers, companies, onRefresh, isPreviewMode, onViewReport }: ReferrerProfilesProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<ReferrerProfileData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Partial<ReferrerProfileData>>({});
  const [customFieldKey, setCustomFieldKey] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({ full_name: '', email: '', phone: '', company_id: '' });
  const [adding, setAdding] = useState(false);

  const filtered = referrers.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.full_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.company_name?.toLowerCase().includes(q);
  });

  const addPartnerManually = async () => {
    if (!newPartner.full_name.trim() || !newPartner.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (isPreviewMode) {
      toast.success('Partner added (preview)');
      setAddDialogOpen(false);
      setNewPartner({ full_name: '', email: '', phone: '', company_id: '' });
      return;
    }
    setAdding(true);
    // Create a profile with a placeholder user_id, linked to current broker
    const placeholderUserId = crypto.randomUUID();
    const { error } = await supabase.from('profiles').insert({
      user_id: placeholderUserId,
      email: newPartner.email.trim(),
      full_name: newPartner.full_name.trim(),
      phone: newPartner.phone.trim() || null,
      company_id: newPartner.company_id || null,
      company_name: newPartner.company_id ? companies.find(c => c.id === newPartner.company_id)?.name || null : null,
      broker_id: user?.id,
    } as any);
    setAdding(false);
    if (error) {
      toast.error('Failed to add partner');
      console.error(error);
      return;
    }
    toast.success('Partner added. They can register with this email to access their dashboard.');
    setAddDialogOpen(false);
    setNewPartner({ full_name: '', email: '', phone: '', company_id: '' });
    onRefresh();
  };

  const openProfile = (r: ReferrerProfileData) => {
    setSelected(r);
    setForm({
      company_id: r.company_id,
      date_of_birth: r.date_of_birth,
      spouse_name: r.spouse_name,
      interests: r.interests,
      address: r.address,
      license_number: r.license_number,
      broker_notes: r.broker_notes,
      custom_fields: r.custom_fields || {},
    });
    setSheetOpen(true);
  };

  const saveProfile = async () => {
    if (!selected) return;
    if (isPreviewMode) { toast.success('Profile updated (preview)'); setSheetOpen(false); return; }
    const { error } = await supabase.from('profiles').update({
      company_id: form.company_id || null,
      date_of_birth: form.date_of_birth || null,
      spouse_name: (form.spouse_name as string)?.trim() || null,
      interests: (form.interests as string)?.trim() || null,
      address: (form.address as string)?.trim() || null,
      license_number: (form.license_number as string)?.trim() || null,
      broker_notes: (form.broker_notes as string)?.trim() || null,
      custom_fields: form.custom_fields || {},
    } as any).eq('id', selected.id);
    if (error) { toast.error('Failed to update profile'); return; }
    toast.success('Profile updated');
    setSheetOpen(false);
    onRefresh();
  };

  const addCustomField = () => {
    if (!customFieldKey.trim()) return;
    setForm(f => ({
      ...f,
      custom_fields: { ...(f.custom_fields || {}), [customFieldKey.trim()]: customFieldValue.trim() },
    }));
    setCustomFieldKey('');
    setCustomFieldValue('');
  };

  const removeCustomField = (key: string) => {
    setForm(f => {
      const cf = { ...(f.custom_fields || {}) };
      delete cf[key];
      return { ...f, custom_fields: cf };
    });
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return null;
    return companies.find(c => c.id === companyId)?.name || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">Referrers</h2>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><UserPlus className="w-4 h-4" /> Add Partner</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Referral Partner</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Add a partner manually. When they register with the same email, their account will automatically link to this profile.
            </p>
            <div className="space-y-3 mt-2">
              <div><Label>Full Name *</Label><Input value={newPartner.full_name} onChange={e => setNewPartner(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. John Smith" /></div>
              <div><Label>Email *</Label><Input type="email" value={newPartner.email} onChange={e => setNewPartner(p => ({ ...p, email: e.target.value }))} placeholder="e.g. john@realestate.com" /></div>
              <div><Label>Phone</Label><Input value={newPartner.phone} onChange={e => setNewPartner(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. 0411 222 333" /></div>
              <div>
                <Label>Company</Label>
                <Select value={newPartner.company_id || 'none'} onValueChange={v => setNewPartner(p => ({ ...p, company_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No company</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addPartnerManually} className="w-full" disabled={adding}>
                {adding ? 'Adding...' : 'Add Partner'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search referrers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No referrers found.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openProfile(r)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <p className="font-medium">{r.full_name || 'Unnamed'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCompanyName(r.company_id) ? (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {getCompanyName(r.company_id)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.email && <p>{r.email}</p>}
                      {r.phone && <p className="text-muted-foreground">{r.phone}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      {onViewReport && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onViewReport(r.user_id); }}>Report</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Profile detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">{selected.full_name || 'Unnamed Referrer'}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Basic info (read-only) */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Contact Info</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selected.email && <div><p className="text-muted-foreground">Email</p><p className="font-medium">{selected.email}</p></div>}
                    {selected.phone && <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selected.phone}</p></div>}
                  </div>
                </div>

                <Separator />

                {/* Company */}
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Select value={form.company_id || 'none'} onValueChange={v => setForm(f => ({ ...f, company_id: v === 'none' ? null : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No company</SelectItem>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Personal details */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Personal Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth || ''} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
                    <div><Label>Spouse / Partner</Label><Input value={form.spouse_name || ''} onChange={e => setForm(f => ({ ...f, spouse_name: e.target.value }))} maxLength={200} /></div>
                  </div>
                  <div><Label>Address</Label><Input value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} maxLength={500} /></div>
                  <div><Label>License / ID Number</Label><Input value={form.license_number || ''} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} maxLength={100} /></div>
                  <div><Label>Interests / Hobbies</Label><Input value={form.interests || ''} onChange={e => setForm(f => ({ ...f, interests: e.target.value }))} placeholder="e.g. Golf, AFL, Cooking" maxLength={500} /></div>
                </div>

                <Separator />

                {/* Custom fields */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Custom Fields</h3>
                  {Object.entries(form.custom_fields || {}).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex-1 text-sm"><span className="text-muted-foreground">{key}:</span> <span className="font-medium">{val}</span></div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCustomField(key)}><X className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input placeholder="Field name" value={customFieldKey} onChange={e => setCustomFieldKey(e.target.value)} className="flex-1" maxLength={100} />
                    <Input placeholder="Value" value={customFieldValue} onChange={e => setCustomFieldValue(e.target.value)} className="flex-1" maxLength={500} />
                    <Button variant="outline" size="sm" onClick={addCustomField} disabled={!customFieldKey.trim()}><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>

                <Separator />

                {/* Broker notes */}
                <div className="space-y-2">
                  <Label>Your Notes</Label>
                  <Textarea value={form.broker_notes || ''} onChange={e => setForm(f => ({ ...f, broker_notes: e.target.value }))} placeholder="Private notes about this referrer..." rows={4} maxLength={5000} />
                </div>

                <Button onClick={saveProfile} className="w-full">Save Profile</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
