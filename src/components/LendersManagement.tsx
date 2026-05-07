import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Building2 } from 'lucide-react';

interface Lender {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export function LendersManagement() {
  const { effectiveBrokerId } = useAuth();
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { fetchLenders(); }, [effectiveBrokerId]);

  const fetchLenders = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('lenders').select('*').order('display_order');
    if (error) toast.error('Failed to load lenders');
    setLenders((data as Lender[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || !effectiveBrokerId) return;
    const nextOrder = lenders.length ? Math.max(...lenders.map(l => l.display_order)) + 1 : 0;
    const { error } = await supabase.from('lenders').insert({ name, display_order: nextOrder, broker_id: effectiveBrokerId } as any);
    if (error) { toast.error(error.message || 'Failed to add lender'); return; }
    toast.success('Lender added');
    setNewName(''); setAdding(false);
    fetchLenders();
  };

  const handleUpdate = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    const { error } = await supabase.from('lenders').update({ name } as any).eq('id', id);
    if (error) { toast.error('Failed to update lender'); return; }
    toast.success('Lender updated');
    setEditingId(null);
    fetchLenders();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? Existing loan splits will keep this lender name.`)) return;
    const { error } = await supabase.from('lenders').delete().eq('id', id);
    if (error) { toast.error('Failed to delete lender'); return; }
    toast.success(`"${name}" deleted`);
    fetchLenders();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Lenders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="space-y-2">
              {lenders.map((l) => (
                <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                  {editingId === l.id ? (
                    <>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm flex-1" autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(l.id); if (e.key === 'Escape') setEditingId(null); }} />
                      <Button size="sm" onClick={() => handleUpdate(l.id)} className="h-8">Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8">✕</Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{l.name}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => { setEditingId(l.id); setEditName(l.name); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(l.id, l.name)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {adding ? (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. CBA, Macquarie…"
                  className="h-8 text-sm flex-1" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }} />
                <Button size="sm" onClick={handleAdd} disabled={!newName.trim()} className="h-8">Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(''); }} className="h-8">✕</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Add Lender
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}