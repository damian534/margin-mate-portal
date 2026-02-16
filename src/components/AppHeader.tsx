import { Logo } from './Logo';
import { PreviewBanner } from './PreviewBanner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Wrench, Settings2, Landmark } from 'lucide-react';

export function AppHeader() {
  const { user, role, signOut, isPreviewMode, isBrokerOrAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <PreviewBanner />
      <header className="border-b bg-card py-4">
        <div className="container flex items-center justify-between">
          <button onClick={() => {
            const suffix = isPreviewMode ? '?preview=true' : '';
            navigate(`/${suffix}`);
          }} className="flex items-center">
            <Logo className="h-32" />
          </button>
          <nav className="flex items-center gap-3">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
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
                  variant="ghost"
                  size="sm"
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
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const suffix = isPreviewMode ? '?preview=true' : '';
                        navigate(`/admin/settlements${suffix}`);
                      }}
                    >
                      <Landmark className="w-4 h-4 mr-2" />
                      Settlements
                    </Button>
                    {role !== 'broker_staff' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const suffix = isPreviewMode ? '?preview=true' : '';
                          navigate(`/admin/settings${suffix}`);
                        }}
                      >
                        <Settings2 className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    )}
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
