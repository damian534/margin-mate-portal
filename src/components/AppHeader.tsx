import { Logo } from './Logo';
import { PreviewBanner } from './PreviewBanner';
import { GlobalClientSearch } from './GlobalClientSearch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, Wrench, Settings2, Landmark } from 'lucide-react';

export function AppHeader() {
  const { user, role, signOut, isPreviewMode, isBrokerOrAdmin } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isAdminTeam = isBrokerOrAdmin || role === 'broker_staff';
  // The CRM dashboard has its own side navigation — avoid duplicating links up here.
  const hideNavLinks = pathname === '/admin';

  const navBtn = "h-9 px-3 rounded-md border border-border bg-background hover:bg-muted hover:text-foreground transition-colors";

  return (
    <>
      <PreviewBanner />
      <header className="border-b bg-card py-4">
        <div className="container flex items-center gap-4 justify-between">
          <button onClick={() => {
            const suffix = isPreviewMode ? '?preview=true' : '';
            navigate(`/${suffix}`);
          }} className="flex items-center shrink-0">
            <Logo className="h-32" />
          </button>
          {user && isAdminTeam && (
            <div className="hidden md:block flex-1 max-w-md">
              <GlobalClientSearch />
            </div>
          )}
          <nav className="flex items-center gap-2">

            {user ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className={navBtn}
                  onClick={() => {
                    const base = isBrokerOrAdmin ? '/admin' : '/dashboard';
                    const suffix = isPreviewMode ? '?preview=true' : '';
                    navigate(`${base}${suffix}`);
                  }}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={navBtn}
                  onClick={() => {
                    const suffix = isPreviewMode ? '?preview=true' : '';
                    navigate(`/tools${suffix}`);
                  }}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Tools
                </Button>
                {isBrokerOrAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className={navBtn}
                      onClick={() => {
                        const suffix = isPreviewMode ? '?preview=true' : '';
                        navigate(`/admin/settlements${suffix}`);
                      }}
                    >
                      <Landmark className="w-4 h-4 mr-2" />
                      Settlements
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={navBtn}
                        onClick={() => {
                          const suffix = isPreviewMode ? '?preview=true' : '';
                          navigate(`/admin/settings${suffix}`);
                        }}
                      >
                        <Settings2 className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                  </>
                )}
                {!isPreviewMode && (
                  <Button variant="outline" size="sm" onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Register
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
