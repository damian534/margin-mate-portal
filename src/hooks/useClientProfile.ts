import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClientContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string;
  notes: string | null;
  created_at: string;
  audience_tags?: string[] | null;
  email_opt_out?: boolean | null;
  co_applicant_contact_id?: string | null;
}

export interface ClientDeal {
  id: string;
  opportunity_name: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  loan_amount: number | null;
  loan_purpose: string | null;
  status: string;
  wip_status: string | null;
  settled_date: string | null;
  estimated_settlement_date: string | null;
  created_at: string;
  updated_at: string;
  source: string | null;
  role: 'applicant' | 'co-applicant' | 'referrer';
  lenders: string[];
}

export interface ClientTask {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  lead_id: string | null;
}

export interface ClientTimelineEntry {
  id: string;
  lead_id: string;
  kind: 'note' | 'communication';
  channel?: string | null;
  title: string;
  body: string | null;
  occurred_at: string;
}

export interface ClientDocument {
  id: string;
  lead_id: string;
  name: string;
  section: string | null;
  status: string;
  file_path: string | null;
  file_name: string | null;
  uploaded_at: string | null;
}

export interface ClientProfileData {
  contact: ClientContact | null;
  deals: ClientDeal[];
  primaryLeadId: string | null;
  tasks: ClientTask[];
  timeline: ClientTimelineEntry[];
  documents: ClientDocument[];
  loading: boolean;
  notFound: boolean;
  refresh: () => void;
}

const CONTACT_LINK_COLUMNS = [
  'source_contact_id',
  'co_applicant_contact_id',
  'co_applicant_contact_id_2',
  'co_applicant_contact_id_3',
  'referred_by_contact_id',
];

/**
 * Resolves a contact and every deal they touch (as applicant, co-applicant or referrer),
 * then loads the tasks, activity and documents across that whole set of deals.
 */
export function useClientProfile(contactId: string | undefined, isPreviewMode: boolean): ClientProfileData {
  const [contact, setContact] = useState<ClientContact | null>(null);
  const [deals, setDeals] = useState<ClientDeal[]>([]);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [timeline, setTimeline] = useState<ClientTimelineEntry[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!contactId) return;
    if (isPreviewMode) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFound(false);

      const { data: c } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, company, type, notes, created_at, audience_tags, email_opt_out, co_applicant_contact_id')
        .eq('id', contactId)
        .maybeSingle();

      if (cancelled) return;
      if (!c) { setNotFound(true); setLoading(false); return; }
      setContact(c as ClientContact);

      const orFilter = CONTACT_LINK_COLUMNS.map(col => `${col}.eq.${contactId}`).join(',');
      const { data: linked } = await supabase
        .from('leads')
        .select('id, opportunity_name, first_name, last_name, email, phone, loan_amount, loan_purpose, status, wip_status, settled_date, estimated_settlement_date, created_at, updated_at, source, source_contact_id, co_applicant_contact_id, co_applicant_contact_id_2, co_applicant_contact_id_3, referred_by_contact_id')
        .or(orFilter)
        .order('created_at', { ascending: false });

      const byId = new Map<string, any>();
      ((linked as any[]) || []).forEach(l => byId.set(l.id, l));

      // Also catch deals created directly for this person (matched on email, or full name)
      const email = (c as ClientContact).email?.trim();
      if (email) {
        const { data: byEmail } = await supabase
          .from('leads')
          .select('id, opportunity_name, first_name, last_name, email, phone, loan_amount, loan_purpose, status, wip_status, settled_date, estimated_settlement_date, created_at, updated_at, source, source_contact_id, co_applicant_contact_id, co_applicant_contact_id_2, co_applicant_contact_id_3, referred_by_contact_id')
          .ilike('email', email);
        ((byEmail as any[]) || []).forEach(l => { if (!byId.has(l.id)) byId.set(l.id, l); });
      }

      const rows = Array.from(byId.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const leadIds = rows.map(r => r.id);

      // Lenders per deal
      const lendersByLead = new Map<string, string[]>();
      if (leadIds.length) {
        const { data: splits } = await supabase
          .from('loan_splits')
          .select('lead_id, lender')
          .in('lead_id', leadIds);
        ((splits as any[]) || []).forEach(s => {
          if (!s.lender) return;
          const arr = lendersByLead.get(s.lead_id) || [];
          if (!arr.includes(s.lender)) arr.push(s.lender);
          lendersByLead.set(s.lead_id, arr);
        });
      }

      const contactName = `${(c as ClientContact).first_name} ${(c as ClientContact).last_name}`.trim().toLowerCase();
      const mapped: ClientDeal[] = rows.map(r => {
        const leadName = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim().toLowerCase();
        let role: ClientDeal['role'] = 'applicant';
        if (leadName && leadName === contactName) role = 'applicant';
        else if ([r.co_applicant_contact_id, r.co_applicant_contact_id_2, r.co_applicant_contact_id_3].includes(contactId)) role = 'co-applicant';
        else if (r.source_contact_id === contactId || r.referred_by_contact_id === contactId) role = 'referrer';
        return { ...r, role, lenders: lendersByLead.get(r.id) || [] } as ClientDeal;
      });

      if (cancelled) return;
      setDeals(mapped);

      if (!leadIds.length) {
        setTasks([]); setTimeline([]); setDocuments([]); setLoading(false);
        return;
      }

      const [tasksRes, notesRes, commsRes, docsRes] = await Promise.all([
        supabase.from('tasks').select('id, title, due_date, completed, lead_id').in('lead_id', leadIds).order('due_date', { ascending: true }),
        supabase.from('notes').select('id, lead_id, content, created_at').in('lead_id', leadIds).order('created_at', { ascending: false }).limit(200),
        supabase.from('lead_communications').select('id, lead_id, channel, direction, subject, body, participant_name, occurred_at').in('lead_id', leadIds).order('occurred_at', { ascending: false }).limit(200),
        supabase.from('document_requests').select('id, lead_id, name, section, status, file_path, file_name, uploaded_at').in('lead_id', leadIds).order('created_at', { ascending: true }),
      ]);

      if (cancelled) return;

      setTasks(((tasksRes.data as any[]) || []) as ClientTask[]);
      setDocuments(((docsRes.data as any[]) || []) as ClientDocument[]);

      const entries: ClientTimelineEntry[] = [
        ...(((notesRes.data as any[]) || []).map(n => ({
          id: `note-${n.id}`,
          lead_id: n.lead_id,
          kind: 'note' as const,
          title: 'Note',
          body: n.content,
          occurred_at: n.created_at,
        }))),
        ...(((commsRes.data as any[]) || []).map(m => ({
          id: `comm-${m.id}`,
          lead_id: m.lead_id,
          kind: 'communication' as const,
          channel: m.channel,
          title: m.subject || `${m.direction === 'inbound' ? 'Inbound' : 'Outbound'} ${m.channel}`,
          body: m.body || m.participant_name,
          occurred_at: m.occurred_at,
        }))),
      ].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

      setTimeline(entries);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [contactId, isPreviewMode, tick]);

  return {
    contact,
    deals,
    primaryLeadId: deals[0]?.id ?? null,
    tasks,
    timeline,
    documents,
    loading,
    notFound,
    refresh,
  };
}
