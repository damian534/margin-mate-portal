import { LeadStatus } from '@/hooks/useLeadStatuses';
import { getStatusConfig } from '@/lib/supabase-helpers';

interface StatusBadgeProps {
  status: string;
  statuses?: LeadStatus[];
}

export function StatusBadge({ status, statuses }: StatusBadgeProps) {
  const dynamic = statuses?.find(s => s.name === status);
  const color = dynamic?.color || getStatusConfig(status).color;
  const label = dynamic?.label || getStatusConfig(status).label;

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}
