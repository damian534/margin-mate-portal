import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Upload, FileText, CheckCircle2, XCircle, Clock, Trash2, Download, UserPlus, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface Applicant {
  id: string;
  lead_id: string;
  name: string;
  employment_type: string | null;
  display_order: number;
}

interface DocumentCollectionPanelProps {
  leadId: string;
  isPreviewMode: boolean;
  primaryApplicantName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
  uploaded: { label: 'Uploaded', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Upload className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" /> },
};

const SECTION_ORDER = ['Identity', 'Income', 'Bank Statements', 'Tax Returns', 'Additional', 'Other'];

const TEMPLATES: Record<string, { section: string; name: string; description?: string }[]> = {
  PAYG: [
    { section: 'Identity', name: 'Passport (current, valid)' },
    { section: 'Identity', name: "Driver's licence (front and back)" },
    { section: 'Identity', name: 'Medicare card (current)' },
    { section: 'Income', name: 'Most recent payslip' },
    { section: 'Income', name: 'Previous payslip' },
    { section: 'Income', name: '2025 income statement', description: 'myGov → ATO → Income statements → download as PDF' },
    { section: 'Bank Statements', name: '3 months — everyday salary account', description: 'Use https://bankstatements.com.au' },
    { section: 'Bank Statements', name: '3 months — savings account', description: 'Use https://bankstatements.com.au' },
    { section: 'Additional', name: 'Rental income — lease agreements + last 2 years tax returns' },
    { section: 'Additional', name: 'Property documents — rates notice or contract of sale' },
  ],
  'Sole Trader': [
    { section: 'Tax Returns', name: 'Most recent year tax return' },
    { section: 'Tax Returns', name: 'Previous year tax return' },
    { section: 'Tax Returns', name: 'Most recent ATO NOA (Notice of Assessment)' },
    { section: 'Tax Returns', name: 'Previous year ATO NOA (Notice of Assessment)' },
  ],
  'Company/Trust': [
    { section: 'Tax Returns', name: 'Most recent year individual tax return' },
    { section: 'Tax Returns', name: 'Previous year individual tax return' },
    { section: 'Tax Returns', name: 'Most recent year company tax return' },
    { section: 'Tax Returns', name: 'Previous year company tax return' },
    { section: 'Tax Returns', name: 'Most recent ATO NOA (Notice of Assessment)' },
    { section: 'Tax Returns', name: 'Previous year ATO NOA (Notice of Assessment)' },
  ],
};

const PRIMARY_APPLICANT_FALLBACK_ID = 'contact-card-primary-applicant';

export function DocumentCollectionPanel({ leadId, isPreviewMode, primaryApplicantName }: DocumentCollectionPanelProps) {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [activeApplicantId, setActiveApplicantId] = useState<string>('all');
  const [showAddApplicant, setShowAddApplicant] = useState(false);
  const [newApplicantName, setNewApplicantName] = useState('');
  const [newApplicantType, setNewApplicantType] = useState<string>('PAYG');
  const [secondApplicantPrompt, setSecondApplicantPrompt] = useState<'unknown' | 'no' | 'yes'>('unknown');
  const [addingTo, setAddingTo] = useState<{ section: string; applicantId: string | null } | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocDescription, setNewDocDescription] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const primaryName = primaryApplicantName?.trim() || 'Primary Applicant';
  const isPrimaryFallback = (id: string | null) => id === PRIMARY_APPLICANT_FALLBACK_ID;

  useEffect(() => {
    fetchAll();
    setSecondApplicantPrompt('unknown');
  }, [leadId, primaryName]);

  const fetchAll = async () => {
    if (isPreviewMode) {
      setApplicants([
        { id: PRIMARY_APPLICANT_FALLBACK_ID, lead_id: leadId, name: primaryName, employment_type: 'PAYG', display_order: 0 },
      ]);
      setDocuments([]);
      setActiveApplicantId(PRIMARY_APPLICANT_FALLBACK_ID);
      return;
    }
    const [{ data: apps }, { data: docs }] = await Promise.all([
      supabase.from('lead_applicants').select('*').eq('lead_id', leadId).order('display_order'),
      supabase.from('document_requests').select('*').eq('lead_id', leadId).order('created_at'),
    ]);
    let appList = (apps as Applicant[]) || [];
    // Auto-seed Applicant 1 from the contact card if missing
    if (appList.length === 0 && primaryName) {
      const fallbackApplicant: Applicant = {
        id: PRIMARY_APPLICANT_FALLBACK_ID,
        lead_id: leadId,
        name: primaryName,
        employment_type: 'PAYG',
        display_order: 0,
      };
      setApplicants([fallbackApplicant]);
      setActiveApplicantId(PRIMARY_APPLICANT_FALLBACK_ID);

      const { data: seeded, error } = await supabase.from('lead_applicants').insert({
        lead_id: leadId, name: primaryName, employment_type: 'PAYG', display_order: 0,
      }).select().single();

      if (seeded) {
        appList = [seeded as Applicant];
        setActiveApplicantId((current) => isPrimaryFallback(current) ? (seeded as Applicant).id : current);
      } else {
        if (error) console.error('Primary applicant seed failed', error);
        appList = [fallbackApplicant];
      }
    }
    setApplicants(appList);
    if (appList.length > 0) {
      setActiveApplicantId(current => appList.some(app => app.id === current) ? current : appList[0].id);
    }
    setDocuments((docs as DocumentRequest[]) || []);
  };

