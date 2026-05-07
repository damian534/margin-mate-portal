import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mail, Phone, Search, UserPlus, X, ExternalLink, Users } from 'lucide-react';
import { toast } from 'sonner';

export interface CoApplicantContact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  type?: string;
}

interface Props {
  /** All contacts available to pick from. */
  contacts: CoApplicantContact[];
  /** Currently linked co-applicant id (or null). */
  value: string | null;
  /** Called after a successful link/unlink/create. Pass new contact id (or null). */
  onChange: (newId: string | null, newContact?: CoApplicantContact) => void;
  /** IDs to exclude from the picker (e.g. the current contact itself). */
  excludeIds?: string[];
  isPreviewMode?: boolean;
  /** Optional: open the linked contact in the contact drawer. */
  onOpenContact?: (contactId: string) => void;
  /** Defaults to 'client'. */
  defaultType?: string;
  /** Hide the section header (parent provides one). */
  hideHeader?: boolean;
}

export function CoApplicantPicker({
  contacts, value, onChange, excludeIds = [], isPreviewMode = false,
  onOpenContact, defaultType = 'client', hideHeader = false,
}: Props) {
  const { effectiveBrokerId } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const linked = value ? contacts.find(c => c.id === value) : null;
  const available = contacts.filter(c => !excludeIds.includes(c.id) && c.id !== value);

  const resetCreate = () => { setFirst(''); setLast(''); setEmail(''); setPhone(''); };

  const handleCreate = async () => {
    if (!first.trim() || !last.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    if (isPreviewMode) {
      const fake: CoApplicantContact = {
        id: `preview-${Date.now()}`, first_name: first.trim(), last_name: last.trim(),
        email: email.trim() || null, phone: phone.trim() || null, type: defaultType,
      };
      onChange(fake.id, fake);
      toast.success('Co-applicant added (preview)');
      setSaving(false); resetCreate(); setCreateOpen(false);
      return;
    }
    const { data, error } = await supabase.from('contacts').insert({
      first_name: first.trim(), last_name: last.trim(),
      email: email.trim() || null, phone: phone.trim() || null,
      type: defaultType, created_by: effectiveBrokerId,
    } as any).select().single();
    if (error || !data) { toast.error('Failed to create co-applicant'); setSaving(false); return; }
    onChange((data as any).id, data as any);
    toast.success('Co-applicant added');
    setSaving(false); resetCreate(); setCreateOpen(false);
  };

  return (
    <div className="space-y-2">
      {!hideHeader && (
        <Label className="text-xs flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Co-applicant
        </Label>
      )}
      {linked ? (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {linked.first_name[0]}{linked.last_name?.[0] || ''}
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm font-medium truncate">{linked.first_name} {linked.last_name}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {linked.email && (
                  <a href={`mailto:${linked.email}`} className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" /> {linked.email}
                  </a>
                )}
                {linked.phone && (
                  <a href={`tel:${linked.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                    <Phone className="w-3 h-3 shrink-0" /> {linked.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 pt-2 border-t border-border">
            {onOpenContact && !linked.id.startsWith('preview-') && (
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs h-8" onClick={() => onOpenContact(linked.id)}>
                <ExternalLink className="w-3 h-3" /> Open
              </Button>
            )}
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-destructive"
              onClick={() => { onChange(null); toast.success('Co-applicant unlinked'); }}>
              <X className="w-3 h-3" /> Unlink
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start gap-2 text-muted-foreground font-normal h-9">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs">Link existing contact...</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 bg-background border border-border shadow-lg z-[100]" align="start">
              <Command>
                <CommandInput placeholder="Type a name to search..." />
                <CommandList>
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    {available.map(c => (
                      <CommandItem
                        key={c.id}
                        value={`${c.first_name} ${c.last_name} ${c.email || ''} ${c.phone || ''}`}
                        onSelect={() => {
                          setPickerOpen(false);
                          onChange(c.id, c);
                          toast.success(`Linked ${c.first_name} ${c.last_name}`);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {c.first_name[0]}{c.last_name?.[0] || ''}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.email || c.phone || c.company || 'No details'}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => setCreateOpen(true)}>
            <UserPlus className="w-3.5 h-3.5" /> New
          </Button>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetCreate(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Co-applicant</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">First Name *</Label><Input value={first} onChange={e => setFirst(e.target.value)} /></div>
              <div><Label className="text-xs">Last Name *</Label><Input value={last} onChange={e => setLast(e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><Label className="text-xs">Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !first.trim() || !last.trim()}>
              {saving ? 'Adding...' : 'Add Co-applicant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}