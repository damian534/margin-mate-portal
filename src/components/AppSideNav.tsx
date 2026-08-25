import { useNavigate, useLocation } from 'react-router-dom';
import {
  TrendingUp, Briefcase, ListTodo, Contact as ContactIcon, Building2, Share2,
  Mail as MailIcon, BarChart3, Wrench, Landmark, Settings2, LogOut,
  PanelLeftClose, PanelLeftOpen, ChevronDown, Star, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useFavourites } from '@/hooks/useFavourites';
import { TOOLS } from '@/lib/toolsCatalog';
import { useToolVisibility } from '@/hooks/useToolVisibility';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';



export const CRM_NAV_TABS = [
  { value: 'leads', label: 'Leads', icon: TrendingUp },
  { value: 'wip', label: 'WIP', icon: Briefcase },
  { value: 'tasks', label: 'Tasks', icon: ListTodo },
  { value: 'contacts', label: 'Contacts', icon: ContactIcon },
  { value: 'partners', label: 'Partners', icon: Building2 },
  { value: 'broker_referrals', label: 'Broker Referrals', icon: Share2 },
  { value: 'edm', label: 'Email Campaigns', icon: MailIcon },
  { value: 'pipeline_report', label: 'Pipeline Report', icon: BarChart3 },
  { value: 'reports', label: 'Reports', icon: BarChart3 },
];

interface AppSideNavProps {
  /** Provided by the CRM page so tab clicks switch in-place instead of navigating. */
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  pendingReferralsCount?: number;
}

export function AppSideNav({ activeTab, onSelectTab, pendingReferralsCount = 0 }: AppSideNavProps) {
  const [navOpen, setNavOpen] = usePersistedState<boolean>('crm.nav.open', true);
  const { signOut, isPreviewMode, isBrokerOrAdmin, role } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isToolEnabled } = useToolVisibility();

  const suffix = isPreviewMode ? '?preview=true' : '';
  const onCrm = pathname === '/admin';
  const isSuperAdmin = role === 'super_admin';

  const visibleTools = TOOLS.filter(
    t => (isSuperAdmin || isToolEnabled(t.id)) && (!t.brokerOnly || isBrokerOrAdmin),
  );
  const onTools = pathname.startsWith('/tools');

  const links = [
    ...(isBrokerOrAdmin
      ? [
          { label: 'Settlements', icon: Landmark, path: '/admin/settlements', onClick: () => navigate(`/admin/settlements${suffix}`) },
          { label: 'Settings', icon: Settings2, path: '/admin/settings', onClick: () => navigate(`/admin/settings${suffix}`) },
        ]
      : []),
    ...(!isPreviewMode ? [{ label: 'Sign Out', icon: LogOut, path: '', onClick: signOut }] : []),
  ];


  return (
    <aside
      className={`sticky top-0 shrink-0 border-r bg-card min-h-[calc(100vh-1px)] transition-all duration-200 ${navOpen ? 'w-56' : 'w-16'}`}
    >
      <div className="flex items-center justify-between px-3 py-3">
        {navOpen && <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Menu</span>}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 ml-auto"
          onClick={() => setNavOpen(!navOpen)}
          aria-label={navOpen ? 'Collapse menu' : 'Expand menu'}
        >
          {navOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </Button>
      </div>

      <nav className="px-2 pb-6 space-y-1">
        {CRM_NAV_TABS.map(tab => {
          const isActive = onCrm && activeTab === tab.value;
          const showBadge = tab.value === 'broker_referrals' && pendingReferralsCount > 0;
          return (
            <button
              key={tab.value}
              onClick={() => {
                if (onSelectTab) onSelectTab(tab.value);
                else navigate(`/admin?tab=${tab.value}${isPreviewMode ? '&preview=true' : ''}`);
              }}
              title={tab.label}
              className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${navOpen ? '' : 'justify-center'}`}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              {navOpen && <span className="truncate">{tab.label}</span>}
              {showBadge && (
                <span className={`min-w-[16px] h-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 ${navOpen ? 'ml-auto' : 'absolute'}`}>
                  {pendingReferralsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <nav className="px-2 pb-6 space-y-1 border-t pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Tools"
              className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                onTools ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${navOpen ? '' : 'justify-center'}`}
            >
              <Wrench className="w-4 h-4 shrink-0" />
              {navOpen && (
                <>
                  <span className="truncate">Tools</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-auto shrink-0 opacity-60" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-72">
            <DropdownMenuLabel>Tools</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {visibleTools.map(tool => (
              <DropdownMenuItem key={tool.id} onSelect={() => navigate(`${tool.path}${suffix}`)}>
                <tool.icon className="w-4 h-4 mr-2 shrink-0 text-primary" />
                <span className="truncate">{tool.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate(`/tools${suffix}`)}>
              <Wrench className="w-4 h-4 mr-2 shrink-0" />
              All tools
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>


        {links.map(l => {
          const isActive = !!l.path && pathname === l.path;
          return (
            <button
              key={l.label}
              onClick={l.onClick}
              title={l.label}
              className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${navOpen ? '' : 'justify-center'}`}
            >
              <l.icon className="w-4 h-4 shrink-0" />
              {navOpen && <span className="truncate">{l.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
