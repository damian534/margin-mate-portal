import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { Calendar, User, AlertTriangle, Flame, Sunrise, CalendarDays, CalendarX2 } from 'lucide-react';
import { AssigneeBadge } from '@/components/AssigneePicker';

interface Task {
  id: string;
  lead_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  lead_name?: string;
  assigned_to?: string | null;
  priority?: number | null;
}

interface MyDayPanelProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onOpenLead?: (leadId: string) => void;
  onUpdatePriority: (taskId: string, priority: number | null) => void;
}

function categorize(task: Task): 'overdue' | 'today' | 'tomorrow' | 'later' | 'no_date' {
  if (!task.due_date) return 'no_date';
  const d = new Date(task.due_date);
  if (isToday(d)) return 'today';
  if (isTomorrow(d)) return 'tomorrow';
  if (isPast(d)) return 'overdue';
  return 'later';
}

function PriorityInput({ value, max, onChange }: { value: number | null; max: number; onChange: (n: number | null) => void }) {
  const [local, setLocal] = useState<string>(value != null ? String(value) : '');
  useEffect(() => { setLocal(value != null ? String(value) : ''); }, [value]);

  const commit = () => {
    const trimmed = local.trim();
    if (trimmed === '') { onChange(null); return; }
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n) || n < 1) { onChange(null); return; }
    onChange(Math.min(n, Math.max(max, 99)));
  };

  return (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      onClick={(e) => e.stopPropagation()}
      placeholder="–"
      title="Set priority (1 = most important)"
      className="h-9 w-9 px-0 text-center font-semibold text-sm rounded-md"
    />
  );
}

