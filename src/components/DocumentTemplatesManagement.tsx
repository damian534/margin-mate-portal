import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, FileText, Save, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';

const SECTIONS = ['Identity', 'Income', 'Bank Statements', 'Tax Returns', 'Additional', 'Other'];

interface TemplateItem { section: string; name: string; description?: string }
interface Template { id: string; name: string; items: TemplateItem[]; display_order: number }

const DEFAULT_TEMPLATES = (bankUrl: string): { name: string; items: TemplateItem[] }[] => ([
  { name: 'PAYG', items: [
    { section: 'Identity', name: 'Passport (current, valid)' },
    { section: 'Identity', name: "Driver's licence (front and back)" },
    { section: 'Identity', name: 'Medicare card (current)' },
    { section: 'Income', name: 'Most recent payslip' },
    { section: 'Income', name: 'Previous payslip' },
    { section: 'Income', name: '2025 income statement', description: 'myGov → ATO → Income statements → download as PDF' },
    { section: 'Bank Statements', name: '3 months — everyday salary account', description: `Use ${bankUrl}` },
    { section: 'Bank Statements', name: '3 months — savings account', description: `Use ${bankUrl}` },
    { section: 'Additional', name: 'Rental income — lease agreements + last 2 years tax returns' },
    { section: 'Additional', name: 'Property documents — rates notice or contract of sale' },
  ]},
  { name: 'Sole Trader', items: [
    { section: 'Tax Returns', name: 'Most recent year tax return' },
    { section: 'Tax Returns', name: 'Previous year tax return' },
    { section: 'Tax Returns', name: 'Most recent ATO NOA (Notice of Assessment)' },
    { section: 'Tax Returns', name: 'Previous year ATO NOA (Notice of Assessment)' },
  ]},
  { name: 'Company/Trust', items: [
    { section: 'Tax Returns', name: 'Most recent year individual tax return' },
    { section: 'Tax Returns', name: 'Previous year individual tax return' },
    { section: 'Tax Returns', name: 'Most recent year company tax return' },
    { section: 'Tax Returns', name: 'Previous year company tax return' },
    { section: 'Tax Returns', name: 'Most recent ATO NOA (Notice of Assessment)' },
    { section: 'Tax Returns', name: 'Previous year ATO NOA (Notice of Assessment)' },
  ]},
]);

