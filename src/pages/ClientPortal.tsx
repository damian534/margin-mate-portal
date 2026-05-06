import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Toaster as Sonner } from '@/components/ui/sonner';
import {
  FileText, Upload, CheckCircle2, Clock, XCircle, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Render text with URLs (and bare domains like bankstatements.com.au) as clickable links
function linkify(text: string): React.ReactNode {
  const regex = /((?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\.(?:com\.au|com|au|net|org|io|co)(?:\/[^\s]*)?)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const raw = match[0];
    const href = raw.startsWith('http') ? raw : `https://${raw}`;
    parts.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80"
      >
        {raw}
      </a>
    );
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

interface DocumentRequest {
  id: string;
  name: string;
  description: string | null;
  status: string;
  file_name: string | null;
  rejection_reason: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Required', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
  uploaded: { label: 'Uploaded', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Resubmit', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadName, setLeadName] = useState('');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadFirstName, setLeadFirstName] = useState('');
  const [leadLastName, setLeadLastName] = useState('');
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    validateAndLoad();
  }, [token]);

  const validateAndLoad = async () => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }

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
    setLeadEmail(data.lead_email || '');
    setLeadPhone(data.lead_phone || '');
    // Split lead_name into first/last
    const nameParts = (data.lead_name || '').split(' ');
    setLeadFirstName(nameParts[0] || '');
    setLeadLastName(nameParts.slice(1).join(' ') || '');
    setDocuments(data.documents || []);
    setLoading(false);
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
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: 'uploaded', file_name: file.name } : d));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-[Poppins,sans-serif]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
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

  if (!leadId) return null;

  return (
      <div className="min-h-screen bg-background font-[Poppins,sans-serif]">
        <Sonner />
        <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">Welcome, {leadName}</h1>
            <p className="text-sm text-muted-foreground">Please upload the requested documents below.</p>
          </div>

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
                            {doc.description && <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{linkify(doc.description)}</p>}
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
                            className="w-full gap-1.5 rounded-full"
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

          <p className="text-xs text-center text-muted-foreground pt-4">
            Your information is securely transmitted and stored. If you have any questions, please contact your broker.
          </p>
        </div>
      </div>
    );
  }

  if (!hasDocuments && !factFindComplete) {
    return (
      <>
        <Sonner />
        <MortgageFactFindWizard
          leadId={leadId}
          token={token}
          onComplete={() => setFactFindComplete(true)}
          prefill={{ email: leadEmail, phone: leadPhone, firstName: leadFirstName, lastName: leadLastName }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background font-[Poppins,sans-serif]">
      <Sonner />
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Welcome, {leadName}</h1>
          <p className="text-sm text-muted-foreground">Complete your fact find and upload documents below.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="factfind" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" /> Fact Find
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs">
              <Upload className="w-3.5 h-3.5" /> Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="factfind" className="mt-4">
            <MortgageFactFindWizard
              leadId={leadId}
              token={token}
              onComplete={() => {
                setFactFindComplete(true);
                if (hasDocuments) setActiveTab('documents');
              }}
              prefill={{ email: leadEmail, phone: leadPhone, firstName: leadFirstName, lastName: leadLastName }}
            />
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
                              {doc.description && <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{linkify(doc.description)}</p>}
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
                              className="w-full gap-1.5 rounded-full"
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
