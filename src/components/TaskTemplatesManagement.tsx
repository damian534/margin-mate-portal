import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ListChecks, ChevronDown, ChevronRight } from 'lucide-react';

interface ChecklistItem { text: string }
interface Template {
  id: string;
  name: string;
  task_title: string;
  due_in_days: number | null;
  checklist_items: ChecklistItem[];
}

export function TaskTemplatesManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('task_templates')
      .select('id, name, task_title, due_in_days, checklist_items')
      .order('display_order');
    if (error) toast.error('Failed to load task templates');
    setTemplates((data || []).map((t: any) => ({ ...t, checklist_items: t.checklist_items || [] })));
    setLoading(false);
  };

  const createTemplate = async () => {
    if (!newName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: brokerData } = await (supabase as any).rpc('get_my_broker_id', { _user_id: user.id });
    const brokerId = brokerData || user.id;
    const { error } = await (supabase as any).from('task_templates').insert({
      broker_id: brokerId,
      name: newName.trim(),
      task_title: newName.trim(),
      checklist_items: [],
      display_order: templates.length + 1,
    });
    if (error) { toast.error(error.message); return; }
    setNewName('');
    await fetchTemplates();
    toast.success('Template created');
  };

  const updateTemplate = async (tpl: Template) => {
    setSavingId(tpl.id);
    const { error } = await (supabase as any)
      .from('task_templates')
      .update({
        name: tpl.name,
        task_title: tpl.task_title,
        due_in_days: tpl.due_in_days,
        checklist_items: tpl.checklist_items,
      })
      .eq('id', tpl.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved');
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const { error } = await (supabase as any).from('task_templates').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    fetchTemplates();
  };

  const setField = (id: string, patch: Partial<Template>) =>
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));

  const addItem = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setField(id, { checklist_items: [...tpl.checklist_items, { text: '' }] });
  };

  const updateItem = (id: string, idx: number, text: string) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    const items = tpl.checklist_items.map((it, i) => i === idx ? { ...it, text } : it);
    setField(id, { checklist_items: items });
  };

  const removeItem = (id: string, idx: number) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setField(id, { checklist_items: tpl.checklist_items.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="w-4 h-4" /> Task Templates
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Create reusable workflow templates with checklists. Apply them to a lead to instantly create a task with all sub-steps.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="New template name (e.g. AIP &gt; Full not yet lodged)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createTemplate(); }}
            />
            <Button onClick={createTemplate} disabled={!newName.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No templates yet.</p>
      ) : templates.map(tpl => (
        <Card key={tpl.id}>
          <CardContent className="pt-4 space-y-3">
            <button
              type="button"
              onClick={() => toggleExpanded(tpl.id)}
              className="w-full flex items-center justify-between gap-2 text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
            >
              <div className="flex items-center gap-2 min-w-0">
                {expanded.has(tpl.id) ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                <span className="font-medium text-sm truncate">{tpl.name || 'Untitled template'}</span>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {tpl.checklist_items.length} step{tpl.checklist_items.length === 1 ? '' : 's'}
              </span>
            </button>

            {expanded.has(tpl.id) && (
              <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Template name</label>
                <Input value={tpl.name} onChange={e => setField(tpl.id, { name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Default due (days from now)</label>
                <Input
                  type="number"
                  value={tpl.due_in_days ?? ''}
                  onChange={e => setField(tpl.id, { due_in_days: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Task title (used when applied)</label>
              <Input value={tpl.task_title} onChange={e => setField(tpl.id, { task_title: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Checklist items</label>
              {tpl.checklist_items.length === 0 && (
                <p className="text-xs text-muted-foreground">No items yet.</p>
              )}
              {tpl.checklist_items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={item.text}
                    placeholder={`Step ${idx + 1}`}
                    onChange={e => updateItem(tpl.id, idx, e.target.value)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeItem(tpl.id, idx)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addItem(tpl.id)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add step
              </Button>
            </div>

            <div className="flex justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteTemplate(tpl.id)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete template
              </Button>
              <Button size="sm" disabled={savingId === tpl.id} onClick={() => updateTemplate(tpl)}>
                <Save className="w-3.5 h-3.5 mr-1" /> {savingId === tpl.id ? 'Saving…' : 'Save'}
              </Button>
            </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
