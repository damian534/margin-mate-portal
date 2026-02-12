import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Settings, Plus, Trash2, GripVertical, Pencil } from 'lucide-react';
import { LeadStatus } from '@/hooks/useLeadStatuses';

interface StatusSettingsProps {
  statuses: LeadStatus[];
  onAdd: (name: string, label: string, color: string) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<Pick<LeadStatus, 'label' | 'color' | 'name'>>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReorder: (reordered: LeadStatus[]) => Promise<boolean>;
}

export function StatusSettings({ statuses, onAdd, onUpdate, onDelete, onReorder }: StatusSettingsProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    const name = newLabel.trim().toLowerCase().replace(/\s+/g, '_');
    const ok = await onAdd(name, newLabel.trim(), newColor);
    if (ok) {
      toast.success('Status added');
      setNewLabel('');
      setNewColor('#6b7280');
      setAdding(false);
    } else {
      toast.error('Failed to add status');
    }
  };

  const handleUpdate = async (id: string) => {
    const name = editLabel.trim().toLowerCase().replace(/\s+/g, '_');
    const ok = await onUpdate(id, { label: editLabel.trim(), color: editColor, name });
    if (ok) {
      toast.success('Status updated');
      setEditingId(null);
    } else {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (statuses.length <= 2) {
      toast.error('You need at least 2 statuses');
      return;
    }
    const ok = await onDelete(id);
    if (ok) {
      toast.success(`"${label}" deleted`);
    } else {
      toast.error('Failed to delete — status may be in use');
    }
  };

  const moveStatus = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= statuses.length) return;
    const reordered = [...statuses];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    await onReorder(reordered.map((s, i) => ({ ...s, display_order: i })));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-1" /> Manage Statuses
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lead Statuses</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {statuses.map((status, index) => (
            <div key={status.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveStatus(index, -1)}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none"
                >▲</button>
                <button
                  onClick={() => moveStatus(index, 1)}
                  disabled={index === statuses.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none"
                >▼</button>
              </div>

              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: editingId === status.id ? editColor : status.color }} />

              {editingId === status.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  />
                  <Button size="sm" variant="ghost" onClick={() => handleUpdate(status.id)} className="h-8 px-2">Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 px-2">✕</Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{status.label}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => { setEditingId(status.id); setEditLabel(status.label); setEditColor(status.color); }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(status.id, status.label)}
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
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: newColor }} />
            <Input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Status name..."
              className="h-8 text-sm flex-1"
              autoFocus
            />
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
            />
            <Button size="sm" onClick={handleAdd} disabled={!newLabel.trim()} className="h-8">Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-8">✕</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Add Status
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
