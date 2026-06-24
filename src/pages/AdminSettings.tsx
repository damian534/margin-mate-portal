import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { InviteCodeManagement } from '@/components/InviteCodeManagement';
import { UserManagement } from '@/components/UserManagement';
import { StatusSettings } from '@/components/StatusSettings';
import { CompanyManagement, Company } from '@/components/CompanyManagement';
import { DocumentTemplatesManagement } from '@/components/DocumentTemplatesManagement';
import { TaskTemplatesManagement } from '@/components/TaskTemplatesManagement';
import { LeadSourcesManagement } from '@/components/LeadSourcesManagement';
import { LendersManagement } from '@/components/LendersManagement';
import { FactFindToggle } from '@/components/FactFindToggle';
import { MilestoneEmailsManagement } from '@/components/MilestoneEmailsManagement';
import { ClaudeIntegrationSettings } from '@/components/ClaudeIntegrationSettings';
import { EmailSignatureSettings } from '@/components/EmailSignatureSettings';
import { ZapierIntegrationSettings } from '@/components/ZapierIntegrationSettings';
import { BankStatementsSettings } from '@/components/BankStatementsSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { KeyRound, UserCog, Settings2, FileText, ListChecks, Tag, Building2, ClipboardList, Mail, Bot, PenLine, Zap, Banknote } from 'lucide-react';

export default function AdminSettings() {
  const { isPreviewMode, role } = useAuth();
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
    { value: 'doc-templates', label: 'Document Templates', icon: FileText },
    { value: 'task-templates', label: 'Task Templates', icon: ListChecks },
    { value: 'lead-sources', label: 'Lead Sources', icon: Tag },
    { value: 'lenders', label: 'Lenders', icon: Building2 },
    { value: 'fact-find', label: 'Fact Find', icon: ClipboardList },
    ...(role !== 'broker_staff'
      ? [{ value: 'milestone-emails', label: 'Milestone Emails', icon: Mail }]
      : []),
    ...(role !== 'broker_staff'
      ? [{ value: 'claude', label: 'Claude Co-Work', icon: Bot }]
      : []),
    { value: 'zapier', label: 'Zapier', icon: Zap },
    { value: 'signature', label: 'Email Signature', icon: PenLine },
    { value: 'bank-statements', label: 'Bank Statements Link', icon: Banknote },
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
        {activeSection === 'doc-templates' && <DocumentTemplatesManagement />}
        {activeSection === 'task-templates' && <TaskTemplatesManagement />}
        {activeSection === 'lead-sources' && <LeadSourcesManagement />}
        {activeSection === 'lenders' && <LendersManagement />}
        {activeSection === 'fact-find' && <FactFindToggle />}
        {activeSection === 'milestone-emails' && role !== 'broker_staff' && <MilestoneEmailsManagement />}
        {activeSection === 'claude' && role !== 'broker_staff' && <ClaudeIntegrationSettings />}
        {activeSection === 'zapier' && <ZapierIntegrationSettings />}
        {activeSection === 'signature' && <EmailSignatureSettings />}
        {activeSection === 'bank-statements' && <BankStatementsSettings />}
      </main>
    </div>
  );
}
