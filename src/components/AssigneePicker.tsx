import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeamMembers, getInitials } from '@/hooks/useTeamMembers';
import { UserCircle2 } from 'lucide-react';

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
                {m.role === 'broker_staff' ? 'Staff' : m.role === 'super_admin' ? 'Admin' : 'Broker'}
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
      title={`Assigned to ${m.name}`}
    >
      {getInitials(m.name)}
    </div>
  );
}