import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  TrendingUp,
  Briefcase,
  ListTodo,
  Contact as ContactIcon,
  Building2,
  Users,
  Share2,
  Mail as MailIcon,
  BarChart3,
} from 'lucide-react';

export interface AdminCrmSidebarItem {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'work' | 'people' | 'insights';
  badge?: number;
}

const ITEMS: AdminCrmSidebarItem[] = [
  { value: 'leads', label: 'Leads', icon: TrendingUp, group: 'work' },
  { value: 'wip', label: 'WIP', icon: Briefcase, group: 'work' },
  { value: 'tasks', label: 'Tasks', icon: ListTodo, group: 'work' },
  { value: 'contacts', label: 'Contacts', icon: ContactIcon, group: 'people' },
  { value: 'partners', label: 'Partners', icon: Building2, group: 'people' },
  { value: 'partners_manage', label: 'Manage Partners', icon: Users, group: 'people' },
  { value: 'broker_referrals', label: 'Broker Referrals', icon: Share2, group: 'people' },
  { value: 'edm', label: 'Email Campaigns', icon: MailIcon, group: 'insights' },
  { value: 'pipeline_report', label: 'Pipeline Report', icon: BarChart3, group: 'insights' },
  { value: 'reports', label: 'Reports', icon: BarChart3, group: 'insights' },
];

const GROUP_LABELS: Record<AdminCrmSidebarItem['group'], string> = {
  work: 'My Work',
  people: 'People',
  insights: 'Insights',
};

interface AdminCrmSidebarProps {
  active: string;
  onChange: (value: string) => void;
  pendingReferralsCount?: number;
}

export function AdminCrmSidebar({ active, onChange, pendingReferralsCount = 0 }: AdminCrmSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const renderGroup = (group: AdminCrmSidebarItem['group']) => {
    const items = ITEMS.filter(i => i.group === group);
    return (
      <SidebarGroup key={group}>
        {!collapsed && <SidebarGroupLabel>{GROUP_LABELS[group]}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map(item => {
              const isActive = active === item.value;
              const badge = item.value === 'broker_referrals' ? pendingReferralsCount : 0;
              return (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    onClick={() => onChange(item.value)}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && badge > 0 && (
                      <span className="min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                        {badge}
                      </span>
                    )}
                    {collapsed && badge > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {(['work', 'people', 'insights'] as const).map(renderGroup)}
      </SidebarContent>
    </Sidebar>
  );
}
