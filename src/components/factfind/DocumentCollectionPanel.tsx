import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Upload, FileText, CheckCircle2, XCircle, Clock, Trash2, Download, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
}

interface DocumentCollectionPanelProps {
  leadId: string;
  isPreviewMode: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
  uploaded: { label: 'Uploaded', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Upload className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" /> },
};

export function DocumentCollectionPanel({ leadId, isPreviewMode }: DocumentCollectionPanelProps) {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchDocuments();
  }, [leadId]);

  const fetchDocuments = async () => {
    if (isPreviewMode) {
      setDocuments([
        { id: 'p1', lead_id: leadId, name: 'Payslips (last 3 months)', description: null, status: 'pending', file_path: null, file_name: null, file_size: null, uploaded_at: null, rejection_reason: null, created_at: new Date().toISOString() },
        { id: 'p2', lead_id: leadId, name: 'Bank Statements (last 3 months)', description: null, status: 'uploaded', file_path: null, file_name: 'bank-statements.pdf', file_size: 245000, uploaded_at: new Date().toISOString(), rejection_reason: null, created_at: new Date().toISOString() },
      ]);
      return;
    }
    const { data } = await supabase
      .from('document_requests')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });
    setDocuments((data as DocumentRequest[]) || []);
  };

  const addDocumentRequest = async () => {
    if (!newDocName.trim()) return;
    if (isPreviewMode) {
      setDocuments(prev => [...prev, {
        id: `preview-${Date.now()}`, lead_id: leadId, name: newDocName.trim(),
        description: newDocDescription.trim() || null, status: 'pending',
        file_path: null, file_name: null, file_size: null, uploaded_at: null,
        rejection_reason: null, created_at: new Date().toISOString(),
      }]);
      toast.success('Document request added (preview)');
    } else {
      const { error } = await supabase.from('document_requests').insert({
        lead_id: leadId,
        name: newDocName.trim(),
        description: newDocDescription.trim() || null,
      });
      if (error) { toast.error('Failed to add request'); return; }
      toast.success('Document request added');
      fetchDocuments();
    }
    setNewDocName('');
    setNewDocDescription('');
    setShowAddForm(false);
  };

  const deleteDocumentRequest = async (id: string) => {
    if (isPreviewMode) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success('Removed (preview)');
      return;
    }
    const doc = documents.find(d => d.id === id);
    if (doc?.file_path) {
      await supabase.storage.from('client-documents').remove([doc.file_path]);
    }
    await supabase.from('document_requests').delete().eq('id', id);
    toast.success('Document request removed');
    fetchDocuments();
  };

  const handleFileUpload = async (docId: string, file: File) => {
    if (isPreviewMode) {
      setDocuments(prev => prev.map(d => d.id === docId ? {
        ...d, status: 'uploaded', file_name: file.name, file_size: file.size,
        uploaded_at: new Date().toISOString(),
      } : d));
      toast.success('File uploaded (preview)');
      return;
    }

    const filePath = `${leadId}/${docId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) { toast.error('Upload failed: ' + uploadError.message); return; }

    await supabase.from('document_requests').update({
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      status: 'uploaded',
      uploaded_at: new Date().toISOString(),
    }).eq('id', docId);

    toast.success('File uploaded');
    fetchDocuments();
  };

  const updateStatus = async (docId: string, status: string, rejectionReason?: string) => {
    if (isPreviewMode) {
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status, rejection_reason: rejectionReason || null } : d));
      toast.success(`Status updated (preview)`);
      return;
    }
    const updates: any = { status };
    if (rejectionReason) updates.rejection_reason = rejectionReason;
    if (status === 'approved' || status === 'rejected') {
      const { data: userData } = await supabase.auth.getUser();
      updates.reviewed_by = userData?.user?.id;
      updates.reviewed_at = new Date().toISOString();
    }
    await supabase.from('document_requests').update(updates).eq('id', docId);
    toast.success('Status updated');
    fetchDocuments();
  };

  const downloadFile = async (doc: DocumentRequest) => {
    if (!doc.file_path || isPreviewMode) return;
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const pendingCount = documents.filter(d => d.status === 'pending').length;
  const uploadedCount = documents.filter(d => d.status === 'uploaded').length;
  const approvedCount = documents.filter(d => d.status === 'approved').length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3 text-sm">
        <div className="flex-1 bg-muted/50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-semibold">{documents.length}</p>
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

      {/* Add document request */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document Requests</h4>
        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-3 h-3" /> Request Document
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <Input
            placeholder="Document name (e.g. Payslips - last 3 months)"
            value={newDocName}
            onChange={(e) => setNewDocName(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Description (optional)"
            value={newDocDescription}
            onChange={(e) => setNewDocDescription(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs" onClick={addDocumentRequest} disabled={!newDocName.trim()}>Add</Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setShowAddForm(false); setNewDocName(''); setNewDocDescription(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No documents requested yet</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
            return (
              <div key={doc.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{doc.name}</p>
                      {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 text-[10px] gap-1", statusCfg.color)}>
                    {statusCfg.icon} {statusCfg.label}
                  </Badge>
                </div>

                {/* File info */}
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

                {/* Actions */}
                <div className="flex gap-1.5 flex-wrap">
                  {doc.status === 'pending' && (
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
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRefs.current[doc.id]?.click()}>
                        <Upload className="w-3 h-3" /> Upload
                      </Button>
                    </>
                  )}
                  {doc.status === 'uploaded' && (
                    <>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50" onClick={() => updateStatus(doc.id, 'approved')}>
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-700 border-red-200 hover:bg-red-50" onClick={() => {
                        const reason = window.prompt('Rejection reason:');
                        if (reason) updateStatus(doc.id, 'rejected', reason);
                      }}>
                        <XCircle className="w-3 h-3" /> Reject
                      </Button>
                    </>
                  )}
                  {doc.status === 'rejected' && (
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
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRefs.current[doc.id]?.click()}>
                        <Upload className="w-3 h-3" /> Re-upload
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => deleteDocumentRequest(doc.id)}>
                    <Trash2 className="w-3 h-3" /> Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
