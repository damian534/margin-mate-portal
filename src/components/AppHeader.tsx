import { Logo } from './Logo';
import { PreviewBanner } from './PreviewBanner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';

export function AppHeader() {
  const { user, role, signOut, isPreviewMode, isBrokerOrAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <PreviewBanner />
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate(isPreviewMode ? '/?preview=true' : '/')} className="flex items-center">
            <Logo className="h-14" />
          </button>
          <nav className="flex items-center gap-3">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const base = isBrokerOrAdmin ? '/admin' : '/dashboard';
                    navigate(isPreviewMode ? `${base}?preview=true` : base);
                  }}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
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
