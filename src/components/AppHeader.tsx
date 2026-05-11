import { Logo } from './Logo';
import { PreviewBanner } from './PreviewBanner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Wrench, Settings2, Landmark, Calendar as CalendarIcon, Bot } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AppHeader() {
  const { user, role, signOut, isPreviewMode, isBrokerOrAdmin } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const isAdminTeam = isBrokerOrAdmin || role === 'broker_staff';

  const triggerClaude = async () => {
    if (isPreviewMode) {
      toast.info('Preview mode — webhook not actually fired');
      return;
    }
    setProcessing(true);
    const { data, error } = await supabase.functions.invoke('trigger-claude-inbox', { body: {} });
    setProcessing(false);
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    toast.success('Claude is processing the inbox 🤖');
  };

  const navBtn = "h-9 px-3 rounded-md border border-border bg-background hover:bg-muted hover:text-foreground transition-colors";

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
                {isAdminTeam && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={navBtn}
                    onClick={triggerClaude}
                    disabled={processing}
                    title="Tell Claude Co-Work to process the inbox"
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    {processing ? 'Sending…' : 'Process Inbox'}
                  </Button>
                )}
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
                          const base = isBrokerOrAdmin ? '/admin' : '/dashboard';
                          const suffix = isPreviewMode ? '?preview=true&tab=calendar' : '?tab=calendar';
                          navigate(`${base}${suffix}`);
                        }}
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Calendar
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