function TaskRow({
  task,
  onToggleComplete,
  onOpenLead,
  priorityControl,
  emphasis,
}: {
  task: Task;
  onToggleComplete: (t: Task) => void;
  onOpenLead?: (id: string) => void;
  priorityControl?: React.ReactNode;
  emphasis?: 'overdue' | 'today' | 'normal';
}) {
  const cat = categorize(task);
  const overdue = emphasis === 'overdue' || (cat === 'overdue' && !task.completed);
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-sm ${task.completed ? 'opacity-60' : ''} ${overdue ? 'border-destructive/40 bg-destructive/[0.02]' : ''}`}
      onClick={() => onOpenLead?.(task.lead_id)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        {priorityControl ? (
          <div onClick={(e) => e.stopPropagation()}>{priorityControl}</div>
        ) : (
          <div className="w-9 flex justify-center text-xs text-muted-foreground">
            {task.due_date ? format(new Date(task.due_date), 'HH:mm') : '—'}
          </div>
        )}
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={task.completed} onCheckedChange={() => onToggleComplete(task)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm leading-tight ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.lead_name}</span>
            {task.due_date && (
              <span className={`flex items-center gap-1 ${overdue ? 'text-destructive font-medium' : ''}`}>
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), 'dd MMM, HH:mm')}
              </span>
            )}
          </div>
        </div>
        <AssigneeBadge userId={task.assigned_to ?? null} />
      </CardContent>
    </Card>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  tone,
  count,
  children,
  emptyLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  tone: 'destructive' | 'primary' | 'muted' | 'success';
  count: number;
  children: React.ReactNode;
  emptyLabel: string;
}) {
  const toneClass: Record<string, string> = {
    destructive: 'text-destructive',
    primary: 'text-primary',
    muted: 'text-muted-foreground',
    success: 'text-emerald-600',
  };
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${toneClass[tone]}`} />
          <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {count === 0 ? (
        <p className="text-xs text-muted-foreground italic px-1 py-2">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

export function MyDayPanel({ tasks, onToggleComplete, onOpenLead, onUpdatePriority }: MyDayPanelProps) {
  const active = tasks.filter(t => !t.completed);

  const groups = useMemo(() => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const tomorrow: Task[] = [];
    const later: Task[] = [];
    const noDate: Task[] = [];
    for (const t of active) {
      const c = categorize(t);
      if (c === 'overdue') overdue.push(t);
      else if (c === 'today') today.push(t);
      else if (c === 'tomorrow') tomorrow.push(t);
      else if (c === 'later') later.push(t);
      else noDate.push(t);
    }
    const byPriority = (a: Task, b: Task) => {
      const pa = a.priority ?? Number.POSITIVE_INFINITY;
      const pb = b.priority ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      const da = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const db = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      return da - db;
    };
    today.sort(byPriority);
    overdue.sort(byPriority);
    tomorrow.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    later.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    return { overdue, today, tomorrow, later, noDate };
  }, [active]);

  // Reorder helper: when user sets task X to priority N, push others down.
  const setTodayPriority = (taskId: string, newPriority: number | null) => {
    if (newPriority == null) { onUpdatePriority(taskId, null); return; }
    const list = [...groups.today].sort((a, b) => {
      const pa = a.priority ?? Number.POSITIVE_INFINITY;
      const pb = b.priority ?? Number.POSITIVE_INFINITY;
      return pa - pb;
    });
    const target = list.find(t => t.id === taskId);
    if (!target) return;
    const others = list.filter(t => t.id !== taskId);
    const clampedPos = Math.min(Math.max(newPriority, 1), others.length + 1);
    others.splice(clampedPos - 1, 0, target);
    others.forEach((t, idx) => {
      const desired = idx + 1;
      if ((t.priority ?? null) !== desired) onUpdatePriority(t.id, desired);
    });
  };

  const todayCount = groups.today.length;
  const todayLabel = format(new Date(), 'EEEE, d MMMM');

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Hero */}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">My Day</p>
        <h2 className="text-3xl font-semibold tracking-tight">{todayLabel}</h2>
        <p className="text-sm text-muted-foreground">
          {todayCount === 0
            ? 'No tasks scheduled for today.'
            : `${todayCount} task${todayCount === 1 ? '' : 's'} to focus on — set a number 1–${todayCount} to reorder by priority.`}
        </p>
      </div>

      {/* Overdue */}
      {groups.overdue.length > 0 && (
        <Section
          icon={AlertTriangle}
          title="Overdue"
          tone="destructive"
          count={groups.overdue.length}
          emptyLabel="Nothing overdue — nice."
        >
          {groups.overdue.map(t => (
            <TaskRow key={t.id} task={t} onToggleComplete={onToggleComplete} onOpenLead={onOpenLead} emphasis="overdue" />
          ))}
        </Section>
      )}

      {/* Today with priority */}
      <Section
        icon={Flame}
        title="Today"
        tone="primary"
        count={groups.today.length}
        emptyLabel="Nothing scheduled for today."
      >
        {groups.today.map(t => (
          <TaskRow
            key={t.id}
            task={t}
            onToggleComplete={onToggleComplete}
            onOpenLead={onOpenLead}
            emphasis="today"
            priorityControl={
              <PriorityInput
                value={t.priority ?? null}
                max={groups.today.length}
                onChange={(n) => setTodayPriority(t.id, n)}
              />
            }
          />
        ))}
      </Section>

      {/* Tomorrow */}
      <Section
        icon={Sunrise}
        title="Tomorrow"
        tone="muted"
        count={groups.tomorrow.length}
        emptyLabel="Nothing booked for tomorrow yet."
      >
        {groups.tomorrow.map(t => (
          <TaskRow key={t.id} task={t} onToggleComplete={onToggleComplete} onOpenLead={onOpenLead} />
        ))}
      </Section>

      {/* Later */}
      {groups.later.length > 0 && (
        <Section
          icon={CalendarDays}
          title="Coming up"
          tone="muted"
          count={groups.later.length}
          emptyLabel="Nothing further out."
        >
          {groups.later.slice(0, 8).map(t => (
            <TaskRow key={t.id} task={t} onToggleComplete={onToggleComplete} onOpenLead={onOpenLead} />
          ))}
          {groups.later.length > 8 && (
            <p className="text-xs text-muted-foreground text-center pt-1">+ {groups.later.length - 8} more upcoming</p>
          )}
        </Section>
      )}

      {/* No date */}
      {groups.noDate.length > 0 && (
        <Section
          icon={CalendarX2}
          title="No date"
          tone="muted"
          count={groups.noDate.length}
          emptyLabel="Everything has a date."
        >
          {groups.noDate.slice(0, 6).map(t => (
            <TaskRow key={t.id} task={t} onToggleComplete={onToggleComplete} onOpenLead={onOpenLead} />
          ))}
          {groups.noDate.length > 6 && (
            <p className="text-xs text-muted-foreground text-center pt-1">+ {groups.noDate.length - 6} more unscheduled</p>
          )}
        </Section>
      )}
    </div>
  );
}
