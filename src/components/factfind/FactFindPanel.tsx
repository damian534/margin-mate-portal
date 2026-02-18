import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FactFindSection } from './FactFindSection';
import { FACT_FIND_SECTIONS } from './fact-find-config';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Link2, Copy, CheckCircle2, User, Briefcase, DollarSign, Home, CreditCard, Receipt, Target } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  User: <User className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  DollarSign: <DollarSign className="w-4 h-4" />,
  Home: <Home className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  Receipt: <Receipt className="w-4 h-4" />,
  Target: <Target className="w-4 h-4" />,
};

interface FactFindPanelProps {
  leadId: string;
  isPreviewMode: boolean;
}

interface SectionData {
  section: string;
  data: Record<string, any>;
  completed: boolean;
}

export function FactFindPanel({ leadId, isPreviewMode }: FactFindPanelProps) {
  const [sections, setSections] = useState<Record<string, SectionData>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [portalLink, setPortalLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetchData();
    fetchPortalLink();
  }, [leadId]);

  const fetchData = async () => {
    if (isPreviewMode) {
      const preview: Record<string, SectionData> = {};
      FACT_FIND_SECTIONS.forEach(s => {
        preview[s.key] = { section: s.key, data: {}, completed: false };
      });
      setSections(preview);
      return;
    }
    const { data } = await supabase
      .from('fact_find_responses')
      .select('*')
      .eq('lead_id', leadId);

    const map: Record<string, SectionData> = {};
    FACT_FIND_SECTIONS.forEach(s => {
      const existing = (data as any[])?.find(d => d.section === s.key);
      map[s.key] = {
        section: s.key,
        data: existing?.data ?? {},
        completed: existing?.completed ?? false,
      };
    });
    setSections(map);
  };

  const fetchPortalLink = async () => {
    if (isPreviewMode) return;
    const { data } = await supabase
      .from('client_portal_tokens')
      .select('token')
      .eq('lead_id', leadId)
      .eq('is_active', true)
      .limit(1)
      .single();
    if (data) {
      setPortalLink(`${window.location.origin}/client-portal/${(data as any).token}`);
    }
  };

  const saveSection = async (sectionKey: string) => {
    const sectionData = sections[sectionKey];
    if (!sectionData) return;

    setSaving(sectionKey);
    if (!isPreviewMode) {
      const { error } = await supabase
        .from('fact_find_responses')
        .upsert({
          lead_id: leadId,
          section: sectionKey,
          data: sectionData.data as any,
          completed: sectionData.completed,
          updated_by: 'broker',
        }, { onConflict: 'lead_id,section' });
      if (error) { toast.error('Failed to save'); setSaving(null); return; }
    }
    toast.success('Section saved');
    setSaving(null);
  };

  const toggleComplete = async (sectionKey: string) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], completed: !prev[sectionKey].completed },
    }));
  };

  const updateSectionData = (sectionKey: string, data: Record<string, any>) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], data },
    }));
  };

  const generatePortalLink = async () => {
    if (isPreviewMode) {
      setPortalLink(`${window.location.origin}/client-portal/preview-token-123`);
      toast.success('Portal link generated (preview)');
      return;
    }
    setGeneratingLink(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('client_portal_tokens')
      .insert({ lead_id: leadId, created_by: userData?.user?.id })
      .select('token')
      .single();
    if (error) { toast.error('Failed to generate link'); setGeneratingLink(false); return; }
    const link = `${window.location.origin}/client-portal/${(data as any).token}`;
    setPortalLink(link);
    setGeneratingLink(false);
    toast.success('Client portal link generated');
  };

  const copyLink = () => {
    if (portalLink) {
      navigator.clipboard.writeText(portalLink);
      setLinkCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const completedCount = Object.values(sections).filter(s => s.completed).length;
  const totalSections = FACT_FIND_SECTIONS.length;
  const progress = totalSections > 0 ? (completedCount / totalSections) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Fact Find Progress</span>
          <span className="text-muted-foreground">{completedCount}/{totalSections} sections</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Client portal link */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client Portal Link</p>
        {portalLink ? (
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-background rounded p-2 border truncate">{portalLink}</code>
            <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0 gap-1.5">
              {linkCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {linkCopied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={generatePortalLink} disabled={generatingLink}>
            <Link2 className="w-3.5 h-3.5" /> {generatingLink ? 'Generating...' : 'Generate Client Link'}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">Send this link to your client so they can fill in their fact find and upload documents.</p>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {FACT_FIND_SECTIONS.map(section => (
          <FactFindSection
            key={section.key}
            title={section.title}
            icon={ICON_MAP[section.iconName] || <User className="w-4 h-4" />}
            fields={section.fields}
            data={sections[section.key]?.data ?? {}}
            completed={sections[section.key]?.completed ?? false}
            onChange={(data) => updateSectionData(section.key, data)}
            onSave={() => saveSection(section.key)}
            onToggleComplete={() => toggleComplete(section.key)}
            saving={saving === section.key}
          />
        ))}
      </div>
    </div>
  );
}
