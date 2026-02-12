import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isPast, isToday } from 'date-fns';
import { Calendar, User, AlertTriangle } from 'lucide-react';

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
}

interface TasksKanbanProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onOpenLead?: (leadId: string) => void;
}

export function TasksKanban({ tasks, onToggleComplete, onOpenLead }: TasksKanbanProps) {
  const columns = [
    {
      key: 'overdue',
      label: 'Overdue',
      color: '#ef4444',
      filter: (t: Task) => !t.completed && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)),
    },
    {
      key: 'today',
      label: 'Due Today',
      color: '#f59e0b',
      filter: (t: Task) => !t.completed && t.due_date && isToday(new Date(t.due_date)),
    },
    {
      key: 'upcoming',
      label: 'Upcoming',
      color: '#3b82f6',
      filter: (t: Task) => !t.completed && t.due_date && !isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)),
    },
    {
      key: 'no_date',
      label: 'No Date',
      color: '#6b7280',
      filter: (t: Task) => !t.completed && !t.due_date,
    },
    {
      key: 'completed',
      label: 'Completed',
      color: '#22c55e',
      filter: (t: Task) => t.completed,
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '50vh' }}>
      {columns.map(col => {
        const colTasks = tasks.filter(col.filter);
        return (
          <div key={col.key} className="flex-shrink-0 w-64 flex flex-col">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{colTasks.length}</span>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {colTasks.map(task => (
                  <Card
                    key={task.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                    style={{ borderLeftColor: col.color }}
                    onClick={() => onOpenLead?.(task.lead_id)}
                  >
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <div onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => onToggleComplete(task)}
                            className="mt-0.5"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap pl-6">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" /> {task.lead_name}
                        </span>
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.due_date), 'dd MMM')}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {colTasks.length === 0 && (
                  <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                    No tasks
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
