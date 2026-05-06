import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Upload, FileText, CheckCircle2, XCircle, Clock, Trash2, Download, UserPlus, Users, Sparkles, Send, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

interface DocumentRequest {
  id: string;
  lead_id: string;
  name: string;
  description: string | null;
  status: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  applicant_id: string | null;
  section: string | null;
  requested_at: string | null;
}

interface Applicant {
  id: string;
  lead_id: string;
  name: string;
  employment_type: string | null;
  display_order: number;
  email?: string | null;
  phone?: string | null;
}

interface DocumentCollectionPanelProps {
  leadId: string;
  isPreviewMode: boolean;
  primaryApplicantName?: string;
  primaryApplicantEmail?: string | null;
  primaryApplicantPhone?: string | null;
  actionsSlot?: React.ReactNode;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
  uploaded: { label: 'Uploaded', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Upload className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" /> },
};

const SECTION_ORDER = ['Identity', 'Income', 'Bank Statements', 'Tax Returns', 'Additional', 'Other'];

type TemplateItem = { section: string; name: string; description?: string };
type Template = { id: string; name: string; items: TemplateItem[] };

const FALLBACK_TEMPLATES: Template[] = [
  { id: 'fallback-payg', name: 'PAYG', items: [
    { section: 'Identity', name: 'Passport (current, valid)' },
    { section: 'Identity', name: "Driver's licence (front and back)" },
    { section: 'Income', name: 'Most recent payslip' },
    { section: 'Income', name: 'Previous payslip' },
    { section: 'Bank Statements', name: '3 months — everyday salary account' },
  ]},
];

const PRIMARY_APPLICANT_FALLBACK_ID = 'contact-card-primary-applicant';
const applicantSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().trim().min(1, 'Surname is required').max(50, 'Surname is too long'),
  email: z.string().trim().email('Please enter a valid email').max(255, 'Email is too long'),
  phone: z.string().trim().min(8, 'Mobile is required').max(20, 'Mobile is too long').regex(/^[+\d\s()-]+$/, 'Please enter a valid mobile'),
});

