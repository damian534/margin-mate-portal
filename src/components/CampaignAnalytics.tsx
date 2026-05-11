import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Mail, MailOpen, MousePointerClick, AlertTriangle, ShieldAlert, UserMinus, Send } from 'lucide-react';
import { format } from 'date-fns';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  status: string;
}

interface SendRow {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  status: string;
  sent_at: string | null;
  error: string | null;
}

interface EventRow {
  id: string;
  send_id: string | null;
  recipient_email: string;
  event_type: string;
  link_url: string | null;
  occurred_at: string;
}

const TYPE_COLOR: Record<string, string> = {
  delivered: 'bg-blue-100 text-blue-700',
  opened: 'bg-emerald-100 text-emerald-700',
  clicked: 'bg-violet-100 text-violet-700',
  bounced: 'bg-red-100 text-red-700',
  complained: 'bg-orange-100 text-orange-700',
  unsubscribed: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
};

function pct(n: number, d: number) {
  if (!d) return '0%';
  return `${((n / d) * 100).toFixed(1)}%`;
}

export function CampaignAnalytics({
  open, onOpenChange, campaign,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaign: Campaign | null;
}) {
  const [sends, setSends] = useState<SendRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open || !campaign) return;
    setLoading(true);
    Promise.all([
      supabase.from('email_campaign_sends')
        .select('id, recipient_email, recipient_name, status, sent_at, error')
        .eq('campaign_id', campaign.id)
        .order('recipient_email')
        .range(0, 9999),
      supabase.from('email_events')
        .select('id, send_id, recipient_email, event_type, link_url, occurred_at')
        .eq('campaign_id', campaign.id)
        .order('occurred_at', { ascending: false })
        .range(0, 19999),
    ]).then(([s, e]) => {
      setSends((s.data || []) as any);
      setEvents((e.data || []) as any);
      setLoading(false);
    });
  }, [open, campaign?.id]);

  const stats = useMemo(() => {
    const sentSends = sends.filter(s => s.status === 'sent');
    const total = sentSends.length;
    const uniq = (type: string) => new Set(events.filter(e => e.event_type === type).map(e => e.recipient_email.toLowerCase())).size;
    return {
      total,
      delivered: uniq('delivered'),
      opens: events.filter(e => e.event_type === 'opened').length,
      uniqOpens: uniq('opened'),
      clicks: events.filter(e => e.event_type === 'clicked').length,
      uniqClicks: uniq('clicked'),
      bounces: uniq('bounced'),
      complaints: uniq('complained'),
      unsubs: uniq('unsubscribed'),
      failed: sends.filter(s => s.status === 'failed').length,
    };
  }, [sends, events]);

  // Per-recipient summary
  const recipientData = useMemo(() => {
    const map = new Map<string, { send: SendRow; opened: number; clicked: number; bounced: boolean; unsubscribed: boolean; lastEvent: string | null }>();
    sends.forEach(s => {
      map.set(s.recipient_email.toLowerCase(), { send: s, opened: 0, clicked: 0, bounced: false, unsubscribed: false, lastEvent: s.sent_at });
    });
    events.forEach(e => {
      const k = e.recipient_email.toLowerCase();
      const row = map.get(k);
      if (!row) return;
      if (e.event_type === 'opened') row.opened++;
      if (e.event_type === 'clicked') row.clicked++;
      if (e.event_type === 'bounced') row.bounced = true;
      if (e.event_type === 'unsubscribed') row.unsubscribed = true;
      if (!row.lastEvent || e.occurred_at > row.lastEvent) row.lastEvent = e.occurred_at;
    });
    return Array.from(map.values());
  }, [sends, events]);

  const filteredRecipients = useMemo(() => {
    if (!search.trim()) return recipientData;
    const q = search.toLowerCase();
    return recipientData.filter(r =>
      r.send.recipient_email.toLowerCase().includes(q) ||
      (r.send.recipient_name || '').toLowerCase().includes(q),
    );
  }, [recipientData, search]);

  // Top links
  const linkStats = useMemo(() => {
    const counts = new Map<string, { total: number; uniq: Set<string> }>();
    events.filter(e => e.event_type === 'clicked' && e.link_url).forEach(e => {
      const u = e.link_url!;
      if (!counts.has(u)) counts.set(u, { total: 0, uniq: new Set() });
      const v = counts.get(u)!;
      v.total++;
      v.uniq.add(e.recipient_email.toLowerCase());
    });
    return Array.from(counts.entries())
      .map(([url, v]) => ({ url, total: v.total, uniq: v.uniq.size }))
      .sort((a, b) => b.total - a.total);
  }, [events]);

  // Hourly opens chart (relative to send time, 0-48h)
  const openChart = useMemo(() => {
    const baseTime = campaign?.sent_at ? new Date(campaign.sent_at).getTime() : null;
    if (!baseTime) return [];
    const buckets: Record<number, number> = {};
    events.filter(e => e.event_type === 'opened').forEach(e => {
      const dt = new Date(e.occurred_at).getTime();
      const hour = Math.floor((dt - baseTime) / (1000 * 60 * 60));
      if (hour < 0 || hour > 71) return;
      buckets[hour] = (buckets[hour] || 0) + 1;
    });
    const arr: { hour: string; opens: number }[] = [];
    for (let h = 0; h <= 71; h++) {
      arr.push({ hour: `${h}h`, opens: buckets[h] || 0 });
    }
    return arr;
  }, [events, campaign?.sent_at]);

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {campaign.name}
            <Badge variant={campaign.status === 'sent' ? 'default' : 'outline'}>{campaign.status}</Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {campaign.subject} · {campaign.sent_at ? format(new Date(campaign.sent_at), 'dd MMM yyyy HH:mm') : 'Not sent'}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading analytics...</div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="recipients">Recipients</TabsTrigger>
              <TabsTrigger value="links">Link Activity</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={<Send className="w-4 h-4" />} label="Sent" value={stats.total} />
                <StatCard icon={<Mail className="w-4 h-4 text-blue-600" />} label="Delivered" value={stats.delivered} sub={pct(stats.delivered, stats.total)} />
                <StatCard icon={<MailOpen className="w-4 h-4 text-emerald-600" />} label="Unique opens" value={stats.uniqOpens} sub={`${pct(stats.uniqOpens, stats.total)} · ${stats.opens} total`} />
                <StatCard icon={<MousePointerClick className="w-4 h-4 text-violet-600" />} label="Unique clicks" value={stats.uniqClicks} sub={`${pct(stats.uniqClicks, stats.total)} · ${stats.clicks} total`} />
                <StatCard icon={<AlertTriangle className="w-4 h-4 text-red-600" />} label="Bounced" value={stats.bounces} sub={pct(stats.bounces, stats.total)} />
                <StatCard icon={<ShieldAlert className="w-4 h-4 text-orange-600" />} label="Complaints" value={stats.complaints} sub={pct(stats.complaints, stats.total)} />
                <StatCard icon={<UserMinus className="w-4 h-4 text-amber-600" />} label="Unsubscribes" value={stats.unsubs} sub={pct(stats.unsubs, stats.total)} />
                <StatCard icon={<AlertTriangle className="w-4 h-4 text-destructive" />} label="Send failures" value={stats.failed} />
              </div>

              {openChart.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Opens over time (first 72 hours)</h3>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={openChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={5} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="opens" fill="hsl(142, 71%, 45%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {events.length === 0 && (
                <Card>
                  <CardContent className="py-6 text-center text-xs text-muted-foreground">
                    No engagement events yet. Once your Resend webhook is connected, opens, clicks, bounces and unsubscribes will start appearing here within seconds.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recipients" className="mt-4">
              <div className="mb-3">
                <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Opens</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead>Last activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipients.slice(0, 500).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          <div className="font-medium">{r.send.recipient_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{r.send.recipient_email}</div>
                        </TableCell>
                        <TableCell>
                          {r.send.status === 'failed' ? <Badge variant="destructive">Failed</Badge>
                            : r.unsubscribed ? <Badge className="bg-amber-100 text-amber-700">Unsubscribed</Badge>
                            : r.bounced ? <Badge className="bg-red-100 text-red-700">Bounced</Badge>
                            : r.clicked > 0 ? <Badge className="bg-violet-100 text-violet-700">Clicked</Badge>
                            : r.opened > 0 ? <Badge className="bg-emerald-100 text-emerald-700">Opened</Badge>
                            : <Badge variant="outline">Sent</Badge>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.opened}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.clicked}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.lastEvent ? format(new Date(r.lastEvent), 'dd MMM HH:mm') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredRecipients.length > 500 && (
                  <div className="p-3 text-xs text-center text-muted-foreground border-t">
                    Showing first 500 of {filteredRecipients.length} recipients. Use search to narrow down.
                  </div>
                )}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="links" className="mt-4">
              {linkStats.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No clicks tracked yet for this campaign.
                </CardContent></Card>
              ) : (
                <Card><CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Link</TableHead>
                        <TableHead className="text-right">Total clicks</TableHead>
                        <TableHead className="text-right">Unique clicks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkStats.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs max-w-md truncate">
                            <a href={l.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{l.url}</a>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{l.total}</TableCell>
                          <TableCell className="text-right tabular-nums">{l.uniq}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              {events.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No events yet.
                </CardContent></Card>
              ) : (
                <Card><CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.slice(0, 500).map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs whitespace-nowrap">{format(new Date(e.occurred_at), 'dd MMM HH:mm:ss')}</TableCell>
                          <TableCell><Badge className={TYPE_COLOR[e.event_type] || ''}>{e.event_type}</Badge></TableCell>
                          <TableCell className="text-xs">{e.recipient_email}</TableCell>
                          <TableCell className="text-xs max-w-sm truncate text-muted-foreground">{e.link_url || ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon} {label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}