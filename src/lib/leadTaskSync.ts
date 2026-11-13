export interface DashboardTask {
  id: string;
  lead_id: string;
  due_date: string | null;
  completed: boolean;
}

// Replace only the edited deal's snapshot; preserve tasks on other boards.
export function replaceLeadTasks<T extends DashboardTask>(current: T[], leadId: string, saved: T[]): T[] {
  return [...current.filter(task => task.lead_id !== leadId), ...saved.filter(task => task.lead_id === leadId)];
}