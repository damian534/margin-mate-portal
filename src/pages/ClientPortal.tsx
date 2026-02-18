import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FactFindSection } from '@/components/factfind/FactFindSection';
import { FACT_FIND_SECTIONS } from '@/components/factfind/fact-find-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Toaster as Sonner } from '@/components/ui/sonner';
import {
  FileText, Upload, CheckCircle2, Clock, XCircle, User, Briefcase,
  DollarSign, Home, CreditCard, Receipt, Target, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ReactNode> = {
  User: <User className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  DollarSign: <DollarSign className="w-4 h-4" />,
  Home: <Home className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  Receipt: <Receipt className="w-4 h-4" />,
  Target: <Target className="w-4 h-4" />,
};

interface SectionData {
  section: string;
  data: Record<string, any>;
  completed: boolean;
}

interface DocumentRequest {
  id: string;
  name: string;
  description: string | null;
  status: string;
  file_name: string | null;
  rejection_reason: string | null;
}

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadName, setLeadName] = useState('');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, SectionData>>({});
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    validateAndLoad();
  }, [token]);

  const validateAndLoad = async () => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }

    // Call edge function to validate token and get data
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-portal?token=${encodeURIComponent(token)}`
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      setError(errData.error || 'This link is invalid or has expired.');
      setLoading(false);
      return;
    }

    const data = await res.json();
    setLeadId(data.lead_id);
    setLeadName(data.lead_name);

    // Load fact find data
    const map: Record<string, SectionData> = {};
    FACT_FIND_SECTIONS.forEach(s => {
      const existing = data.fact_find?.find((d: any) => d.section === s.key);
      map[s.key] = {
        section: s.key,
        data: existing?.data ?? {},
        completed: existing?.completed ?? false,
      };
    });
    setSections(map);
    setDocuments(data.documents || []);
    setLoading(false);
  };

  const saveSection = async (sectionKey: string) => {
    if (!leadId) return;
    setSaving(sectionKey);
    const sectionData = sections[sectionKey];

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-portal`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'save_fact_find',
          section: sectionKey,
          data: sectionData.data,
          completed: sectionData.completed,
        }),
      }
    );

    if (!res.ok) { toast.error('Failed to save'); setSaving(null); return; }
    toast.success('Section saved');
    setSaving(null);
  };

  const handleFileUpload = async (docId: string, file: File) => {
    if (!leadId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('token', token!);
    formData.append('document_id', docId);

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-portal-upload`,
      { method: 'POST', body: formData }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      toast.error(errData.error || 'Upload failed');
      return;
    }

    toast.success('File uploaded successfully');
    // Refresh documents
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: 'uploaded', file_name: file.name } : d));
  };

  const toggleComplete = (sectionKey: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <CardTitle>Link Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const completedCount = Object.values(sections).filter(s => s.completed).length;
  const progress = (completedCount / FACT_FIND_SECTIONS.length) * 100;

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Required', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
    uploaded: { label: 'Uploaded', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle2 className="w-3 h-3" /> },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
    rejected: { label: 'Resubmit', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Sonner />
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Welcome, {leadName}</h1>
          <p className="text-muted-foreground">Please complete your fact find and upload the requested documents.</p>
        </div>

        <Tabs defaultValue="factfind">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="factfind" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" /> Fact Find
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs">
              <Upload className="w-3.5 h-3.5" /> Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="factfind" className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">{completedCount}/{FACT_FIND_SECTIONS.length} sections</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

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
          </TabsContent>

          <TabsContent value="documents" className="mt-4 space-y-4">
            {documents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No documents have been requested yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => {
                  const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                  return (
                    <Card key={doc.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{doc.name}</p>
                              {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("shrink-0 text-[10px] gap-1", statusCfg.color)}>
                            {statusCfg.icon} {statusCfg.label}
                          </Badge>
                        </div>

                        {doc.file_name && (
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 flex items-center gap-1.5">
                            <FileText className="w-3 h-3" /> {doc.file_name}
                          </p>
                        )}

                        {doc.rejection_reason && (
                          <p className="text-xs text-destructive bg-destructive/10 rounded p-2">
                            Please resubmit: {doc.rejection_reason}
                          </p>
                        )}

                        {(doc.status === 'pending' || doc.status === 'rejected') && (
                          <>
                            <input
                              type="file"
                              className="hidden"
                              ref={(el) => { fileInputRefs.current[doc.id] = el; }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(doc.id, file);
                                e.target.value = '';
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-1.5"
                              onClick={() => fileInputRefs.current[doc.id]?.click()}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {doc.status === 'rejected' ? 'Upload Again' : 'Upload File'}
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <p className="text-xs text-center text-muted-foreground pt-4">
          Your information is securely transmitted and stored. If you have any questions, please contact your broker.
        </p>
      </div>
    </div>
  );
}
