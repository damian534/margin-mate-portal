import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, subDays, format, parseISO, getISOWeek } from 'date-fns';

export interface BrokerActivity {
  id: string;
  broker_id: string;
  activity_date: string;
  outbound_calls: number;
  meetings_held: number;
  meetings_booked: number;
  referral_meetings_booked: number;
}

export interface ActivityTargets {
  id: string;
  broker_id: string;
  week_number: number;
  year: number;
  meetings_target_week: number;
  outbound_calls_target_week: number;
  referral_meetings_target_week: number;
}

export function useBrokerActivity(selectedBrokerId?: string) {
  const { user, role, isPreviewMode, effectiveBrokerId: authBrokerId } = useAuth();
  const [activities, setActivities] = useState<BrokerActivity[]>([]);
  const [targets, setTargets] = useState<ActivityTargets | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = role === 'super_admin';
  const effectiveBrokerId = selectedBrokerId && isSuperAdmin ? selectedBrokerId : authBrokerId;

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const fetchActivities = useCallback(async () => {
    if (isPreviewMode) {
      setActivities(generateSampleActivities());
      setLoading(false);
      return;
    }
    if (!effectiveBrokerId) return;

    setLoading(true);
    let query = supabase
      .from('broker_activity')
      .select('*')
      .gte('activity_date', thirtyDaysAgo)
      .order('activity_date', { ascending: false });

    if (!isSuperAdmin || selectedBrokerId) {
      query = query.eq('broker_id', effectiveBrokerId);
    }

    const { data, error } = await query;
    if (error) { console.error('Error fetching activity:', error); toast.error('Failed to load activity'); }
    setActivities((data as BrokerActivity[]) || []);
    setLoading(false);
  }, [isPreviewMode, effectiveBrokerId, isSuperAdmin, selectedBrokerId, thirtyDaysAgo]);

  const fetchTargets = useCallback(async () => {
    if (isPreviewMode || !effectiveBrokerId) return;
    const now = new Date();
    const wk = getISOWeek(now);
    const yr = now.getFullYear();
    const { data } = await supabase
      .from('broker_activity_targets')
      .select('*')
      .eq('broker_id', effectiveBrokerId)
      .eq('week_number', wk)
      .eq('year', yr)
      .maybeSingle();
    setTargets(data as ActivityTargets | null);
  }, [isPreviewMode, effectiveBrokerId]);

  useEffect(() => { fetchActivities(); fetchTargets(); }, [fetchActivities, fetchTargets]);

  const todayActivity = useMemo(() =>
    activities.find(a => a.activity_date === today) || null
  , [activities, today]);

  const weeklyTotals = useMemo(() => {
    const weekItems = activities.filter(a => a.activity_date >= weekStart && a.activity_date <= weekEnd);
    return {
      meetings_held: weekItems.reduce((s, a) => s + a.meetings_held, 0),
      meetings_booked: weekItems.reduce((s, a) => s + a.meetings_booked, 0),
      outbound_calls: weekItems.reduce((s, a) => s + a.outbound_calls, 0),
      referral_meetings_booked: weekItems.reduce((s, a) => s + a.referral_meetings_booked, 0),
    };
  }, [activities, weekStart, weekEnd]);

  const last30Days = useMemo(() =>
    activities
      .filter(a => a.activity_date >= thirtyDaysAgo)
      .sort((a, b) => a.activity_date.localeCompare(b.activity_date))
  , [activities, thirtyDaysAgo]);

  const saveActivity = async (data: { outbound_calls: number; meetings_held: number; meetings_booked: number; referral_meetings_booked: number }) => {
    if (isPreviewMode) {
      const existing = activities.find(a => a.activity_date === today);
      if (existing) {
        setActivities(prev => prev.map(a => a.activity_date === today ? { ...a, ...data } : a));
      } else {
        setActivities(prev => [{ id: crypto.randomUUID(), broker_id: 'preview', activity_date: today, ...data }, ...prev]);
      }
      toast.success('Activity saved (preview)');
      return;
    }
    if (!user?.id) return;

    const payload = { broker_id: effectiveBrokerId || user.id, activity_date: today, ...data };
    const { error } = await supabase
      .from('broker_activity')
      .upsert(payload as any, { onConflict: 'broker_id,activity_date' });
    if (error) { toast.error('Failed to save activity'); console.error(error); return; }
    toast.success('Activity saved');
    fetchActivities();
  };

  const saveTargets = async (data: { meetings_target_week: number; outbound_calls_target_week: number; referral_meetings_target_week: number }, brokerId: string) => {
    if (isPreviewMode) { toast.success('Targets saved (preview)'); return; }
    const now = new Date();
    const payload = { broker_id: brokerId, week_number: getISOWeek(now), year: now.getFullYear(), ...data };
    const { error } = await supabase
      .from('broker_activity_targets')
      .upsert(payload as any, { onConflict: 'broker_id,week_number,year' });
    if (error) { toast.error('Failed to save targets'); console.error(error); return; }
    toast.success('Targets saved');
    fetchTargets();
  };

  // Leaderboard: all brokers this week (super admin only)
  const [leaderboard, setLeaderboard] = useState<{ broker_id: string; broker_name: string; meetings_held: number; outbound_calls: number; referral_meetings_booked: number }[]>([]);

  const fetchLeaderboard = useCallback(async () => {
    if (!isSuperAdmin || isPreviewMode) return;
    const { data: allActs } = await supabase
      .from('broker_activity')
      .select('*')
      .gte('activity_date', weekStart)
      .lte('activity_date', weekEnd);
    if (!allActs?.length) { setLeaderboard([]); return; }

    const brokerMap: Record<string, { meetings_held: number; outbound_calls: number; referral_meetings_booked: number }> = {};
    (allActs as BrokerActivity[]).forEach(a => {
      if (!brokerMap[a.broker_id]) brokerMap[a.broker_id] = { meetings_held: 0, outbound_calls: 0, referral_meetings_booked: 0 };
      brokerMap[a.broker_id].meetings_held += a.meetings_held;
      brokerMap[a.broker_id].outbound_calls += a.outbound_calls;
      brokerMap[a.broker_id].referral_meetings_booked += a.referral_meetings_booked;
    });

    const brokerIds = Object.keys(brokerMap);
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', brokerIds);
    const nameMap: Record<string, string> = {};
    (profiles || []).forEach(p => { if (p.user_id) nameMap[p.user_id] = p.full_name || 'Unknown'; });

    const board = brokerIds.map(id => ({
      broker_id: id,
      broker_name: nameMap[id] || 'Unknown',
      ...brokerMap[id],
    })).sort((a, b) => b.meetings_held - a.meetings_held);

    setLeaderboard(board);
  }, [isSuperAdmin, isPreviewMode, weekStart, weekEnd]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  return { activities, todayActivity, weeklyTotals, targets, last30Days, leaderboard, loading, isSuperAdmin, saveActivity, saveTargets, refetch: fetchActivities };
}

function generateSampleActivities(): BrokerActivity[] {
  const result: BrokerActivity[] = [];
  for (let i = 0; i < 30; i++) {
    const d = subDays(new Date(), i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    result.push({
      id: `sample-act-${i}`,
      broker_id: 'preview',
      activity_date: format(d, 'yyyy-MM-dd'),
      outbound_calls: 5 + Math.floor(Math.random() * 15),
      meetings_held: Math.floor(Math.random() * 5),
      meetings_booked: Math.floor(Math.random() * 4),
      referral_meetings_booked: Math.floor(Math.random() * 3),
    });
  }
  return result;
}