export function DocumentCollectionPanel({ leadId, isPreviewMode, primaryApplicantName, primaryApplicantEmail, primaryApplicantPhone, actionsSlot }: DocumentCollectionPanelProps) {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [templates, setTemplates] = useState<Template[]>(FALLBACK_TEMPLATES);
  const [isLoading, setIsLoading] = useState(true);
  const [activeApplicantId, setActiveApplicantId] = useState<string>('all');
  const [showAddApplicant, setShowAddApplicant] = useState(false);
  const [newApplicantFirstName, setNewApplicantFirstName] = useState('');
  const [newApplicantLastName, setNewApplicantLastName] = useState('');
  const [newApplicantType, setNewApplicantType] = useState<string>('PAYG');
  const [newApplicantEmail, setNewApplicantEmail] = useState('');
  const [newApplicantPhone, setNewApplicantPhone] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [addingTo, setAddingTo] = useState<{ section: string; applicantId: string | null } | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocDescription, setNewDocDescription] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [savingDocId, setSavingDocId] = useState<string | null>(null);

  const primaryName = primaryApplicantName?.trim() || 'Primary Applicant';
  const primaryEmail = primaryApplicantEmail?.trim() || null;
  const primaryPhone = primaryApplicantPhone?.trim() || null;
  const isPrimaryFallback = (id: string | null) => id === PRIMARY_APPLICANT_FALLBACK_ID;

  useEffect(() => {
    setIsLoading(true);
    setApplicants([
      { id: PRIMARY_APPLICANT_FALLBACK_ID, lead_id: leadId, name: primaryName, employment_type: 'PAYG', display_order: 0, email: primaryEmail, phone: primaryPhone },
    ]);
    setDocuments([]);
    setActiveApplicantId(PRIMARY_APPLICANT_FALLBACK_ID);
    fetchAll();
    fetchTemplates();
  }, [leadId, primaryName, primaryEmail, primaryPhone]);

  const fetchTemplates = async () => {
    if (isPreviewMode) return;
    const { data } = await (supabase as any)
      .from('document_templates')
      .select('id, name, items')
      .order('display_order');
    if (data && data.length) {
      setTemplates(data.map((t: any) => ({ id: t.id, name: t.name, items: (t.items as TemplateItem[]) || [] })));
    }
  };

  const fetchAll = async () => {
    if (isPreviewMode) {
      setApplicants([
        { id: PRIMARY_APPLICANT_FALLBACK_ID, lead_id: leadId, name: primaryName, employment_type: 'PAYG', display_order: 0, email: primaryEmail, phone: primaryPhone },
      ]);
      setDocuments([]);
      setActiveApplicantId(PRIMARY_APPLICANT_FALLBACK_ID);
      setIsLoading(false);
      return;
    }
    const [{ data: apps }, { data: docs }] = await Promise.all([
      supabase.from('lead_applicants').select('*').eq('lead_id', leadId).order('display_order'),
      supabase.from('document_requests').select('*').eq('lead_id', leadId).order('created_at'),
    ]);
    let appList = ((apps as Applicant[]) || []).map(app => app.display_order === 0 ? {
      ...app,
      email: app.email || primaryEmail,
      phone: app.phone || primaryPhone,
    } : app);
    // Applicant 1 always comes from the contact card, even before it is saved to lead_applicants.
    const hasPrimaryApplicant = appList.some(app => app.display_order === 0);
    if (!hasPrimaryApplicant && primaryName) {
      const fallbackApplicant: Applicant = {
        id: PRIMARY_APPLICANT_FALLBACK_ID,
        lead_id: leadId,
        name: primaryName,
        employment_type: 'PAYG',
        display_order: 0,
        email: primaryEmail,
        phone: primaryPhone,
      };
      appList = [fallbackApplicant, ...appList];
    }
    setApplicants(appList);
    if (appList.length > 0) {
      setActiveApplicantId(current => appList.some(app => app.id === current) ? current : appList[0].id);
    }
    setDocuments((docs as DocumentRequest[]) || []);
    setIsLoading(false);
  };

  const ensurePersistedApplicantId = async (applicantId: string | null) => {
    if (!isPrimaryFallback(applicantId) || isPreviewMode) return applicantId;

    const { data: existing } = await supabase
      .from('lead_applicants')
      .select('*')
      .eq('lead_id', leadId)
      .order('display_order')
      .limit(1)
      .maybeSingle();

    if (existing) {
      const savedApplicant = existing as Applicant;
      if (!savedApplicant.email || !savedApplicant.phone) {
        const contactUpdates: Partial<Applicant> = {};
        if (!savedApplicant.email && primaryEmail) contactUpdates.email = primaryEmail;
        if (!savedApplicant.phone && primaryPhone) contactUpdates.phone = primaryPhone;
        if (Object.keys(contactUpdates).length) {
          await supabase.from('lead_applicants').update(contactUpdates as any).eq('id', savedApplicant.id);
        }
        savedApplicant.email = savedApplicant.email || primaryEmail;
        savedApplicant.phone = savedApplicant.phone || primaryPhone;
      }
      setApplicants(prev => prev.map(app => isPrimaryFallback(app.id) ? savedApplicant : app));
      setActiveApplicantId(current => isPrimaryFallback(current) ? savedApplicant.id : current);
      return savedApplicant.id;
    }

    const { data, error } = await supabase.from('lead_applicants').insert({
      lead_id: leadId, name: primaryName, employment_type: 'PAYG', display_order: 0, email: primaryEmail, phone: primaryPhone,
    }).select().single();

    if (error || !data) {
      toast.error('Could not save the contact card applicant');
      return null;
    }

    const savedApplicant = data as Applicant;
    setApplicants(prev => prev.map(app => isPrimaryFallback(app.id) ? savedApplicant : app));
    setActiveApplicantId(current => isPrimaryFallback(current) ? savedApplicant.id : current);
    return savedApplicant.id;
  };

  const addApplicant = async () => {
    const parsed = applicantSchema.safeParse({
      firstName: newApplicantFirstName,
      lastName: newApplicantLastName,
      email: newApplicantEmail,
      phone: newApplicantPhone,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Please enter the applicant details');
      return;
    }
    const applicantName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
    const order = applicants.length;
    if (!isPreviewMode && applicants.some(app => isPrimaryFallback(app.id))) {
      const primaryApplicantId = await ensurePersistedApplicantId(PRIMARY_APPLICANT_FALLBACK_ID);
      if (!primaryApplicantId) return;
    }
    if (isPreviewMode) {
      const newApp = { id: `prev-${Date.now()}`, lead_id: leadId, name: applicantName, employment_type: newApplicantType, display_order: order, email: parsed.data.email, phone: parsed.data.phone };
      setApplicants(prev => [...prev, newApp]);
    } else {
      const { data, error } = await supabase.from('lead_applicants').insert({
        lead_id: leadId, name: applicantName, employment_type: newApplicantType, display_order: order,
        email: parsed.data.email, phone: parsed.data.phone,
      } as any).select().single();
      if (error) { toast.error('Failed: ' + error.message); return; }
      setApplicants(prev => [...prev, data as Applicant]);
      // auto-load template for this applicant (match by name)
      const tpl = templates.find(t => t.name === newApplicantType);
      if (tpl) await loadTemplate(tpl, (data as Applicant).id);
    }
    toast.success('Applicant added');
    setNewApplicantFirstName('');
    setNewApplicantLastName('');
    setNewApplicantEmail('');
    setNewApplicantPhone('');
    setShowAddApplicant(false);
  };

  const removeApplicant = async (id: string) => {
    const applicant = applicants.find(a => a.id === id);
    if (applicant?.display_order === 0) {
      toast.error('The first applicant comes from the contact card');
      return;
    }
    if (!confirm('Remove this applicant and all their document requests?')) return;
    if (!isPreviewMode) {
      const docsToRemove = documents.filter(d => d.applicant_id === id);
      for (const d of docsToRemove) {
        if (d.file_path) await supabase.storage.from('client-documents').remove([d.file_path]);
      }
      await supabase.from('document_requests').delete().eq('applicant_id', id);
      await supabase.from('lead_applicants').delete().eq('id', id);
    }
    setApplicants(prev => prev.filter(a => a.id !== id));
    setDocuments(prev => prev.filter(d => d.applicant_id !== id));
    if (activeApplicantId === id) setActiveApplicantId('all');
    toast.success('Applicant removed');
  };

  const loadTemplate = async (template: Template, applicantId: string | null) => {
    const tpl = template.items;
    if (!tpl || tpl.length === 0) { toast.error('This template has no documents'); return; }
    const persistedApplicantId = await ensurePersistedApplicantId(applicantId);
    if (isPrimaryFallback(applicantId) && !persistedApplicantId) return;
    if (isPreviewMode) {
      const items = tpl.map((t, i) => ({
        id: `prev-${Date.now()}-${i}`, lead_id: leadId, name: t.name, description: t.description || null,
        status: 'pending', file_path: null, file_name: null, file_size: null, uploaded_at: null,
        rejection_reason: null, created_at: new Date().toISOString(),
        applicant_id: persistedApplicantId, section: t.section, requested_at: null,
      }));
      setDocuments(prev => [...prev, ...items]);
    } else {
      const rows = tpl.map(t => ({
        lead_id: leadId, name: t.name, description: t.description || null,
        applicant_id: persistedApplicantId, section: t.section,
      }));
      const { error } = await supabase.from('document_requests').insert(rows);
      if (error) { toast.error('Template failed: ' + error.message); return; }
      fetchAll();
    }
    toast.success(`${template.name} checklist added`);
  };

  const addDocumentRequest = async () => {
    if (!newDocName.trim() || !addingTo) return;
    const applicantId = await ensurePersistedApplicantId(addingTo.applicantId);
    if (isPrimaryFallback(addingTo.applicantId) && !applicantId) return;
    const section = addingTo.section;
    if (isPreviewMode) {
      setDocuments(prev => [...prev, {
        id: `prev-${Date.now()}`, lead_id: leadId, name: newDocName.trim(),
        description: newDocDescription.trim() || null, status: 'pending',
        file_path: null, file_name: null, file_size: null, uploaded_at: null,
        rejection_reason: null, created_at: new Date().toISOString(),
        applicant_id: applicantId, section, requested_at: null,
      }]);
    } else {
      const { error } = await supabase.from('document_requests').insert({
        lead_id: leadId, name: newDocName.trim(),
        description: newDocDescription.trim() || null,
        applicant_id: applicantId, section,
      });
      if (error) { toast.error('Failed'); return; }
      fetchAll();
    }
    toast.success('Document added');
    setNewDocName(''); setNewDocDescription(''); setAddingTo(null);
  };

  const deleteDocumentRequest = async (id: string) => {
    if (isPreviewMode) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      return;
    }
    const doc = documents.find(d => d.id === id);
    if (doc?.file_path) await supabase.storage.from('client-documents').remove([doc.file_path]);
    await supabase.from('document_requests').delete().eq('id', id);
    fetchAll();
  };

  const handleFileUpload = async (docId: string, file: File) => {
    if (isPreviewMode) {
      setDocuments(prev => prev.map(d => d.id === docId ? {
        ...d, status: 'uploaded', file_name: file.name, file_size: file.size, uploaded_at: new Date().toISOString(),
      } : d));
      return;
    }
    const filePath = `${leadId}/${docId}/${file.name}`;
    const { error } = await supabase.storage.from('client-documents').upload(filePath, file, { upsert: true });
    if (error) { toast.error('Upload failed: ' + error.message); return; }
    await supabase.from('document_requests').update({
      file_path: filePath, file_name: file.name, file_size: file.size,
      status: 'uploaded', uploaded_at: new Date().toISOString(),
    }).eq('id', docId);
    toast.success('Uploaded');
    fetchAll();
  };

  const updateStatus = async (docId: string, status: string, rejectionReason?: string) => {
    if (isPreviewMode) {
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status, rejection_reason: rejectionReason || null } : d));
      return;
    }
    const updates: any = { status };
    if (rejectionReason) updates.rejection_reason = rejectionReason;
    if (status === 'approved' || status === 'rejected') {
      const { data } = await supabase.auth.getUser();
      updates.reviewed_by = data?.user?.id;
      updates.reviewed_at = new Date().toISOString();
    }
    await supabase.from('document_requests').update(updates).eq('id', docId);
    fetchAll();
  };

  const downloadFile = async (doc: DocumentRequest) => {
    if (!doc.file_path || isPreviewMode) return;
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const updateDocumentName = (docId: string, value: string) => {
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, name: value } : d));
  };

  const saveDocumentName = async (docId: string) => {
    const current = documents.find(d => d.id === docId);
    const trimmed = current?.name.trim() || '';
    if (!trimmed) {
      toast.error('Document name is required');
      return;
    }
    updateDocumentName(docId, trimmed);
    if (!isPreviewMode) {
      setSavingDocId(docId);
      const { error } = await supabase.from('document_requests').update({ name: trimmed }).eq('id', docId);
      setSavingDocId(null);
      if (error) { toast.error('Rename failed'); fetchAll(); return; }
    }
  };

  // Filter docs by active applicant tab
  const visibleDocs = activeApplicantId === 'all'
    ? documents
    : activeApplicantId === 'unassigned'
      ? documents.filter(d => !d.applicant_id)
      : documents.filter(d => d.applicant_id === activeApplicantId);

  const targetApplicantId = activeApplicantId === 'all' || activeApplicantId === 'unassigned' ? null : activeApplicantId;

  // Group by section
  const sections: Record<string, DocumentRequest[]> = {};
  visibleDocs.forEach(d => {
    const s = d.section || 'Other';
    if (!sections[s]) sections[s] = [];
    sections[s].push(d);
  });
  const orderedSections = [
    ...SECTION_ORDER.filter(s => sections[s]),
    ...Object.keys(sections).filter(s => !SECTION_ORDER.includes(s)),
  ];
  // Always show standard sections even if empty (when filtering by applicant)
  if (activeApplicantId !== 'all') {
    SECTION_ORDER.forEach(s => { if (!sections[s]) sections[s] = []; });
  }
  const finalSections = activeApplicantId !== 'all' ? SECTION_ORDER : orderedSections;

  const requestedCount = documents.filter(d => !!d.requested_at).length;
  const unrequestedDocs = documents.filter(d => !d.requested_at && d.status === 'pending');
  const outstandingRequestedDocs = documents.filter(d => !!d.requested_at && (d.status === 'pending' || d.status === 'rejected'));
  const pendingCount = visibleDocs.filter(d => d.status === 'pending').length;
  const uploadedCount = visibleDocs.filter(d => d.status === 'uploaded').length;
  const approvedCount = visibleDocs.filter(d => d.status === 'approved').length;

  const requestDocuments = async () => {
    if (unrequestedDocs.length === 0) {
      toast.info('No new documents to request');
      return;
    }
    setIsRequesting(true);
    try {
      if (!isPreviewMode) {
        const ids = unrequestedDocs.map(d => d.id);
        const nowIso = new Date().toISOString();
        const { error } = await supabase
          .from('document_requests')
          .update({ requested_at: nowIso } as any)
          .in('id', ids);
        if (error) { toast.error('Failed to mark requested'); return; }

        // Log activity in timeline
        try {
          const { data: userData } = await supabase.auth.getUser();
          const docsByApplicantForNote = unrequestedDocs.reduce<Record<string, DocumentRequest[]>>((acc, doc) => {
            const key = doc.applicant_id || PRIMARY_APPLICANT_FALLBACK_ID;
            acc[key] = [...(acc[key] || []), doc];
            return acc;
          }, {});
          const lines = Object.entries(docsByApplicantForNote).map(([applicantId, docs]) => {
            const applicant = applicants.find(a => a.id === applicantId || (isPrimaryFallback(applicantId) && a.display_order === 0));
            const name = applicant?.name || 'Primary Applicant';
            return `${name}:\n${docs.map(d => `• ${d.name}`).join('\n')}`;
          }).join('\n\n');
          const content = `📄 Requested ${unrequestedDocs.length} document${unrequestedDocs.length === 1 ? '' : 's'}\n\n${lines}`;
          await supabase.from('notes').insert({ lead_id: leadId, content, author_id: userData?.user?.id ?? null } as any);
        } catch {}

        // Send documents-only portal emails to each applicant with newly requested docs.
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (accessToken) {
          const docsByApplicant = unrequestedDocs.reduce<Record<string, DocumentRequest[]>>((acc, doc) => {
            const key = doc.applicant_id || PRIMARY_APPLICANT_FALLBACK_ID;
            acc[key] = [...(acc[key] || []), doc];
            return acc;
          }, {});
          await Promise.all(Object.entries(docsByApplicant).map(async ([applicantId, docs]) => {
            const applicant = applicants.find(a => a.id === applicantId || (isPrimaryFallback(applicantId) && a.display_order === 0));
            const recipientEmail = applicant?.email || (applicant?.display_order === 0 ? primaryEmail : null);
            if (!recipientEmail) return;
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-fact-find`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                lead_id: leadId,
                app_url: window.location.origin,
                mode: 'documents',
                recipient_email: recipientEmail,
                recipient_name: applicant?.name,
                document_names: docs.map(d => d.name),
              }),
            }).catch(() => {});
          }));
        }
        await fetchAll();
      } else {
        setDocuments(prev => prev.map(d => unrequestedDocs.some(u => u.id === d.id) ? { ...d, requested_at: new Date().toISOString() } : d));
      }
      toast.success(`Requested ${unrequestedDocs.length} document${unrequestedDocs.length === 1 ? '' : 's'} from client`);
    } finally {
      setIsRequesting(false);
    }
  };

  const resendDocumentsLink = async () => {
    if (outstandingRequestedDocs.length === 0) {
      toast.info('No outstanding documents to resend');
      return;
    }
    setIsRequesting(true);
    try {
      if (isPreviewMode) {
        toast.success('Resent documents link (preview)');
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) { toast.error('Not authenticated'); return; }

      const docsByApplicant = outstandingRequestedDocs.reduce<Record<string, DocumentRequest[]>>((acc, doc) => {
        const key = doc.applicant_id || PRIMARY_APPLICANT_FALLBACK_ID;
        acc[key] = [...(acc[key] || []), doc];
        return acc;
      }, {});

      let sent = 0;
      await Promise.all(Object.entries(docsByApplicant).map(async ([applicantId, docs]) => {
        const applicant = applicants.find(a => a.id === applicantId || (isPrimaryFallback(applicantId) && a.display_order === 0));
        const recipientEmail = applicant?.email || (applicant?.display_order === 0 ? primaryEmail : null);
        if (!recipientEmail) return;
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-fact-find`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            lead_id: leadId,
            app_url: window.location.origin,
            mode: 'documents',
            recipient_email: recipientEmail,
            recipient_name: applicant?.name,
            document_names: docs.map(d => d.name),
          }),
        }).catch(() => null);
        if (res && res.ok) sent += 1;
      }));

      // Log to timeline
      try {
        const { data: userData } = await supabase.auth.getUser();
        const content = `📄 Resent documents link (${outstandingRequestedDocs.length} outstanding document${outstandingRequestedDocs.length === 1 ? '' : 's'})`;
        await supabase.from('notes').insert({ lead_id: leadId, content, author_id: userData?.user?.id ?? null } as any);
      } catch {}

      if (sent === 0) toast.error('No applicant emails on file to resend to');
      else toast.success(`Resent documents link to ${sent} applicant${sent === 1 ? '' : 's'}`);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3 text-sm">
        <div className="flex-1 bg-muted/50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-semibold">{requestedCount}</p>
          <p className="text-xs text-muted-foreground">Requested</p>
        </div>
        <div className="flex-1 bg-amber-50 rounded-lg p-2.5 text-center border border-amber-100">
          <p className="text-lg font-semibold text-amber-700">{pendingCount}</p>
          <p className="text-xs text-amber-600">Pending</p>
        </div>
        <div className="flex-1 bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
          <p className="text-lg font-semibold text-blue-700">{uploadedCount}</p>
          <p className="text-xs text-blue-600">Uploaded</p>
        </div>
        <div className="flex-1 bg-green-50 rounded-lg p-2.5 text-center border border-green-100">
          <p className="text-lg font-semibold text-green-700">{approvedCount}</p>
          <p className="text-xs text-green-600">Approved</p>
        </div>
      </div>

      {/* Applicant tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b pb-2">
        <button
          onClick={() => setActiveApplicantId('all')}
          className={cn("text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5", activeApplicantId === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70')}
        >
          <Users className="w-3 h-3" /> All ({documents.length})
        </button>
        {applicants.map(a => (
          <button
            key={a.id}
            onClick={() => setActiveApplicantId(a.id)}
            className={cn("text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 group", activeApplicantId === a.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70')}
          >
            {a.name}
            {a.employment_type && <span className="opacity-70">· {a.employment_type}</span>}
            <span className="opacity-70">({documents.filter(d => d.applicant_id === a.id).length})</span>
            {a.display_order !== 0 && (
              <Trash2
                className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-70 hover:!opacity-100"
                onClick={(e) => { e.stopPropagation(); removeApplicant(a.id); }}
              />
            )}
          </button>
        ))}
        {applicants.length >= 1 && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAddApplicant(!showAddApplicant)}>
            <UserPlus className="w-3 h-3" /> {applicants.length === 1 ? 'Add second applicant' : 'Add applicant'}
          </Button>
        )}
      </div>

      {showAddApplicant && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium">Add applicant {applicants.length + 1}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="First name *" value={newApplicantFirstName} onChange={e => setNewApplicantFirstName(e.target.value)} className="h-8 text-sm" />
            <Input placeholder="Surname *" value={newApplicantLastName} onChange={e => setNewApplicantLastName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="email" placeholder="Email *" value={newApplicantEmail} onChange={e => setNewApplicantEmail(e.target.value)} className="h-8 text-sm" />
            <Input type="tel" placeholder="Mobile *" value={newApplicantPhone} onChange={e => setNewApplicantPhone(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="flex gap-2">
            <Select value={newApplicantType} onValueChange={setNewApplicantType}>
              <SelectTrigger className="h-8 text-sm w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYG">PAYG</SelectItem>
                <SelectItem value="Sole Trader">Sole Trader</SelectItem>
                <SelectItem value="Company/Trust">Company/Trust</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">A standard checklist for the selected employment type will be added automatically.</p>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs" onClick={addApplicant} disabled={!newApplicantFirstName.trim() || !newApplicantLastName.trim() || !newApplicantEmail.trim() || !newApplicantPhone.trim()}>Add Applicant</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setShowAddApplicant(false); setNewApplicantFirstName(''); setNewApplicantLastName(''); setNewApplicantEmail(''); setNewApplicantPhone(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Template quick-add — always visible */}
      <div className="flex items-center gap-2 flex-wrap bg-muted/30 rounded-lg p-2.5">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Add checklist
          {activeApplicantId !== 'all' && activeApplicantId !== 'unassigned'
            ? ` for ${applicants.find(a => a.id === activeApplicantId)?.name || 'applicant'}:`
            : ' (unassigned):'}
        </span>
        {templates.map(t => (
          <Button key={t.id} variant="outline" size="sm" className="h-7 text-xs" onClick={() => loadTemplate(t, targetApplicantId)}>
            + {t.name}
          </Button>
        ))}
        {templates.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No templates yet — add some in Settings → Document Templates.</span>
        )}
      </div>

      {!isLoading && applicants.length === 0 && documents.length === 0 && (
        <div className="text-center py-6 border border-dashed rounded-lg">
          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Add an applicant, or pick a checklist above to get started</p>
          <Button size="sm" onClick={() => setShowAddApplicant(true)}><UserPlus className="w-3 h-3 mr-1" /> Add First Applicant</Button>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {finalSections.map(section => {
          const docs = sections[section] || [];
          if (activeApplicantId === 'all' && docs.length === 0) return null;
          return (
            <div key={section} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section} <span className="text-muted-foreground/60">({docs.length})</span>
                </h4>
                {activeApplicantId !== 'all' && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setAddingTo({ section, applicantId: targetApplicantId })}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                )}
              </div>

              {addingTo?.section === section && addingTo.applicantId === targetApplicantId && (
                <div className="bg-muted/50 rounded-lg p-2 space-y-2">
                  <Input placeholder="Document name" value={newDocName} onChange={e => setNewDocName(e.target.value)} className="h-8 text-sm" autoFocus />
                  <Input placeholder="Description (optional)" value={newDocDescription} onChange={e => setNewDocDescription(e.target.value)} className="h-8 text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" onClick={addDocumentRequest} disabled={!newDocName.trim()}>Add</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAddingTo(null); setNewDocName(''); setNewDocDescription(''); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {docs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1">No documents in this section</p>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => {
                    const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                    const applicant = applicants.find(a => a.id === doc.applicant_id);
                    return (
                      <div key={doc.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <Input
                                value={doc.name}
                                onChange={e => updateDocumentName(doc.id, e.target.value)}
                                onBlur={() => saveDocumentName(doc.id)}
                                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                disabled={savingDocId === doc.id}
                                aria-label="Document name"
                                className="h-8 text-sm font-medium"
                              />
                              {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                              {activeApplicantId === 'all' && applicant && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">For: {applicant.name}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("shrink-0 text-[10px] gap-1", cfg.color)}>
                            {cfg.icon} {cfg.label}
                          </Badge>
                          {!doc.requested_at && doc.status === 'pending' && (
                            <Badge variant="outline" className="shrink-0 text-[10px] gap-1 bg-muted text-muted-foreground border-muted">
                              Not requested
                            </Badge>
                          )}
                        </div>

                        {doc.file_name && (
                          <div className="flex items-center gap-2 bg-muted/50 rounded p-2">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs truncate flex-1">{doc.file_name}</span>
                            {doc.file_size && <span className="text-xs text-muted-foreground shrink-0">{(doc.file_size / 1024).toFixed(0)} KB</span>}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => downloadFile(doc)}>
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {doc.rejection_reason && (
                          <p className="text-xs text-destructive bg-destructive/10 rounded p-2">Rejection: {doc.rejection_reason}</p>
                        )}

                        <div className="flex gap-1.5 flex-wrap">
                          {(doc.status === 'pending' || doc.status === 'rejected') && (
                            <>
                              <input type="file" className="hidden" ref={el => { fileInputRefs.current[doc.id] = el; }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(doc.id, f); e.target.value = ''; }} />
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRefs.current[doc.id]?.click()}>
                                <Upload className="w-3 h-3" /> {doc.status === 'rejected' ? 'Re-upload' : 'Upload'}
                              </Button>
                            </>
                          )}
                          {doc.status === 'uploaded' && (
                            <>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50" onClick={() => updateStatus(doc.id, 'approved')}>
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50" onClick={() => {
                                const r = window.prompt('Rejection reason:'); if (r) updateStatus(doc.id, 'rejected', r);
                              }}>
                                <XCircle className="w-3 h-3" /> Reject
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive ml-auto" onClick={() => deleteDocumentRequest(doc.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs">
            <p className="font-medium">
              {unrequestedDocs.length > 0
                ? `${unrequestedDocs.length} document${unrequestedDocs.length === 1 ? '' : 's'} ready to request`
                : documents.length === 0
                  ? 'Add a checklist, then request documents from the client'
                  : 'All documents have been requested from the client'}
            </p>
            <p className="text-muted-foreground">Documents are only visible to the client once you click Request.</p>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={requestDocuments} disabled={isRequesting || unrequestedDocs.length === 0}>
            <Send className="w-3.5 h-3.5" /> {isRequesting ? 'Requesting…' : 'Request'}
          </Button>
        </div>
        {actionsSlot}
      </div>
    </div>
  );
}
