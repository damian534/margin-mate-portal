import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Upload, FileText, CheckCircle2, XCircle, Clock, Trash2, Download, UserPlus, Users, Sparkles, Send, Mail, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { RequestMirDialog } from './RequestMirDialog';

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
  is_mir?: boolean;
  mir_batch_id?: string | null;
  mir_requested_at?: string | null;
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
  /** Co-applicant contact linked on the deal card. When provided, applicant #2 is auto-synced to mirror this contact. */
  coApplicantContact?: { id: string; first_name: string; last_name: string; email?: string | null; phone?: string | null } | null;
  /** Called when a second applicant is added inside the documents panel. Should create a contact and link it to the lead, returning the new contact id. */
  onCoApplicantAdded?: (data: { firstName: string; lastName: string; email: string; phone: string }) => Promise<string | null>;
  /** Called when the second applicant is removed inside the documents panel. Should unlink the co-applicant contact from the lead. */
  onCoApplicantRemoved?: () => Promise<void> | void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Not Collected', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> },
  uploaded: { label: 'Uploaded', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', icon: <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> },
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

export function DocumentCollectionPanel({ leadId, isPreviewMode, primaryApplicantName, primaryApplicantEmail, primaryApplicantPhone, actionsSlot, coApplicantContact, onCoApplicantAdded, onCoApplicantRemoved }: DocumentCollectionPanelProps) {
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
  const [mirOpen, setMirOpen] = useState(false);
  const [resendingBatchId, setResendingBatchId] = useState<string | null>(null);

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

  // Sync from deal card → docs panel: when a co-applicant contact is linked on the lead,
  // ensure a lead_applicants row at display_order=1 mirroring that contact's details.
  useEffect(() => {
    if (isPreviewMode || !coApplicantContact || isLoading) return;
    const fullName = `${coApplicantContact.first_name ?? ''} ${coApplicantContact.last_name ?? ''}`.trim();
    if (!fullName) return;
    const email = coApplicantContact.email ?? null;
    const phone = coApplicantContact.phone ?? null;
    const existing = applicants.find(a => a.display_order === 1);
    (async () => {
      if (!existing) {
        const { data, error } = await supabase.from('lead_applicants').insert({
          lead_id: leadId, name: fullName, employment_type: 'PAYG', display_order: 1, email, phone,
        } as any).select().single();
        if (!error && data) {
          setApplicants(prev => [...prev, data as Applicant]);
        }
      } else if (existing.name !== fullName || (existing.email ?? null) !== email || (existing.phone ?? null) !== phone) {
        const { data, error } = await supabase.from('lead_applicants')
          .update({ name: fullName, email, phone } as any)
          .eq('id', existing.id).select().single();
        if (!error && data) {
          setApplicants(prev => prev.map(a => a.id === existing.id ? (data as Applicant) : a));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coApplicantContact?.id, coApplicantContact?.first_name, coApplicantContact?.last_name, coApplicantContact?.email, coApplicantContact?.phone, isLoading]);

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
      // Sync to deal card: if this is the second applicant and no co-applicant is linked yet, create the contact and link it.
      if (order === 1 && onCoApplicantAdded && !coApplicantContact) {
        try {
          await onCoApplicantAdded({
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            email: parsed.data.email,
            phone: parsed.data.phone,
          });
        } catch (e) {
          console.warn('Co-applicant sync to deal card failed', e);
        }
      }
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
            const groupsMap = docs.reduce<Record<string, string[]>>((acc, d) => {
              const sec = d.section || 'Other';
              acc[sec] = [...(acc[sec] || []), d.name];
              return acc;
            }, {});
            const document_groups = Object.entries(groupsMap).map(([section, names]) => ({ section, names }));
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-fact-find`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                lead_id: leadId,
                app_url: 'https://connect.margin.com.au',
                mode: 'documents',
                recipient_email: recipientEmail,
                recipient_name: applicant?.name,
                document_names: docs.map(d => d.name),
                document_groups,
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
        const groupsMap = docs.reduce<Record<string, string[]>>((acc, d) => {
          const sec = d.section || 'Other';
          acc[sec] = [...(acc[sec] || []), d.name];
          return acc;
        }, {});
        const document_groups = Object.entries(groupsMap).map(([section, names]) => ({ section, names }));
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-fact-find`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            lead_id: leadId,
            app_url: 'https://connect.margin.com.au',
            mode: 'documents',
            recipient_email: recipientEmail,
            recipient_name: applicant?.name,
            document_names: docs.map(d => d.name),
            document_groups,
          }),
        }).catch(() => null);
        if (res && res.ok) sent += 1;
      }));

      // Update requested_at timestamp on all resent documents
      try {
        const ids = outstandingRequestedDocs.map(d => d.id);
        await supabase.from('document_requests').update({ requested_at: new Date().toISOString() } as any).in('id', ids);
        await fetchAll();
      } catch {}

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

  const resendMirBatch = async (batchId: string, docs: DocumentRequest[]) => {
    if (isPreviewMode) { toast.success('Resent MIR (preview)'); return; }
    setResendingBatchId(batchId);
    try {
      const { data: batch, error: batchErr } = await (supabase as any)
        .from('mir_requests').select('*').eq('id', batchId).maybeSingle();
      if (batchErr || !batch) { toast.error('Could not load original MIR'); return; }

      const recipientEmail = (batch.recipient_emails && batch.recipient_emails[0]) || null;
      const applicant = applicants.find(a => a.id === docs[0].applicant_id);
      const recipient = recipientEmail || applicant?.email || null;
      if (!recipient) { toast.error('No recipient email on file'); return; }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) { toast.error('Not authenticated'); return; }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-mir-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          lead_id: leadId,
          app_url: 'https://connect.margin.com.au',
          document_names: docs.map(d => d.name),
          recipient_email: recipient,
          recipient_name: applicant?.name,
          lender: batch.lender || undefined,
          message: batch.message || undefined,
          from_email: batch.from_email,
          from_name: batch.from_name || undefined,
          reply_to: batch.from_email,
        }),
      });
      if (!res.ok) { toast.error('Resend failed'); return; }

      const nowIso = new Date().toISOString();
      await supabase.from('document_requests').update({ mir_requested_at: nowIso, requested_at: nowIso } as any).in('id', docs.map(d => d.id));

      try {
        const { data: userData } = await supabase.auth.getUser();
        const summary = `📨 MIR resent${batch.lender ? ` (${batch.lender})` : ''} to ${applicant?.name || recipient}\n${docs.map(d => `• ${d.name}`).join('\n')}`;
        await supabase.from('notes').insert({ lead_id: leadId, content: summary, author_id: userData?.user?.id ?? null } as any);
      } catch {}

      toast.success('MIR resent');
      await fetchAll();
    } finally {
      setResendingBatchId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Premium top bar: Request action + compact KPI pills */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
            <FileText className="w-3 h-3" /> {documents.length} total
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {pendingCount} not collected
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {uploadedCount} uploaded
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {approvedCount} approved
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50"
            onClick={() => setMirOpen(true)}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Request MIR
          </Button>
          {unrequestedDocs.length > 0 ? (
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90" onClick={requestDocuments} disabled={isRequesting}>
              <Send className="w-3.5 h-3.5" /> {isRequesting ? 'Requesting…' : `Request Documents (${unrequestedDocs.length})`}
            </Button>
          ) : outstandingRequestedDocs.length > 0 ? (
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90" onClick={resendDocumentsLink} disabled={isRequesting}>
              <Mail className="w-3.5 h-3.5" /> {isRequesting ? 'Sending…' : 'Resend Link'}
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs gap-1.5" disabled>
              <Send className="w-3.5 h-3.5" /> Request Documents
            </Button>
          )}
        </div>
      </div>

      <RequestMirDialog
        open={mirOpen}
        onOpenChange={setMirOpen}
        leadId={leadId}
        applicants={applicants}
        isPreviewMode={isPreviewMode}
        onSent={() => fetchAll()}
      />

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

      {!isLoading && applicants.length === 0 && documents.length === 0 && (
        <div className="text-center py-6 border border-dashed rounded-lg">
          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Add an applicant, or pick a checklist above to get started</p>
          <Button size="sm" onClick={() => setShowAddApplicant(true)}><UserPlus className="w-3 h-3 mr-1" /> Add First Applicant</Button>
        </div>
      )}

      {/* MIR Requests summary — grouped by batch, shown above regular sections */}
      {(() => {
        const mirDocs = visibleDocs.filter(d => d.is_mir && d.mir_batch_id);
        if (mirDocs.length === 0) return null;
        const batches = new Map<string, DocumentRequest[]>();
        mirDocs.forEach(d => {
          const id = d.mir_batch_id!;
          batches.set(id, [...(batches.get(id) || []), d]);
        });
        const ordered = Array.from(batches.entries()).sort((a, b) => {
          const ta = a[1][0].mir_requested_at || a[1][0].requested_at || '';
          const tb = b[1][0].mir_requested_at || b[1][0].requested_at || '';
          return tb.localeCompare(ta);
        });
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-amber-100/60 border-b border-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <h4 className="text-sm font-semibold text-amber-900">MIR Requests</h4>
                <span className="text-xs text-amber-800">{mirDocs.length} document{mirDocs.length === 1 ? '' : 's'} across {ordered.length} request{ordered.length === 1 ? '' : 's'}</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-amber-900 hover:bg-amber-100" onClick={() => setMirOpen(true)}>
                <Plus className="w-3 h-3" /> New MIR
              </Button>
            </div>
            <div className="divide-y divide-amber-100">
              {ordered.map(([batchId, docs]) => {
                const ts = docs[0].mir_requested_at || docs[0].requested_at;
                const collected = docs.filter(d => d.status === 'uploaded' || d.status === 'approved').length;
                return (
                  <div key={batchId} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-xs font-medium text-amber-900">
                        Sent {ts ? new Date(ts).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-amber-800">{collected}/{docs.length} received</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] gap-1 text-amber-900 hover:bg-amber-100 px-2"
                          onClick={() => resendMirBatch(batchId, docs)}
                          disabled={resendingBatchId === batchId}
                        >
                          <Mail className="w-3 h-3" /> {resendingBatchId === batchId ? 'Sending…' : 'Resend'}
                        </Button>
                      </div>
                    </div>
                    <ul className="space-y-0.5">
                      {docs.map(d => {
                        const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending;
                        return (
                          <li key={d.id} className="flex items-center gap-2 text-xs text-foreground/80">
                            <span className={cn("inline-flex items-center justify-center w-1.5 h-1.5 rounded-full", d.status === 'approved' ? 'bg-emerald-500' : d.status === 'uploaded' ? 'bg-blue-500' : 'bg-slate-400')} />
                            <span className="flex-1 truncate">{d.name}</span>
                            <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Sections — premium table cards */}
      <div className="space-y-3">
        {finalSections.map(section => {
          const docs = sections[section] || [];
          if (activeApplicantId === 'all' && docs.length === 0) return null;
          return (
            <div key={section} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">{section}</h4>
                  <span className="text-xs text-muted-foreground">{docs.length} {docs.length === 1 ? 'item' : 'items'}</span>
                </div>
                {activeApplicantId !== 'all' && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setAddingTo({ section, applicantId: targetApplicantId })}>
                    <Plus className="w-3 h-3" /> Add document
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
                <p className="text-xs text-muted-foreground italic px-4 py-3">No documents in this section</p>
              ) : (
                <div className="divide-y divide-border">
                  {docs.map(doc => {
                    const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                    const applicant = applicants.find(a => a.id === doc.applicant_id);
                    return (
                      <div key={doc.id} className="px-4 py-3 hover:bg-muted/20 transition-colors space-y-2">
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
                                className="h-8 text-sm font-medium border-transparent bg-transparent hover:bg-background hover:border-border focus:bg-background focus:border-border px-2 -mx-2"
                              />
                              {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                              {activeApplicantId === 'all' && applicant && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">For: {applicant.name}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("shrink-0 text-[10px] gap-1.5 font-medium", cfg.color)}>
                            {cfg.icon} {cfg.label}
                          </Badge>
                          {doc.is_mir && (
                            <Badge variant="outline" className="shrink-0 text-[10px] gap-1 bg-amber-50 text-amber-800 border-amber-200 font-semibold uppercase tracking-wide">
                              <AlertTriangle className="w-2.5 h-2.5" /> MIR
                            </Badge>
                          )}
                          {!doc.requested_at && doc.status === 'pending' && (
                            <Badge variant="outline" className="shrink-0 text-[10px] gap-1 bg-muted text-muted-foreground border-muted">
                              Not requested
                            </Badge>
                          )}
                        </div>

                        {doc.requested_at && (
                          <p className="text-[10px] text-muted-foreground">
                            {doc.is_mir ? 'MIR sent' : 'Requested'} {new Date(doc.mir_requested_at || doc.requested_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        )}

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

      {/* Templates quick-add — moved to bottom for less clutter */}
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
          <div className="flex items-center gap-2 shrink-0">
            {unrequestedDocs.length > 0 ? (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={requestDocuments} disabled={isRequesting}>
                <Send className="w-3.5 h-3.5" /> {isRequesting ? 'Requesting…' : 'Request'}
              </Button>
            ) : outstandingRequestedDocs.length > 0 ? (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={resendDocumentsLink} disabled={isRequesting}>
                <Send className="w-3.5 h-3.5" /> {isRequesting ? 'Sending…' : 'Resend link'}
              </Button>
            ) : (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={requestDocuments} disabled>
                <Send className="w-3.5 h-3.5" /> Request
              </Button>
            )}
          </div>
        </div>
        {actionsSlot}
      </div>
    </div>
  );
}
