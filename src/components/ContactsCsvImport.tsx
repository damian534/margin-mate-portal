import { useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface Props {
  brokerId: string | null;
  isPreviewMode: boolean;
  onImported: () => void;
}

type ParsedRow = Record<string, string>;
const FIELD_OPTIONS = [
  { value: '__skip__', label: '— skip —' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'notes', label: 'Notes' },
];

function autoMap(header: string): string {
  const h = header.toLowerCase().trim();
  if (/first.*name|given/.test(h)) return 'first_name';
  if (/last.*name|surname|family/.test(h)) return 'last_name';
  if (/^name$|full.?name/.test(h)) return 'first_name';
  if (/e-?mail/.test(h)) return 'email';
  if (/phone|mobile|cell/.test(h)) return 'phone';
  if (/company|organisation|organization|business/.test(h)) return 'company';
  if (/notes?|comment/.test(h)) return 'notes';
  return '__skip__';
}

export function ContactsCsvImport({ brokerId, isPreviewMode, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [type, setType] = useState<'client' | 'referrer'>('client');
  const [importing, setImporting] = useState(false);

  const reset = () => { setHeaders([]); setRows([]); setMapping({}); };

  const handleFile = (file: File) => {
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hdrs = res.meta.fields || [];
        setHeaders(hdrs);
        setRows(res.data as ParsedRow[]);
        const map: Record<string, string> = {};
        hdrs.forEach((h) => { map[h] = autoMap(h); });
        setMapping(map);
      },
      error: () => toast.error('Could not read CSV'),
    });
  };

  const buildContacts = () => {
    return rows.map((row) => {
      const c: any = { type, created_by: brokerId };
      Object.entries(mapping).forEach(([col, field]) => {
        if (field === '__skip__') return;
        const val = (row[col] || '').toString().trim();
        if (!val) return;
        if (c[field]) c[field] = `${c[field]} ${val}`;
        else c[field] = val;
      });
      // Split single-name field if needed
      if (c.first_name && !c.last_name && c.first_name.includes(' ')) {
        const parts = c.first_name.split(/\s+/);
        c.first_name = parts.shift();
        c.last_name = parts.join(' ');
      }
      return c;
    }).filter((c) => c.first_name && c.last_name);
  };

  const validCount = buildContacts().length;

  const handleImport = async () => {
    if (isPreviewMode) { toast.info('Import disabled in preview'); return; }
    const contacts = buildContacts();
    if (contacts.length === 0) { toast.error('No valid rows (need first + last name)'); return; }
    setImporting(true);
    let inserted = 0, errors = 0;
    for (let i = 0; i < contacts.length; i += 100) {
      const chunk = contacts.slice(i, i + 100);
      const { error } = await supabase.from('contacts').insert(chunk);
      if (error) errors += chunk.length; else inserted += chunk.length;
    }
    setImporting(false);
    if (inserted > 0) toast.success(`Imported ${inserted} contacts${errors ? ` (${errors} failed)` : ''}`);
    else toast.error('Import failed');
    onImported();
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Upload className="w-4 h-4 mr-2" /> Import CSV
      </Button>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import contacts from CSV</DialogTitle>
        </DialogHeader>

        {headers.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed rounded-md">
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload a CSV with columns like first name, last name, email, phone, company.
            </p>
            <Input type="file" accept=".csv,text/csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="max-w-xs mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Default contact type</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="referrer">Referrer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Map columns</Label>
              <div className="space-y-2">
                {headers.map((h) => (
                  <div key={h} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-1/2 truncate">{h}</span>
                    <Select value={mapping[h] || '__skip__'} onValueChange={(v) => setMapping(p => ({ ...p, [h]: v }))}>
                      <SelectTrigger className="w-1/2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {validCount} of {rows.length} rows ready to import (rows missing first or last name are skipped).
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
          {headers.length > 0 && (
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? 'Importing...' : `Import ${validCount} contacts`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}