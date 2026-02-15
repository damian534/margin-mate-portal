import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { useSettlements } from '@/hooks/useSettlements';
import { useBrokerActivity } from '@/hooks/useBrokerActivity';
import { useAuth } from '@/hooks/useAuth';
import { SettlementKPIs } from '@/components/settlements/SettlementKPIs';
import { SettlementFiltersBar } from '@/components/settlements/SettlementFilters';
import { SettlementTable } from '@/components/settlements/SettlementTable';
import { SettlementCharts } from '@/components/settlements/SettlementCharts';
import { AddSettlementDialog } from '@/components/settlements/AddSettlementDialog';
import { DailyActivityKPIs } from '@/components/activity/DailyActivityKPIs';
import { WeeklyActivitySummary } from '@/components/activity/WeeklyActivitySummary';
import { LogActivityPanel } from '@/components/activity/LogActivityPanel';
import { ActivityTrendChart } from '@/components/activity/ActivityTrendChart';
import { ActivityLeaderboard } from '@/components/activity/ActivityLeaderboard';
import { SetTargetsPanel } from '@/components/activity/SetTargetsPanel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ViewMode = 'deals' | 'performance' | 'activity';

export default function Settlements() {
  const { role, isPreviewMode } = useAuth();
  const { settlements, allSettlements, loading, kpis, filters, filterOptions, updateFilter, resetFilters, addSettlement, updateSettlement, deleteSettlement, isSuperAdmin, refetch } = useSettlements();
  const [viewMode, setViewMode] = useState<ViewMode>('deals');
  const [brokers, setBrokers] = useState<{ id: string; name: string }[]>([]);

  const { todayActivity, weeklyTotals, targets, last30Days, leaderboard, saveActivity, saveTargets } = useBrokerActivity(
    isSuperAdmin && filters.brokerId !== 'all' ? filters.brokerId : undefined
  );

  useEffect(() => {
    if (!isSuperAdmin || isPreviewMode) return;
    const fetchBrokers = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').in('role', ['broker', 'super_admin']);
      if (!roles?.length) return;
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', roles.map(r => r.user_id));
      setBrokers((profiles || []).map(p => ({ id: p.user_id || '', name: p.full_name || 'Unknown' })));
    };
    fetchBrokers();
  }, [isSuperAdmin, isPreviewMode]);

  const exportCSV = () => {
    const headers = ['Settlement Date', 'Client Name', 'Loan Amount', 'Lender', 'Application Type', 'Lead Source', 'Status', 'Security Address'];
    const rows = settlements.map(s => [s.settlement_date, s.client_name, s.loan_amount, s.lender || '', s.application_type || '', s.lead_source || '', s.status, s.security_address || '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settlements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">Settlements</h1>
            <p className="text-muted-foreground">Track and manage your settlement performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <AddSettlementDialog onAdd={addSettlement} />
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="deals">Deals View</TabsTrigger>
              <TabsTrigger value="performance">Performance View</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {viewMode === 'deals' ? (
          <>
            {/* KPIs */}
            <SettlementKPIs kpis={kpis} />

            {/* Filters */}
            <Card>
              <CardContent className="py-4">
                <SettlementFiltersBar
                  filters={filters}
                  filterOptions={filterOptions}
                  isSuperAdmin={isSuperAdmin}
                  brokers={brokers}
                  updateFilter={updateFilter}
                  resetFilters={resetFilters}
                />
              </CardContent>
            </Card>

            {loading ? (
              <div className="text-center py-16 text-muted-foreground">Loading settlements...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Volume', value: `$${(kpis.totalSettledVolume + kpis.totalPendingVolume).toLocaleString()}` },
                    { label: 'Settled Volume', value: `$${kpis.totalSettledVolume.toLocaleString()}` },
                    { label: 'Pipeline Volume', value: `$${kpis.totalPendingVolume.toLocaleString()}` },
                    { label: 'Avg Loan', value: `$${Math.round(kpis.avgLoanSize).toLocaleString()}` },
                    { label: 'Total Deals', value: kpis.totalDeals.toString() },
                    { label: 'MoM Growth', value: `${kpis.momGrowth >= 0 ? '+' : ''}${kpis.momGrowth.toFixed(1)}%` },
                  ].map(s => (
                    <div key={s.label} className="bg-muted/40 rounded-lg px-4 py-3">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-base font-bold font-heading">{s.value}</p>
                    </div>
                  ))}
                </div>
                <SettlementTable settlements={settlements} onUpdate={updateSettlement} onDelete={deleteSettlement} lenders={filterOptions.lenders} leadSources={filterOptions.leadSources} />
              </>
            )}
          </>
        ) : viewMode === 'performance' ? (
          /* ===== PERFORMANCE VIEW ===== */
          <div className="space-y-6">
            {/* Settlement KPIs */}
            <div>
              <h2 className="text-lg font-heading font-semibold mb-3">Settlements & Pipeline</h2>
              <SettlementKPIs kpis={kpis} />
            </div>

            {/* Settlement Charts */}
            <SettlementCharts settlements={settlements} />
          </div>
        ) : (
          /* ===== ACTIVITY VIEW ===== */
          <div className="space-y-6">
            {/* Daily Activity */}
            <div>
              <h2 className="text-lg font-heading font-semibold mb-3">Daily & Weekly Activity</h2>
              <DailyActivityKPIs
                todayActivity={todayActivity}
                weeklyReferralMeetings={weeklyTotals.referral_meetings_booked}
              />
            </div>

            {/* Weekly Summary + Targets */}
            <WeeklyActivitySummary weeklyTotals={weeklyTotals} targets={targets} />

            {/* Log Today's Activity */}
            <LogActivityPanel todayActivity={todayActivity} onSave={saveActivity} />

            {/* Set Targets (Super Admin only) */}
            {isSuperAdmin && (
              <SetTargetsPanel targets={targets} brokers={brokers} onSave={saveTargets} />
            )}

            {/* 30-Day Trend */}
            <ActivityTrendChart activities={last30Days} />

            {/* Leaderboard (Admin only) */}
            {isSuperAdmin && <ActivityLeaderboard data={leaderboard} />}
          </div>
        )}
      </main>
    </div>
  );
}
