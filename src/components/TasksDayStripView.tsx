import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format, isSameDay, startOfDay, addDays, isToday, isPast } from 'date-fns';
import { Calendar as CalendarIcon, User, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
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
}

interface Props {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onOpenLead?: (leadId: string) => void;
}

function urgencyColor(task: Task): { dot: string; pill: string; label: string } {
  if (!task.due_date) return { dot: 'bg-muted-foreground', pill: 'bg-muted text-foreground', label: 'No date' };
  const d = new Date(task.due_date);
  if (isToday(d)) return { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-900 border-amber-200', label: 'Today' };
  if (isPast(d)) return { dot: 'bg-red-500', pill: 'bg-red-50 text-red-900 border-red-200', label: 'Overdue' };
  return { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-900 border-emerald-200', label: 'Upcoming' };
}

export function TasksDayStripView({ tasks, onToggleComplete, onOpenLead }: Props) {
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)), [anchor]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    days.forEach(d => map.set(d.toDateString(), []));
    const overdue: Task[] = [];
    tasks.forEach(t => {
      if (!t.due_date) return;
      const d = startOfDay(new Date(t.due_date));
      const key = d.toDateString();
      if (map.has(key)) {
        map.get(key)!.push(t);
      } else if (isPast(d) && !isToday(d) && isSameDay(anchor, startOfDay(new Date()))) {
        // surface overdue under Today when viewing current week
        overdue.push(t);
      }
    });
    if (overdue.length) {
      const todayKey = startOfDay(new Date()).toDateString();
      if (map.has(todayKey)) map.set(todayKey, [...overdue, ...(map.get(todayKey) || [])]);
    }
    return map;
  }, [tasks, days, anchor]);

  const noDateTasks = useMemo(() => tasks.filter(t => !t.due_date), [tasks]);

  const selectedKey = selectedDay.toDateString();
  const rawSelectedTasks = tasksByDay.get(selectedKey) || [];
  const isSelectedToday = isToday(selectedDay);

  // Priority sort: overdue first, then today by time, then upcoming by time, then no-time last
  const priorityRank = (t: Task): number => {
    if (!t.due_date) return 3;
    const d = new Date(t.due_date);
    if (isPast(d) && !isToday(d)) return 0; // overdue
    if (isToday(d)) return 1;
    return 2;
  };
  const selectedTasks = [...rawSelectedTasks].sort((a, b) => {
    const ra = priorityRank(a);
    const rb = priorityRank(b);
    if (ra !== rb) return ra - rb;
    const ta = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
    return ta - tb;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-4">
      {/* My Day — focused list */}
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                {isSelectedToday ? 'My Day' : format(selectedDay, 'EEEE')}
              </p>
              <h3 className="text-lg font-semibold leading-tight">
                {format(selectedDay, 'EEEE, d MMMM')}
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedTasks.length} {selectedTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <ScrollArea className="h-[55vh] pr-2">
            <div className="space-y-2">
              {selectedTasks.length === 0 && (
                <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
                  Nothing scheduled for this day
                </div>
              )}
              {selectedTasks.map((task, idx) => {
                const u = urgencyColor(task);
                return (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                    style={{}}
                    onClick={() => onOpenLead?.(task.lead_id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-foreground text-xs font-semibold inline-flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <div onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => onToggleComplete(task)}
                            className="mt-0.5"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded border ${u.pill}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
                              {u.label}
                            </span>
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(task.due_date), 'HH:mm') !== '00:00'
                                  ? format(new Date(task.due_date), 'HH:mm')
                                  : 'All day'}
                              </span>
                            )}
                          </div>
                          <p className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="w-3 h-3" /> {task.lead_name}
                            </span>
                          </div>
                        </div>
                        <AssigneeBadge userId={task.assigned_to ?? null} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 7-day strip */}
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Week ahead
              </p>
              <h3 className="text-sm font-semibold">
                {format(days[0], 'd MMM')} – {format(days[6], 'd MMM')}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnchor(addDays(anchor, -7))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { const t = startOfDay(new Date()); setAnchor(t); setSelectedDay(t); }}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAnchor(addDays(anchor, 7))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {days.map(d => {
              const dayTasks = tasksByDay.get(d.toDateString()) || [];
              const isSel = isSameDay(d, selectedDay);
              const isCurrent = isToday(d);
              const overdueCount = dayTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))).length;
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDay(d)}
                  className={`w-full text-left rounded-lg border transition-colors px-3 py-2.5 flex items-center gap-3 ${
                    isSel ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-muted/50'
                  }`}
                >
                  <div className={`flex flex-col items-center justify-center w-10 h-10 rounded-md flex-shrink-0 ${
                    isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}>
                    <span className="text-[10px] uppercase font-medium leading-none">{format(d, 'EEE')}</span>
                    <span className="text-sm font-semibold leading-none mt-0.5">{format(d, 'd')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                      {overdueCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-2.5 h-2.5" /> {overdueCount}
                        </span>
                      )}
                    </div>
                    {dayTasks.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {dayTasks.slice(0, 2).map(t => t.title).join(' · ')}
                        {dayTasks.length > 2 ? ` +${dayTasks.length - 2}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {dayTasks.slice(0, 4).map(t => (
                      <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${urgencyColor(t).dot}`} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {noDateTasks.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border/60">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5">
                Unscheduled
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarIcon className="w-3 h-3" />
                {noDateTasks.length} {noDateTasks.length === 1 ? 'task without' : 'tasks without'} a date
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}