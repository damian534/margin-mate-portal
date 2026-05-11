import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Briefcase, Mail, Phone, Search, UserPlus, X, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';

export interface ProContact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  type?: string | null;
}

interface LinkedRow {
  id: string;
  lead_id: string;
  contact_id: string;
  role: string;
}

const ROLES = [
  { value: 'solicitor', label: 'Solicitor' },
  { value: 'conveyancer', label: 'Conveyancer' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'financial_planner', label: 'Financial Planner' },
  { value: 'buyers_agent', label: "Buyer's Agent" },
  { value: 'other', label: 'Other' },
];

const roleLabel = (r: string) => ROLES.find(x => x.value === r)?.label || r;

interface Props {
  leadId: string;
  contacts: ProContact[];
  isPreviewMode?: boolean;
  onOpenContact?: (contactId: string) => void;
  /** Notify parent when contacts list changes (new contact created). */
  onContactsChanged?: () => void;
}

export function ProfessionalContactsSection({
  leadId, contacts, isPreviewMode = false, onOpenContact, onContactsChanged,
}: Props) {
  const { effectiveBrokerId } = useAuth();
  const [rows, setRows] = useState<LinkedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pendingRole, setPendingRole] = useState<string>('conveyancer');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    if (isPreviewMode || leadId.startsWith('preview-')) { setRows([]); setLoading(false); return; }
    const { data } = await supabase
      .from('lead_professional_contacts' as any)
      .select('id, lead_id, contact_id, role')
      .eq('lead_id', leadId);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [leadId]);

  const linked = rows.map(r => ({
    row: r,
    contact: contacts.find(c => c.id === r.contact_id) || null,
  }));

  // Suggest contacts whose type matches the chosen role first; fall back to all.
  const suggestions = (() => {
    const linkedIds = new Set(rows.filter(r => r.role === pendingRole).map(r => r.contact_id));
    const matchType = contacts.filter(c => (c.type || '').toLowerCase() === pendingRole && !linkedIds.has(c.id));
    const others = contacts.filter(c => (c.type || '').toLowerCase() !== pendingRole && !linkedIds.has(c.id));
    return [...matchType, ...others];
  })();

  const linkContact = async (contactId: string, role: string) => {
    if (isPreviewMode) {
      const fakeRow: LinkedRow = { id: `preview-${Date.now()}`, lead_id: leadId, contact_id: contactId, role };
      setRows(rs => [...rs, fakeRow]);
      toast.success(`${roleLabel(role)} added (preview)`);
      return;
    }
    const { data, error } = await supabase
      .from('lead_professional_contacts' as any)
      .insert({ lead_id: leadId, contact_id: contactId, role } as any)
      .select('id, lead_id, contact_id, role')
      .maybeSingle();
    if (error) {
      if ((error as any).code === '23505') { toast.info('Already linked to this deal'); return; }
      console.error('lead_professional_contacts insert failed', error);
      toast.error(`Failed to add: ${error.message}`);
      return;
    }
    if (data) {
      setRows(rs => [...rs, data as any]);
    } else {
      // Insert succeeded but SELECT was hidden by RLS — refetch.
      await load();
    }
    toast.success(`${roleLabel(role)} added`);
  };

  const unlink = async (rowId: string) => {
    if (isPreviewMode || rowId.startsWith('preview-')) {
      setRows(rs => rs.filter(r => r.id !== rowId));
      toast.success('Removed');
      return;
    }
    const { error } = await supabase.from('lead_professional_contacts' as any).delete().eq('id', rowId);
    if (error) { toast.error('Failed to remove'); return; }
    setRows(rs => rs.filter(r => r.id !== rowId));
    toast.success('Removed');
  };

  const resetCreate = () => { setFirst(''); setLast(''); setEmail(''); setPhone(''); setCompany(''); };

  const handleCreateContact = async () => {
    if (!first.trim() || !last.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    if (isPreviewMode) {
      const fakeId = `preview-${Date.now()}`;
      const fakeRow: LinkedRow = { id: `preview-r-${Date.now()}`, lead_id: leadId, contact_id: fakeId, role: pendingRole };
      setRows(rs => [...rs, fakeRow]);
      toast.success(`${roleLabel(pendingRole)} added (preview)`);
      setSaving(false); resetCreate(); setCreateOpen(false); setAdding(false);
      return;
    }
    // Use auth.uid() as created_by — this satisfies the broker RLS policy.
    // Staff users insert via the staff RLS policy which requires created_by = broker id;
    // we attempt auth.uid() first, then fall back to effectiveBrokerId for staff.
    const { data: userRes } = await supabase.auth.getUser();
    const myUid = userRes?.user?.id || null;
    let { data: c, error: cErr } = await supabase.from('contacts').insert({
      first_name: first.trim(), last_name: last.trim(),
      email: email.trim() || null, phone: phone.trim() || null,
      company: company.trim() || null,
      type: pendingRole, created_by: myUid,
    } as any).select().maybeSingle();
    if ((cErr || !c) && effectiveBrokerId && effectiveBrokerId !== myUid) {
      const retry = await supabase.from('contacts').insert({
        first_name: first.trim(), last_name: last.trim(),
        email: email.trim() || null, phone: phone.trim() || null,
        company: company.trim() || null,
        type: pendingRole, created_by: effectiveBrokerId,
      } as any).select().maybeSingle();
      c = retry.data as any; cErr = retry.error as any;
    }
    if (cErr || !c) {
      console.error('contacts insert failed', cErr);
      toast.error(`Failed to create contact: ${(cErr as any)?.message || 'unknown error'}`);
      setSaving(false); return;
    }
    await linkContact((c as any).id, pendingRole);
    onContactsChanged?.();
    setSaving(false); resetCreate(); setCreateOpen(false); setAdding(false);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs flex items-center gap-1.5 mb-0">
          <Briefcase className="w-3 h-3" /> Professional Contacts
        </Label>
        {!adding && (
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setAdding(true)}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : linked.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground">No solicitor, conveyancer or accountant added yet.</p>
      ) : (
        <div className="space-y-1.5">
          {linked.map(({ row, contact }) => (
            <div key={row.id} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                {roleLabel(row.role)}
              </span>
              <div className="flex-1 min-w-0">
                {contact ? (
                  <>
                    <p className="text-xs font-medium truncate">
                      {contact.first_name} {contact.last_name}
                      {contact.company && <span className="text-muted-foreground font-normal"> · {contact.company}</span>}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-[11px] text-primary hover:underline flex items-center gap-1 truncate">
                          <Mail className="w-2.5 h-2.5 shrink-0" /> {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-[11px] text-primary hover:underline flex items-center gap-1 truncate">
                          <Phone className="w-2.5 h-2.5 shrink-0" /> {contact.phone}
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Contact not found</p>
                )}
              </div>
              {contact && onOpenContact && !contact.id.startsWith('preview-') && (
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onOpenContact(contact.id)} title="Open contact">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => unlink(row.id)} title="Remove">
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="rounded-md border border-dashed border-border bg-background/60 p-2 space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-[11px] text-muted-foreground shrink-0">Role</Label>
            <select
              value={pendingRole}
              onChange={e => setPendingRole(e.target.value)}
              className="h-8 text-xs rounded-md border border-input bg-background px-2 flex-1"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setAdding(false)} title="Cancel">
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start gap-2 text-muted-foreground font-normal h-8">
                  <Search className="w-3 h-3 shrink-0" />
                  <span className="text-xs">Link existing contact…</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 bg-background border border-border shadow-lg z-[100]" align="start">
                <Command>
                  <CommandInput placeholder="Search name, company…" />
                  <CommandList>
                    <CommandEmpty>No contacts found.</CommandEmpty>
                    <CommandGroup>
                      {suggestions.map(c => (
                        <CommandItem
                          key={c.id}
                          value={`${c.first_name} ${c.last_name} ${c.company || ''} ${c.email || ''} ${c.phone || ''}`}
                          onSelect={async () => {
                            setPickerOpen(false);
                            await linkContact(c.id, pendingRole);
                            setAdding(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[11px] shrink-0">
                            {c.first_name[0]}{c.last_name?.[0] || ''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {c.first_name} {c.last_name}
                              {(c.type || '').toLowerCase() === pendingRole && (
                                <span className="ml-1 text-[9px] uppercase text-success">match</span>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {c.company || c.email || c.phone || 'No details'}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setCreateOpen(true)}>
              <UserPlus className="w-3 h-3" /> New
            </Button>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetCreate(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add {roleLabel(pendingRole)}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            They'll be saved to your contacts so you can reuse them on other deals.
          </p>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">First Name *</Label><Input value={first} onChange={e => setFirst(e.target.value)} /></div>
              <div><Label className="text-xs">Last Name *</Label><Input value={last} onChange={e => setLast(e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">Company / Firm</Label><Input value={company} onChange={e => setCompany(e.target.value)} /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><Label className="text-xs">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateContact} disabled={saving || !first.trim() || !last.trim()}>
              {saving ? 'Adding…' : `Add ${roleLabel(pendingRole)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
