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

  const { favourites, isFavourite, toggleFavourite } = useFavourites();

  interface FavEntry { id: string; label: string; icon: LucideIcon; onClick: () => void; isActive: boolean }

  const favouritable: FavEntry[] = [
    ...CRM_NAV_TABS.map(tab => ({
      id: `tab:${tab.value}`,
      label: tab.label,
      icon: tab.icon,
      isActive: onCrm && activeTab === tab.value,
      onClick: () => {
        if (onSelectTab) onSelectTab(tab.value);
        else navigate(`/admin?tab=${tab.value}${isPreviewMode ? '&preview=true' : ''}`);
      },
    })),
    ...visibleTools.map(tool => ({
      id: `tool:${tool.id}`,
      label: tool.name,
      icon: tool.icon,
      isActive: pathname === tool.path,
      onClick: () => navigate(`${tool.path}${suffix}`),
    })),
    ...links
      .filter(l => !!l.path)
      .map(l => ({
        id: `link:${l.path}`,
        label: l.label,
        icon: l.icon,
        isActive: pathname === l.path,
        onClick: l.onClick,
      })),
  ];

  const favouriteEntries = favourites
    .map(id => favouritable.find(e => e.id === id))
    .filter((e): e is FavEntry => !!e);

  const StarToggle = ({ id, className = '' }: { id: string; className?: string }) => (
    <button
      type="button"
      title={isFavourite(id) ? 'Remove from favourites' : 'Add to favourites'}
      aria-label={isFavourite(id) ? 'Remove from favourites' : 'Add to favourites'}
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        toggleFavourite(id);
      }}
      className={`ml-auto shrink-0 rounded p-0.5 transition-colors ${
        isFavourite(id) ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-500'
      } ${className}`}
    >
      <Star className="w-3.5 h-3.5" fill={isFavourite(id) ? 'currentColor' : 'none'} />
    </button>
  );

  const rowClass = (isActive: boolean) =>
    `group w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    } ${navOpen ? '' : 'justify-center'}`;

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

      {favouriteEntries.length > 0 && (
        <nav className="px-2 pb-3 mb-1 space-y-1 border-b">
          {navOpen && (
            <div className="px-1 pb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Star className="w-3 h-3 text-amber-500" fill="currentColor" /> Favourites
            </div>
          )}
          {favouriteEntries.map(entry => (
            <div key={entry.id} className={rowClass(entry.isActive)}>
              <button onClick={entry.onClick} title={entry.label} className="flex items-center gap-3 min-w-0 flex-1">
                <entry.icon className="w-4 h-4 shrink-0" />
                {navOpen && <span className="truncate text-left">{entry.label}</span>}
              </button>
              {navOpen && <StarToggle id={entry.id} />}
            </div>
          ))}
        </nav>
      )}



      <nav className="px-2 pb-6 space-y-1">
        {CRM_NAV_TABS.map(tab => {
          const isActive = onCrm && activeTab === tab.value;
          const showBadge = tab.value === 'broker_referrals' && pendingReferralsCount > 0;
          return (
            <div key={tab.value} className={rowClass(isActive)}>
              <button
                onClick={() => {
                  if (onSelectTab) onSelectTab(tab.value);
                  else navigate(`/admin?tab=${tab.value}${isPreviewMode ? '&preview=true' : ''}`);
                }}
                title={tab.label}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {navOpen && <span className="truncate text-left">{tab.label}</span>}
              </button>
              {showBadge && (
                <span className="min-w-[16px] h-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1 shrink-0">
                  {pendingReferralsCount}
                </span>
              )}
              {navOpen && (
                <StarToggle
                  id={`tab:${tab.value}`}
                  className={isFavourite(`tab:${tab.value}`) ? '' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}
                />
              )}
            </div>
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
                <StarToggle id={`tool:${tool.id}`} />
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
            <div key={l.label} className={rowClass(isActive)}>
              <button onClick={l.onClick} title={l.label} className="flex items-center gap-3 min-w-0 flex-1">
                <l.icon className="w-4 h-4 shrink-0" />
                {navOpen && <span className="truncate text-left">{l.label}</span>}
              </button>
              {navOpen && !!l.path && (
                <StarToggle
                  id={`link:${l.path}`}
                  className={isFavourite(`link:${l.path}`) ? '' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}
                />
              )}
            </div>
          );
        })}
      </nav>

    </aside>
  );
}