export function DocumentTemplatesManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newTplName, setNewTplName] = useState('');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('document_templates')
      .select('id, name, items, display_order')
      .order('display_order');
    if (error) toast.error('Failed to load templates');
    setTemplates((data || []).map((t: any) => ({ ...t, items: t.items || [] })));
    setLoading(false);
  };

  const createTemplate = async () => {
    if (!newTplName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // get broker_id via RPC helper – fall back to current user id
    const { data: brokerData } = await (supabase as any).rpc('get_my_broker_id', { _user_id: user.id });
    const brokerId = brokerData || user.id;
    const { error } = await (supabase as any).from('document_templates').insert({
      broker_id: brokerId, name: newTplName.trim(), items: [], display_order: templates.length + 1,
    });
    if (error) { toast.error(error.message); return; }
    setNewTplName('');
    fetchTemplates();
    toast.success('Template created');
  };

  const updateTemplate = async (tpl: Template) => {
    setSavingId(tpl.id);
    const { error } = await (supabase as any)
      .from('document_templates')
      .update({ name: tpl.name, items: tpl.items })
      .eq('id', tpl.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await (supabase as any).from('document_templates').delete().eq('id', id);
    fetchTemplates();
  };

  const seedDefaults = async () => {
    setSeeding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not signed in'); return; }
      const { data: brokerData } = await (supabase as any).rpc('get_my_broker_id', { _user_id: user.id });
      const brokerId = brokerData || user.id;
      // Look up broker's bankstatements URL to inject into defaults
      const { data: prof } = await supabase.from('profiles').select('bankstatements_url').eq('user_id', brokerId).maybeSingle();
      const bankUrl = (prof as any)?.bankstatements_url || 'https://bankstatements.com.au';
      const existingNames = new Set(templates.map(t => t.name.trim().toLowerCase()));
      const baseOrder = templates.length;
      const toInsert = DEFAULT_TEMPLATES(bankUrl)
        .filter(d => !existingNames.has(d.name.toLowerCase()))
        .map((d, i) => ({ broker_id: brokerId, name: d.name, items: d.items, display_order: baseOrder + i + 1, is_default: true }));
      if (toInsert.length === 0) { toast.info('Default templates already exist'); return; }
      const { error } = await (supabase as any).from('document_templates').insert(toInsert);
      if (error) { toast.error(error.message); return; }
      toast.success(`Restored ${toInsert.length} default template${toInsert.length > 1 ? 's' : ''}`);
      fetchTemplates();
    } finally {
      setSeeding(false);
    }
  };

  const updateLocal = (id: string, patch: Partial<Template>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  const updateItem = (tplId: string, idx: number, patch: Partial<TemplateItem>) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== tplId) return t;
      const items = [...t.items];
      items[idx] = { ...items[idx], ...patch };
      return { ...t, items };
    }));
  };

  const addItem = (tplId: string) => {
    setTemplates(prev => prev.map(t => t.id === tplId
      ? { ...t, items: [...t.items, { section: 'Other', name: '', description: '' }] }
      : t));
  };

  const removeItem = (tplId: string, idx: number) => {
    setTemplates(prev => prev.map(t => t.id === tplId
      ? { ...t, items: t.items.filter((_, i) => i !== idx) }
      : t));
  };

  const moveItem = (tplId: string, idx: number, dir: -1 | 1) => {
    setTemplates(prev => prev.map(t => {
      if (t.id !== tplId) return t;
      const next = idx + dir;
      if (next < 0 || next >= t.items.length) return t;
      const items = [...t.items];
      [items[idx], items[next]] = [items[next], items[idx]];
      return { ...t, items };
    }));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" /> Create new template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Template name (e.g. PAYG, Self-Employed)" value={newTplName} onChange={e => setNewTplName(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={createTemplate} disabled={!newTplName.trim()}><Plus className="w-4 h-4 mr-1" />Create</Button>
              <Button variant="outline" onClick={seedDefaults} disabled={seeding} title="Add PAYG / Sole Trader / Company-Trust default templates">
                <RotateCcw className="w-4 h-4 mr-1" /> {seeding ? 'Restoring…' : 'Restore defaults'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {templates.length === 0 && <p className="text-sm text-muted-foreground">No templates yet.</p>}

      {templates.map(tpl => (
        <Card key={tpl.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <Input className="max-w-xs h-9" value={tpl.name} onChange={e => updateLocal(tpl.id, { name: e.target.value })} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateTemplate(tpl)} disabled={savingId === tpl.id}>
                  <Save className="w-3.5 h-3.5 mr-1" /> {savingId === tpl.id ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteTemplate(tpl.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {tpl.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                <Select value={item.section} onValueChange={v => updateItem(tpl.id, idx, { section: v })}>
                  <SelectTrigger className="col-span-2 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="col-span-4 h-9" placeholder="Document name" value={item.name} onChange={e => updateItem(tpl.id, idx, { name: e.target.value })} />
                <Input className="col-span-4 h-9" placeholder="Description (optional)" value={item.description || ''} onChange={e => updateItem(tpl.id, idx, { description: e.target.value })} />
                <div className="col-span-2 flex items-center gap-1 justify-end">
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled={idx === 0} onClick={() => moveItem(tpl.id, idx, -1)} title="Move up">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled={idx === tpl.items.length - 1} onClick={() => moveItem(tpl.id, idx, 1)} title="Move down">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive" onClick={() => removeItem(tpl.id, idx)} title="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem(tpl.id)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add document
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}