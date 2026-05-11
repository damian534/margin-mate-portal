import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeamMembers, getInitials } from '@/hooks/useTeamMembers';
import { UserCircle2, Users, Check, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface AssigneePickerProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  className?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
}

const UNASSIGNED = '__unassigned__';

export function AssigneePicker({ value, onChange, className, placeholder = 'Unassigned', size = 'md' }: AssigneePickerProps) {
  const { members } = useTeamMembers();
  return (
    <Select
      value={value || UNASSIGNED}
      onValueChange={(v) => onChange(v === UNASSIGNED ? null : v)}
    >
      <SelectTrigger className={className || (size === 'sm' ? 'h-7 text-[11px]' : 'mt-1')}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED} className="text-xs">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <UserCircle2 className="w-3.5 h-3.5" /> Unassigned
          </span>
        </SelectItem>
        {members.map(m => (
          <SelectItem key={m.user_id} value={m.user_id} className="text-xs">
            <span className="inline-flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                {getInitials(m.name)}
              </span>
              {m.name}
              <span className="text-[10px] text-muted-foreground">
                {m.role === 'broker_staff' ? 'Assistant' : m.role === 'super_admin' ? 'Admin' : 'Broker'}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface AssigneeBadgeProps {
  userId: string | null;
  className?: string;
}

/** Compact circular avatar showing the assignee's initials, or a faded placeholder. */
export function AssigneeBadge({ userId, className }: AssigneeBadgeProps) {
  const { members } = useTeamMembers();
  const m = userId ? members.find(x => x.user_id === userId) : null;
  if (!m) {
    return (
      <div
        className={`w-5 h-5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground/60 flex items-center justify-center ${className || ''}`}
        title="Unassigned"
      >
        <UserCircle2 className="w-3 h-3" />
      </div>
    );
  }
  return (
    <div
      className={`w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold flex items-center justify-center ${className || ''}`}
      title={`Assistant: ${m.name}`}
    >
      {getInitials(m.name)}
    </div>
  );
}

interface AssigneeFilterProps {
  value: string[]; // empty = all; may include '__unassigned__' or user_ids
  onChange: (v: string[]) => void;
  className?: string;
}

/** Multi-select dropdown filter to narrow lead/WIP lists by assigned team members. */
export function AssigneeFilter({ value, onChange, className }: AssigneeFilterProps) {
  const { members } = useTeamMembers();
  const selected = Array.isArray(value) ? value : [];
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(v => v !== id));
    else onChange([...selected, id]);
  };
  const label = (() => {
    if (selected.length === 0) return 'All Assistants';
    if (selected.length === 1) {
      const id = selected[0];
      if (id === '__unassigned__') return 'Unassigned';
      const m = members.find(x => x.user_id === id);
      return m?.name ?? '1 selected';
    }
    return `${selected.length} selected`;
  })();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`${className || 'w-full sm:w-52'} justify-between font-normal`}
        >
          <span className="inline-flex items-center gap-2 truncate">
            <Users className="w-4 h-4" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">Filter assistants</span>
          {selected.length > 0 && (
            <button
              type="button"
              className="text-[11px] text-primary hover:underline"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          <button
            type="button"
            onClick={() => toggle('__unassigned__')}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent text-left"
          >
            <span className="w-4 h-4 flex items-center justify-center">
              {selected.includes('__unassigned__') && <Check className="w-3.5 h-3.5" />}
            </span>
            <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Unassigned</span>
          </button>
          {members.map(m => (
            <button
              key={m.user_id}
              type="button"
              onClick={() => toggle(m.user_id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent text-left"
            >
              <span className="w-4 h-4 flex items-center justify-center">
                {selected.includes(m.user_id) && <Check className="w-3.5 h-3.5" />}
              </span>
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                {getInitials(m.name)}
              </span>
              <span className="truncate">{m.name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {m.role === 'broker_staff' ? 'Assistant' : m.role === 'super_admin' ? 'Admin' : 'Broker'}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}