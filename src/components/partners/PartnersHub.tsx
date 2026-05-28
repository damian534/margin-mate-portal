import { useMemo, useState } from 'react';
import { Company } from '@/components/CompanyManagement';
import { ReferrerProfileData } from '@/components/ReferrerProfile';
import { PartnerCompanyCard, PartnerCardAgent, PartnerCardLead } from './PartnerCompanyCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Trophy, Building2, User, Settings2 } from 'lucide-react';
import { startOfYear } from 'date-fns';

interface Lead extends PartnerCardLead {
  first_name?: string;
  last_name?: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string;
}

interface Props {
  companies: Company[];
  referrers: ReferrerProfileData[];
  contacts: Contact[];
  leads: Lead[];
  onOpenCompany: (company: Company) => void;
  onManageList?: () => void; // opens legacy CompanyManagement (for editing/adding companies)
}

type HealthFilter = 'all' | 'hot' | 'warm' | 'cold' | 'dormant';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function PartnersHub({ companies, referrers, contacts, leads, onOpenCompany, onManageList }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<HealthFilter>('all');

  // Group agents per company (by id OR name match) — mirrors CompanyCRM logic
  const companyMap = useMemo(() => {
    const map = new Map<string, { agents: PartnerCardAgent[]; leads: PartnerCardLead[] }>();
    companies.forEach(c => map.set(c.id, { agents: [], leads: [] }));

    const seen = new Set<string>();
    const agentToCompany = new Map<string, string>(); // user_id -> company.id

    referrers.forEach(r => {
      const c = companies.find(co =>
        (r.company_id && co.id === r.company_id) ||
        (r.company_name && co.name.toLowerCase() === r.company_name.toLowerCase())
      );
      if (!c) return;
      const key = r.email?.toLowerCase() || r.id;
      if (seen.has(`${c.id}:${key}`)) return;
      seen.add(`${c.id}:${key}`);
      map.get(c.id)!.agents.push({
        id: r.id,
        user_id: r.user_id,
        full_name: r.full_name,
        email: r.email,
      });
      if (r.user_id) agentToCompany.set(r.user_id, c.id);
    });

    contacts.forEach(ct => {
      if (ct.type !== 'referrer' || !ct.company) return;
      const c = companies.find(co => co.name.toLowerCase() === ct.company!.toLowerCase());
      if (!c) return;
      const key = ct.email?.toLowerCase() || ct.id;
      if (seen.has(`${c.id}:${key}`)) return;
      seen.add(`${c.id}:${key}`);
      map.get(c.id)!.agents.push({
        id: ct.id,
        user_id: `contact-${ct.id}`,
        full_name: `${ct.first_name} ${ct.last_name}`.trim(),
        email: ct.email,
      });
    });

    leads.forEach(l => {
      if (!l.referral_partner_id) return;
      const cid = agentToCompany.get(l.referral_partner_id);
      if (cid) map.get(cid)!.leads.push(l);
    });

    return map;
  }, [companies, referrers, contacts, leads]);

  // Independent referrers — those with no company
  const independent = useMemo(() => {
    const agents: PartnerCardAgent[] = [];
    const userIds = new Set<string>();
    referrers.forEach(r => {
      const hasCompany = r.company_id || (r.company_name && companies.some(c => c.name.toLowerCase() === r.company_name!.toLowerCase()));
      if (hasCompany) return;
      agents.push({ id: r.id, user_id: r.user_id, full_name: r.full_name, email: r.email });
      if (r.user_id) userIds.add(r.user_id);
    });
    const indieLeads = leads.filter(l => l.referral_partner_id && userIds.has(l.referral_partner_id));
    return { agents, leads: indieLeads };
  }, [companies, referrers, leads]);

  // Health derivation matches PartnerCompanyCard
  const healthOf = (cleads: PartnerCardLead[]): HealthFilter => {
    if (cleads.length === 0) return 'dormant';
    const last = cleads.reduce<Date | null>((a, l) => {
      const d = new Date(l.created_at);
      return !a || d > a ? d : a;
    }, null);
    if (!last) return 'dormant';
    const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 30) return 'hot';
    if (days <= 60) return 'warm';
    if (days <= 90) return 'cold';
    return 'dormant';
  };

  const visibleCompanies = useMemo(() => {
    const q = search.toLowerCase().trim();
    return companies.filter(c => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (filter !== 'all') {
        const cleads = companyMap.get(c.id)?.leads || [];
        if (healthOf(cleads) !== filter) return false;
      }
      return true;
    });
  }, [companies, search, filter, companyMap]);

  // Leaderboard (Settled YTD by company)
  const leaderboard = useMemo(() => {
    const yearStart = startOfYear(new Date());
    const rows = companies.map(c => {
      const cleads = companyMap.get(c.id)?.leads || [];
      const settled = cleads.filter(l => l.status === 'settled' && new Date(l.created_at) >= yearStart);
      return {
        id: c.id,
        name: c.name,
        settledValue: settled.reduce((s, l) => s + (l.loan_amount || 0), 0),
        settledCount: settled.length,
      };
    });
    return rows.sort((a, b) => b.settledValue - a.settledValue).slice(0, 5);
  }, [companies, companyMap]);

  // Top agents (by settled YTD)
  const topAgents = useMemo(() => {
    const yearStart = startOfYear(new Date());
    const byAgent = new Map<string, { name: string; value: number; count: number }>();
    leads.forEach(l => {
      if (l.status !== 'settled') return;
      if (new Date(l.created_at) < yearStart) return;
      if (!l.referral_partner_id) return;
      const r = referrers.find(rr => rr.user_id === l.referral_partner_id);
      const name = r?.full_name || r?.email || 'Unknown agent';
      const cur = byAgent.get(l.referral_partner_id) || { name, value: 0, count: 0 };
      cur.value += l.loan_amount || 0;
      cur.count += 1;
      byAgent.set(l.referral_partner_id, cur);
    });
    return Array.from(byAgent.values()).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [leads, referrers]);

  return (
    <div className="space-y-6">
      {/* Leaderboard */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top Companies — Settled YTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 || leaderboard.every(l => l.settledValue === 0) ? (
              <p className="text-sm text-muted-foreground">No settled deals this year yet.</p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.filter(l => l.settledValue > 0).map((l, i) => (
                  <li key={l.id} className="flex items-center gap-3 text-sm">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-amber-500/20 text-amber-700' : i === 1 ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate font-medium">{l.name}</span>
                    <span className="tabular-nums font-semibold">{fmt(l.settledValue)}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">({l.settledCount})</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Top Agents — Settled YTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topAgents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No settled deals this year yet.</p>
            ) : (
              <ol className="space-y-2">
                {topAgents.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-amber-500/20 text-amber-700' : i === 1 ? 'bg-muted text-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate font-medium">{a.name}</span>
                    <span className="tabular-nums font-semibold">{fmt(a.value)}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">({a.count})</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search partners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as HealthFilter)}>
            <TabsList>
              <TabsTrigger value="all">All <Badge variant="secondary" className="ml-1.5">{companies.length}</Badge></TabsTrigger>
              <TabsTrigger value="hot" className="data-[state=active]:bg-green-500/10 data-[state=active]:text-green-700">Hot</TabsTrigger>
              <TabsTrigger value="warm" className="data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700">Warm</TabsTrigger>
              <TabsTrigger value="cold" className="data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-700">Cold</TabsTrigger>
              <TabsTrigger value="dormant" className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-700">Dormant</TabsTrigger>
            </TabsList>
          </Tabs>
          {onManageList && (
            <Button variant="outline" size="sm" onClick={onManageList}>
              <Settings2 className="w-4 h-4 mr-1.5" /> Manage
            </Button>
          )}
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCompanies.map(c => {
          const entry = companyMap.get(c.id)!;
          return (
            <PartnerCompanyCard
              key={c.id}
              name={c.name}
              agents={entry.agents}
              leads={entry.leads}
              onClick={() => onOpenCompany(c)}
            />
          );
        })}

        {/* Independent referrers card */}
        {filter === 'all' && independent.agents.length > 0 && !search && (
          <PartnerCompanyCard
            name="Independent Referrers"
            isVirtual
            agents={independent.agents}
            leads={independent.leads}
            onClick={() => onManageList?.()}
          />
        )}
      </div>

      {visibleCompanies.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No partners match your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}