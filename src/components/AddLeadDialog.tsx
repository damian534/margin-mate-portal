import { useState, useEffect, useMemo } from 'react';
import { notifyNewLead } from '@/lib/notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Search, UserPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadSource {
  id: string;
  name: string;
  label: string;
}

interface ReferrerOption {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  company_name?: string | null;
}

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface AddLeadDialogProps {
  leadSources: LeadSource[];
  referrers: ReferrerOption[];
  contacts: ContactOption[];
  isPreviewMode: boolean;
  onLeadAdded: () => void;
  onContactCreated?: () => void;
}

export function AddLeadDialog({ leadSources, referrers, contacts, isPreviewMode, onLeadAdded, onContactCreated }: AddLeadDialogProps) {
  const { effectiveBrokerId } = useAuth();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('direct_call');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [selectedReferrerId, setSelectedReferrerId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [referrerOpen, setReferrerOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // For creating new contact inline
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactFirst, setNewContactFirst] = useState('');
  const [newContactLast, setNewContactLast] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const needsReferrer = source === 'referral_partner';
  const needsContactReferrer = source === 'client_referral' || source === 'existing_client';

  const resetForm = () => {
    setSource('direct_call');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setLoanAmount('');
    setLoanPurpose('');
    setSelectedReferrerId('');
    setSelectedContactId('');
    setShowNewContact(false);
    setNewContactFirst('');
    setNewContactLast('');
    setNewContactEmail('');
    setNewContactPhone('');
  };

  const createNewContact = async (): Promise<string | null> => {
    if (!newContactFirst.trim() || !newContactLast.trim()) {
      toast.error('Contact first and last name are required');
      return null;
    }
    if (isPreviewMode) {
      const fakeId = `contact-preview-${Date.now()}`;
      toast.success('Contact created (preview)');
      return fakeId;
    }
    const { data, error } = await supabase.from('contacts').insert({
      first_name: newContactFirst.trim(),
      last_name: newContactLast.trim(),
      email: newContactEmail.trim() || null,
      phone: newContactPhone.trim() || null,
      type: 'client',
      created_by: effectiveBrokerId,
    } as any).select('id').maybeSingle();
    if (error) { toast.error('Failed to create contact'); return null; }
    onContactCreated?.();
    return data?.id || null;
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    setSaving(true);

    let sourceContactId: string | null = null;
    if (needsContactReferrer) {
      if (showNewContact) {
        sourceContactId = await createNewContact();
        if (!sourceContactId) { setSaving(false); return; }
      } else {
        sourceContactId = selectedContactId || null;
      }
    }

    // Auto-create a contact for the lead client if not linking to an existing source contact
    let createdContactId: string | null = null;
    if (!isPreviewMode) {
      const { data: contactData, error: contactErr } = await supabase.from('contacts').insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        type: 'client',
        created_by: effectiveBrokerId,
      } as any).select('id').maybeSingle();
      if (contactErr) {
        console.error('Failed to auto-create contact:', contactErr);
      } else {
        createdContactId = contactData?.id || null;
        onContactCreated?.();
      }
    }

    const leadData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      loan_amount: loanAmount ? parseFloat(loanAmount) : null,
      loan_purpose: loanPurpose.trim() || null,
      source,
      referral_partner_id: needsReferrer ? (selectedReferrerId || null) : null,
      source_contact_id: sourceContactId,
      status: 'new',
      broker_id: effectiveBrokerId,
    };

    if (isPreviewMode) {
      toast.success('Lead added (preview)');
      setSaving(false);
      resetForm();
      setOpen(false);
      onLeadAdded();
      return;
    }

    const { data: newLead, error } = await supabase.from('leads').insert(leadData as any).select('id, email').maybeSingle();
    if (error) { toast.error('Failed to add lead'); setSaving(false); return; }
    toast.success('Lead added successfully');

    // Auto-send fact find email if lead has an email
    if (newLead?.email) {
      supabase.functions.invoke('send-fact-find', {
        body: { lead_id: newLead.id, app_url: window.location.origin },
      }).then(({ data, error: fnErr }) => {
        if (fnErr || data?.error) {
          console.error('Auto-send fact find failed:', fnErr || data?.error);
        } else {
          toast.success('Fact Find email sent to ' + newLead.email);
        }
      });
    }

    setSaving(false);
    resetForm();
    setOpen(false);
    onLeadAdded();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Lead</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Lead Source */}
          <div className="space-y-1.5">
            <Label>Lead Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {leadSources.map(s => (
                  <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Referrer picker (for referral_partner source) */}
          {needsReferrer && (
            <div className="space-y-1.5">
              <Label>Referral Partner</Label>
              <Popover open={referrerOpen} onOpenChange={setReferrerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {selectedReferrerId
                      ? referrers.find(r => (r.user_id || r.id) === selectedReferrerId)?.full_name || 'Selected'
                      : 'Search referrer...'}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or email..." />
                    <CommandList>
                      <CommandEmpty>No referrer found.</CommandEmpty>
                      <CommandGroup>
                        {referrers.map(r => {
                          const referrerId = r.user_id || r.id;
                          return (
                          <CommandItem
                            key={referrerId}
                            value={`${r.full_name || ''} ${r.email || ''} ${r.company_name || ''}`}
                            onSelect={() => { setSelectedReferrerId(referrerId); setReferrerOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedReferrerId === referrerId ? "opacity-100" : "opacity-0")} />
                            <div>
                              <p className="text-sm font-medium">{r.full_name || 'Unnamed'}</p>
                              {r.email && <p className="text-xs text-muted-foreground">{r.email}</p>}
                              {r.company_name && <p className="text-xs text-muted-foreground">{r.company_name}</p>}
                            </div>
                          </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Contact picker (for client_referral / existing_client) */}
          {needsContactReferrer && !showNewContact && (
            <div className="space-y-1.5">
              <Label>Referring Contact</Label>
              <Popover open={contactOpen} onOpenChange={setContactOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {selectedContactId
                      ? (() => { const c = contacts.find(c => c.id === selectedContactId); return c ? `${c.first_name} ${c.last_name}` : 'Selected'; })()
                      : 'Search contact...'}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search contacts..." />
                    <CommandList>
                      <CommandEmpty>
                        <p className="text-sm text-muted-foreground mb-2">No contact found.</p>
                        <Button size="sm" variant="outline" onClick={() => { setShowNewContact(true); setContactOpen(false); }}>
                          <UserPlus className="w-4 h-4 mr-1" /> Create New Contact
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {contacts.map(c => (
                          <CommandItem
                            key={c.id}
                            value={`${c.first_name} ${c.last_name} ${c.email || ''}`}
                            onSelect={() => { setSelectedContactId(c.id); setContactOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")} />
                            <div>
                              <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                              {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setShowNewContact(true); setContactOpen(false); }}>
                          <UserPlus className="mr-2 h-4 w-4" /> Create New Contact
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Inline new contact creation */}
          {needsContactReferrer && showNewContact && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">New Referring Contact</p>
                <Button variant="ghost" size="sm" onClick={() => setShowNewContact(false)}>Cancel</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">First Name *</Label><Input value={newContactFirst} onChange={e => setNewContactFirst(e.target.value)} placeholder="First" /></div>
                <div><Label className="text-xs">Last Name *</Label><Input value={newContactLast} onChange={e => setNewContactLast(e.target.value)} placeholder="Last" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Email</Label><Input type="email" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="Email" /></div>
                <div><Label className="text-xs">Phone</Label><Input value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} placeholder="Phone" /></div>
              </div>
            </div>
          )}

          <Separator />

          {/* Lead details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" maxLength={100} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" maxLength={30} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Loan Amount</Label>
              <Input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} placeholder="0" min={0} max={999999999} />
            </div>
            <div className="space-y-1.5">
              <Label>Loan Purpose</Label>
              <Input value={loanPurpose} onChange={e => setLoanPurpose(e.target.value)} placeholder="e.g. Home Purchase" />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={saving || !firstName.trim() || !lastName.trim()} className="w-full">
            {saving ? 'Adding...' : 'Add Lead'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
