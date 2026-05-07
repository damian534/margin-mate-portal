import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Tag } from 'lucide-react';

interface LeadSource {
  id: string;
  name: string;
  label: string;
  display_order: number;
  is_default: boolean;
}

export function LeadSourcesManagement() {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lead_sources')
      .select('*')
      .order('display_order');
    if (error) toast.error('Failed to load lead sources');
    setSources((data as LeadSource[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    const name = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const nextOrder = sources.length ? Math.max(...sources.map(s => s.display_order)) + 1 : 0;
    const { error } = await supabase
      .from('lead_sources')
      .insert({ name, label, display_order: nextOrder });
    if (error) {
      toast.error(error.message || 'Failed to add source');
      return;
    }
    toast.success('Lead source added');
    setNewLabel('');
    setAdding(false);
    fetchSources();
  };

  const handleUpdate = async (id: string) => {
    const label = editLabel.trim();
    if (!label) return;
    const name = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const { error } = await supabase
      .from('lead_sources')
      .update({ label, name })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update source');
      return;
    }
    toast.success('Source updated');
    setEditingId(null);
    fetchSources();
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete "${label}"? Existing leads using this source will keep their value.`)) return;
    const { error } = await supabase.from('lead_sources').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete source');
      return;
    }
    toast.success(`"${label}" deleted`);
    fetchSources();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" /> Lead Sources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="space-y-2">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                  {editingId === source.id ? (
                    <>
                      <Input
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        className="h-8 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(source.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <Button size="sm" onClick={() => handleUpdate(source.id)} className="h-8">Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8">✕</Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{source.label}</span>
                      {source.is_default && (
                        <span className="text-xs text-muted-foreground">default</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditingId(source.id); setEditLabel(source.label); }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(source.id, source.label)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {adding ? (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed">
                <Input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="e.g. LinkedIn, Website Form…"
                  className="h-8 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') { setAdding(false); setNewLabel(''); }
                  }}
                />
                <Button size="sm" onClick={handleAdd} disabled={!newLabel.trim()} className="h-8">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewLabel(''); }} className="h-8">✕</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Add Lead Source
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}