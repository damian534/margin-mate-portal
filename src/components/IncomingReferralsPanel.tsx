import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Check, X, Inbox, Send } from 'lucide-react';

interface ReferralRow {
  id: string;
  lead_id: string;
  from_broker_id: string;
  to_broker_id: string;
  message: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  lead?: { first_name: string; last_name: string; loan_amount: number | null; loan_purpose: string | null } | null;
  from_broker?: { full_name: string | null; email: string | null } | null;
  to_broker?: { full_name: string | null; email: string | null } | null;
}

export function IncomingReferralsPanel() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<ReferralRow[]>([]);
  const [outgoing, setOutgoing] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: refs } = await supabase
      .from('lead_referrals')
      .select('*')
      .or(`to_broker_id.eq.${user.id},from_broker_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    const rows = (refs || []) as ReferralRow[];

    const leadIds = [...new Set(rows.map(r => r.lead_id))];
    const brokerIds = [...new Set(rows.flatMap(r => [r.from_broker_id, r.to_broker_id]))];

    const [{ data: leads }, { data: profiles }] = await Promise.all([
      leadIds.length ? supabase.from('leads').select('id, first_name, last_name, loan_amount, loan_purpose').in('id', leadIds) : Promise.resolve({ data: [] as any[] }),
      brokerIds.length ? supabase.from('profiles').select('user_id, full_name, email').in('user_id', brokerIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const leadMap = new Map((leads || []).map((l: any) => [l.id, l]));
    const brokerMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const enriched = rows.map(r => ({
      ...r,
      lead: leadMap.get(r.lead_id) || null,
      from_broker: brokerMap.get(r.from_broker_id) || null,
      to_broker: brokerMap.get(r.to_broker_id) || null,
    }));
    setIncoming(enriched.filter(r => r.to_broker_id === user.id));
    setOutgoing(enriched.filter(r => r.from_broker_id === user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const respond = async (id: string, action: 'accept' | 'decline') => {
    const fn = action === 'accept' ? 'accept_lead_referral' : 'decline_lead_referral';
    const { error } = await supabase.rpc(fn as any, { _referral_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success(action === 'accept' ? 'Referral accepted — lead is now yours' : 'Referral declined');
    fetchAll();
  };

  const renderStatus = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      accepted: 'bg-green-500/10 text-green-600 border-green-500/20',
      declined: 'bg-destructive/10 text-destructive border-destructive/20',
      cancelled: 'bg-muted text-muted-foreground',
    };
    return <Badge variant="outline" className={map[s] || ''}>{s}</Badge>;
  };

  const Row = ({ r, mode }: { r: ReferralRow; mode: 'in' | 'out' }) => (
    <div className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{r.lead ? `${r.lead.first_name} ${r.lead.last_name}` : 'Lead unavailable'}</span>
          {renderStatus(r.status)}
        </div>
        <div className="text-xs text-muted-foreground">
          {mode === 'in' ? 'From' : 'To'}: {(mode === 'in' ? r.from_broker : r.to_broker)?.full_name || (mode === 'in' ? r.from_broker : r.to_broker)?.email || 'Unknown broker'}
          {' · '}{format(new Date(r.created_at), 'dd MMM yyyy')}
        </div>
        {r.lead?.loan_amount != null && (
          <div className="text-xs text-muted-foreground">Loan: ${r.lead.loan_amount.toLocaleString()}{r.lead.loan_purpose ? ` · ${r.lead.loan_purpose}` : ''}</div>
        )}
        {r.message && <p className="text-sm bg-muted/50 rounded p-2">{r.message}</p>}
      </div>
      {mode === 'in' && r.status === 'pending' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => respond(r.id, 'accept')}><Check className="w-4 h-4 mr-1" />Accept</Button>
          <Button size="sm" variant="outline" onClick={() => respond(r.id, 'decline')}><X className="w-4 h-4 mr-1" />Decline</Button>
        </div>
      )}
    </div>
  );

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading referrals...</p>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Inbox className="w-4 h-4" />Incoming ({incoming.filter(r => r.status === 'pending').length} pending)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {incoming.length === 0 ? <p className="text-sm text-muted-foreground">No incoming referrals.</p> : incoming.map(r => <Row key={r.id} r={r} mode="in" />)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4" />Sent</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {outgoing.length === 0 ? <p className="text-sm text-muted-foreground">No sent referrals.</p> : outgoing.map(r => <Row key={r.id} r={r} mode="out" />)}
        </CardContent>
      </Card>
    </div>
  );
}