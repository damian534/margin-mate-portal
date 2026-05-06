import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, FileText, Save } from 'lucide-react';

const SECTIONS = ['Identity', 'Income', 'Bank Statements', 'Tax Returns', 'Additional', 'Other'];

interface TemplateItem { section: string; name: string; description?: string }
interface Template { id: string; name: string; items: TemplateItem[]; display_order: number }

export function DocumentTemplatesManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newTplName, setNewTplName] = useState('');

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
          <div className="flex gap-2">
            <Input placeholder="Template name (e.g. PAYG, Self-Employed)" value={newTplName} onChange={e => setNewTplName(e.target.value)} />
            <Button onClick={createTemplate} disabled={!newTplName.trim()}><Plus className="w-4 h-4 mr-1" />Create</Button>
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
                  <SelectTrigger className="col-span-3 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="col-span-4 h-9" placeholder="Document name" value={item.name} onChange={e => updateItem(tpl.id, idx, { name: e.target.value })} />
                <Input className="col-span-4 h-9" placeholder="Description (optional)" value={item.description || ''} onChange={e => updateItem(tpl.id, idx, { description: e.target.value })} />
                <Button variant="ghost" size="sm" className="col-span-1 text-destructive" onClick={() => removeItem(tpl.id, idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
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