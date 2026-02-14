import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { InviteCodeManagement } from '@/components/InviteCodeManagement';
import { UserManagement } from '@/components/UserManagement';
import { StatusSettings } from '@/components/StatusSettings';
import { CompanyManagement, Company } from '@/components/CompanyManagement';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { KeyRound, UserCog, Settings2 } from 'lucide-react';

export default function AdminSettings() {
  const { isPreviewMode } = useAuth();
  const [activeSection, setActiveSection] = useState('invites');
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (!isPreviewMode) {
      fetchCompanies();
    }
  }, [isPreviewMode]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('name');
    setCompanies((data as Company[]) || []);
  };

  const fetchReferrers = async () => {
    // Stub — UserManagement handles its own data
  };

  const sections = [
    { value: 'invites', label: 'Invite Codes', icon: KeyRound },
    { value: 'users', label: 'User Management', icon: UserCog },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Settings2 className="w-7 h-7" /> Settings
          </h1>
          <p className="text-muted-foreground">Manage invites, users, and system configuration</p>
        </div>

        {/* Section Nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sections.map((section) => (
            <button
              key={section.value}
              onClick={() => setActiveSection(section.value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-sm font-medium transition-all
                ${activeSection === section.value
                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
            >
              <section.icon className="w-5 h-5" />
              <span className="text-xs">{section.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeSection === 'invites' && <InviteCodeManagement />}
        {activeSection === 'users' && (
          <UserManagement companies={companies} onRefreshReferrers={fetchReferrers} />
        )}
      </main>
    </div>
  );
}
