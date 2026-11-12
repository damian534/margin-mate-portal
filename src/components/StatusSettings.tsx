import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Settings, Plus, Trash2, GripVertical, Pencil } from 'lucide-react';
import { LeadStatus } from '@/hooks/useLeadStatuses';

export interface BoardOption { value: string; label: string }

interface StatusSettingsProps {
  statuses: LeadStatus[];
  onAdd: (name: string, label: string, color: string, dashboard?: string) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<Pick<LeadStatus, 'label' | 'color' | 'name' | 'amber_after_days' | 'red_after_days' | 'dashboard'>>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReorder: (reordered: LeadStatus[]) => Promise<boolean>;
  title?: string;
  triggerLabel?: string;
  /** Boards a status can be assigned to; the first option is the default for new statuses. */
  boardOptions?: BoardOption[];
  /** Statuses from another list shown on this board (e.g. WIP stages on Leads); reorderable here, edited in their own list. */
  linkedStatuses?: LeadStatus[];
  linkedLabel?: string;
  onReorderLinked?: (reordered: LeadStatus[]) => Promise<boolean>;
}

export function StatusSettings({ statuses, onAdd, onUpdate, onDelete, onReorder, title = 'Lead Statuses', triggerLabel = 'Manage Statuses', boardOptions, linkedStatuses, linkedLabel = 'WIP stage', onReorderLinked }: StatusSettingsProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [newBoard, setNewBoard] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editAmber, setEditAmber] = useState('4');
  const [editRed, setEditRed] = useState('7');
  const [editBoard, setEditBoard] = useState('');

  const defaultBoard = boardOptions?.[0]?.value || 'leads';
  const boardLabel = (value: string | null | undefined) =>
    boardOptions?.find(o => o.value === (value || defaultBoard))?.label || value || defaultBoard;

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    const name = newLabel.trim().toLowerCase().replace(/\s+/g, '_');
    const ok = await onAdd(name, newLabel.trim(), newColor, newBoard || defaultBoard);
    if (ok) {
      toast.success('Status added');
      setNewLabel('');
      setNewColor('#6b7280');
      setNewBoard('');
      setAdding(false);
    } else {
      toast.error('Failed to add status');
    }
  };

  const handleUpdate = async (id: string) => {
    const name = editLabel.trim().toLowerCase().replace(/\s+/g, '_');
    const amber = Math.max(1, parseInt(editAmber) || 4);
    const red = Math.max(amber + 1, parseInt(editRed) || 7);
    const ok = await onUpdate(id, { label: editLabel.trim(), color: editColor, name, amber_after_days: amber, red_after_days: red, ...(boardOptions ? { dashboard: editBoard || defaultBoard } : {}) });
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

  const linkedIds = new Set((linkedStatuses || []).map(s => s.id));
  const rows: LeadStatus[] = linkedStatuses?.length
    ? [...statuses, ...linkedStatuses].map((s, i) => ({ s, i })).sort((a, b) => ((a.s.display_order ?? 0) - (b.s.display_order ?? 0)) || (a.i - b.i)).map(x => x.s)
    : statuses;
  const moveStatus = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rows.length) return;
    const reordered = [...rows];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    const numbered = reordered.map((s, i) => ({ ...s, display_order: i }));
    const own = numbered.filter(s => !linkedIds.has(s.id));
    const linked = numbered.filter(s => linkedIds.has(s.id));
    const ok = (await onReorder(own)) && (linked.length && onReorderLinked ? await onReorderLinked(linked) : true);
    if (!ok) toast.error('Failed to save status order');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-1" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {rows.map((status, index) => (
            <div key={status.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveStatus(index, -1)}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none"
                >▲</button>
                <button
                  onClick={() => moveStatus(index, 1)}
                  disabled={index === rows.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs leading-none"
                >▼</button>
              </div>

              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: editingId === status.id ? editColor : status.color }} />

              {editingId === status.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="shrink-0">Aging (business days):</span>
                    <label className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-warning inline-block" />
                      <Input
                        type="number" min={1} value={editAmber}
                        onChange={e => setEditAmber(e.target.value)}
                        className="h-7 w-14 text-xs px-1.5"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                      <Input
                        type="number" min={2} value={editRed}
                        onChange={e => setEditRed(e.target.value)}
                        className="h-7 w-14 text-xs px-1.5"
                      />
                    </label>
                  </div>
                  {boardOptions && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="shrink-0">Show in:</span>
                      <Select value={editBoard || defaultBoard} onValueChange={setEditBoard}>
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {boardOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{status.label}</span>
                  {linkedIds.has(status.id) ? (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-1.5 py-0.5 shrink-0">{linkedLabel}</span>
                  ) : boardOptions && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-1.5 py-0.5 shrink-0">{boardLabel(status.dashboard)}</span>
                  )}
                  {!linkedIds.has(status.id) && (<>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      setEditingId(status.id);
                      setEditLabel(status.label);
                      setEditColor(status.color);
                      setEditAmber(String(status.amber_after_days ?? 4));
                      setEditRed(String(status.red_after_days ?? 7));
                      setEditBoard(status.dashboard || defaultBoard);
                    }}
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
                  </>)}
                </>
              )}
            </div>
          ))}
        </div>

        {adding ? (
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-dashed">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: newColor }} />
            <Input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Status name..."
              className="h-8 text-sm flex-1 min-w-28"
              autoFocus
            />
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
            />
            {boardOptions && (
              <Select value={newBoard || defaultBoard} onValueChange={setNewBoard}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {boardOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
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