  const ensurePersistedApplicantId = async (applicantId: string | null) => {
    if (!isPrimaryFallback(applicantId) || isPreviewMode) return applicantId;

    const { data, error } = await supabase.from('lead_applicants').insert({
      lead_id: leadId, name: primaryName, employment_type: 'PAYG', display_order: 0,
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
    if (!newApplicantName.trim()) return;
    const order = applicants.length;
    if (isPreviewMode) {
      const newApp = { id: `prev-${Date.now()}`, lead_id: leadId, name: newApplicantName.trim(), employment_type: newApplicantType, display_order: order };
      setApplicants(prev => [...prev, newApp]);
    } else {
      const { data, error } = await supabase.from('lead_applicants').insert({
        lead_id: leadId, name: newApplicantName.trim(), employment_type: newApplicantType, display_order: order,
      }).select().single();
      if (error) { toast.error('Failed: ' + error.message); return; }
      setApplicants(prev => [...prev, data as Applicant]);
      // auto-load template for this applicant
      await loadTemplate(newApplicantType, (data as Applicant).id);
    }
    toast.success('Applicant added');
    setNewApplicantName('');
    setShowAddApplicant(false);
  };

  const removeApplicant = async (id: string) => {
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

  const loadTemplate = async (templateName: string, applicantId: string | null) => {
    const tpl = TEMPLATES[templateName];
    if (!tpl) return;
    const persistedApplicantId = await ensurePersistedApplicantId(applicantId);
    if (isPrimaryFallback(applicantId) && !persistedApplicantId) return;
    if (isPreviewMode) {
      const items = tpl.map((t, i) => ({
        id: `prev-${Date.now()}-${i}`, lead_id: leadId, name: t.name, description: t.description || null,
        status: 'pending', file_path: null, file_name: null, file_size: null, uploaded_at: null,
        rejection_reason: null, created_at: new Date().toISOString(),
        applicant_id: persistedApplicantId, section: t.section,
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
    toast.success(`${templateName} checklist added`);
  };

  const addDocumentRequest = async () => {
    if (!newDocName.trim() || !addingTo) return;
    const applicantId = addingTo.applicantId;
    const section = addingTo.section;
    if (isPreviewMode) {
      setDocuments(prev => [...prev, {
        id: `prev-${Date.now()}`, lead_id: leadId, name: newDocName.trim(),
        description: newDocDescription.trim() || null, status: 'pending',
        file_path: null, file_name: null, file_size: null, uploaded_at: null,
        rejection_reason: null, created_at: new Date().toISOString(),
        applicant_id: applicantId, section,
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

  const pendingCount = visibleDocs.filter(d => d.status === 'pending').length;
  const uploadedCount = visibleDocs.filter(d => d.status === 'uploaded').length;
  const approvedCount = visibleDocs.filter(d => d.status === 'approved').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3 text-sm">
        <div className="flex-1 bg-muted/50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-semibold">{visibleDocs.length}</p>
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
            <Trash2
              className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-70 hover:!opacity-100"
              onClick={(e) => { e.stopPropagation(); removeApplicant(a.id); }}
            />
          </button>
        ))}
        {applicants.length >= 2 && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAddApplicant(!showAddApplicant)}>
            <UserPlus className="w-3 h-3" /> Add Applicant
          </Button>
        )}
      </div>

      {/* Second applicant prompt — shown when only the auto-seeded primary exists */}
      {applicants.length === 1 && secondApplicantPrompt === 'unknown' && !showAddApplicant && (
        <div className="bg-muted/40 rounded-lg p-3 flex items-center justify-between gap-3">
          <p className="text-sm">Is there a <strong>second applicant</strong> on this loan?</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setShowAddApplicant(true); setSecondApplicantPrompt('yes'); }}>
              Yes, add applicant 2
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSecondApplicantPrompt('no')}>
              No, sole applicant
            </Button>
          </div>
        </div>
      )}
      {applicants.length === 1 && secondApplicantPrompt === 'no' && (
        <p className="text-[11px] text-muted-foreground italic">Sole applicant.{' '}
          <button className="underline" onClick={() => { setShowAddApplicant(true); setSecondApplicantPrompt('yes'); }}>Add a second applicant</button>
        </p>
      )}

      {showAddApplicant && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium">Add applicant {applicants.length + 1}</p>
          <div className="flex gap-2">
            <Input placeholder="Applicant name" value={newApplicantName} onChange={e => setNewApplicantName(e.target.value)} className="h-8 text-sm flex-1" />
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
            <Button size="sm" className="h-8 text-xs" onClick={addApplicant} disabled={!newApplicantName.trim()}>Add Applicant</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setShowAddApplicant(false); setNewApplicantName(''); if (secondApplicantPrompt === 'yes') setSecondApplicantPrompt('unknown'); }}>Cancel</Button>
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
        {Object.keys(TEMPLATES).map(t => (
          <Button key={t} variant="outline" size="sm" className="h-7 text-xs" onClick={() => loadTemplate(t, targetApplicantId)}>
            + {t}
          </Button>
        ))}
      </div>

      {applicants.length === 0 && documents.length === 0 && (
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
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{doc.name}</p>
                              {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                              {activeApplicantId === 'all' && applicant && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">For: {applicant.name}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("shrink-0 text-[10px] gap-1", cfg.color)}>
                            {cfg.icon} {cfg.label}
                          </Badge>
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
    </div>
  );
}
