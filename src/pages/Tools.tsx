import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useToolVisibility } from '@/hooks/useToolVisibility';
import {
  TrendingUp,
  Calculator,
  Settings,
  Landmark,
  Briefcase,
  Building2,
  PiggyBank,
} from 'lucide-react';
import { useState } from 'react';

const tools = [
  { id: 'sell-upgrade-simulator', name: 'Sell & Upgrade Timeline Simulator', description: 'Model what happens if a vendor sells now vs waits. Includes equity, costs, growth and upgrade gap.', icon: TrendingUp, path: '/tools/sell-upgrade-simulator' },
  { id: 'loan-repayment', name: 'Loan Repayment Calculator', description: 'Enter loan amount, rate and term — see monthly, fortnightly and weekly repayments plus total interest.', icon: Calculator, path: '/tools/loan-repayment' },
  { id: 'stamp-duty', name: 'Stamp Duty Calculator', description: 'Estimate stamp duty across all Australian states with first home buyer concessions.', icon: Landmark, path: '/tools/stamp-duty' },
  { id: 'negative-gearing', name: 'Investment Property Calculator', description: 'Negative gearing tax benefits, cashflow analysis, depreciation, and long-term equity projections.', icon: TrendingUp, path: '/tools/negative-gearing', brokerOnly: true },
  { id: 'portfolio-advisor', name: 'Portfolio Advisor', description: 'Multi-property portfolio analysis with CGT, hold vs sell scenarios, and combined projections.', icon: Briefcase, path: '/tools/portfolio-advisor', brokerOnly: true },
  { id: 'feasibility', name: 'Development Feasibility', description: 'Model land + build + finance with multi-scenario comparison, partner equity splits, and sensitivity analysis.', icon: Building2, path: '/tools/feasibility', brokerOnly: true },
  { id: 'retirement', name: 'Retirement Reverse Engineer', description: 'Work backwards from a passive income goal to required assets, property count, loan assumptions and purchase schedule.', icon: PiggyBank, path: '/tools/retirement', brokerOnly: true },
];

export default function Tools() {
  const navigate = useNavigate();
  const { role, isBrokerOrAdmin } = useAuth();
  const { visibility, loading, toggleTool, isToolEnabled } = useToolVisibility();
  const [showAdmin, setShowAdmin] = useState(false);
  const isSuperAdmin = role === 'super_admin';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">Tools</h1>
            <p className="text-muted-foreground">
              Interactive calculators and resources for client conversations
            </p>
          </div>
          {isSuperAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowAdmin(!showAdmin)}>
              <Settings className="w-4 h-4 mr-1" /> {showAdmin ? 'Done' : 'Manage'}
            </Button>
          )}
        </div>

        {showAdmin && isSuperAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tool Visibility</CardTitle>
              <CardDescription>Toggle tools on or off for all brokers and partners</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tools.map(tool => (
                <div key={tool.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <tool.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{tool.name}</span>
                  </div>
                  <Switch
                    checked={isToolEnabled(tool.id)}
                    onCheckedChange={(checked) => toggleTool(tool.id, checked)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools
            .filter(tool => (isSuperAdmin || isToolEnabled(tool.id)) && (!tool.brokerOnly || isBrokerOrAdmin))
            .map((tool, i) => {
              const enabled = isToolEnabled(tool.id);
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card className={`h-full flex flex-col ${!enabled && isSuperAdmin ? 'opacity-50 border-dashed' : 'hover:shadow-md transition-shadow'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                          <tool.icon className="w-5 h-5 text-primary" />
                        </div>
                        {!enabled && isSuperAdmin && (
                          <Badge variant="secondary" className="text-xs">Hidden</Badge>
                        )}
                        {tool.brokerOnly && (
                          <Badge variant="outline" className="text-xs">Broker Only</Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <CardDescription>{tool.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto pt-0">
                      <Button
                        className="w-full"
                        onClick={() => navigate(tool.path)}
                      >
                        Open Tool
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
        </div>
      </main>
    </div>
  );
}
