import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ShieldCheck,
  ClipboardCheck,
  FileCheck2,
  CalendarClock,
  FileText,
  Calculator,
  Gauge,
  TrendingDown,
} from 'lucide-react';

const tools = [
  {
    id: 'sell-upgrade-simulator',
    name: 'Sell & Upgrade Timeline Simulator',
    description: 'Model what happens if a vendor sells now vs waits. Includes equity, costs, growth and upgrade gap.',
    icon: TrendingUp,
    path: '/tools/sell-upgrade-simulator',
    available: true,
  },
  {
    id: 'loan-repayment',
    name: 'Loan Repayment Calculator',
    description: 'Enter loan amount, rate and term — see monthly, fortnightly and weekly repayments plus total interest.',
    icon: Calculator,
    path: '/tools/loan-repayment',
    available: true,
  },
  {
    id: 'borrowing-power',
    name: 'Borrowing Power Estimator',
    description: 'Enter income, expenses and debts — get an estimate of maximum borrowing capacity.',
    icon: Gauge,
    path: '/tools/borrowing-power',
    available: true,
  },
  {
    id: 'refinance-savings',
    name: 'Refinance Savings Calculator',
    description: 'Compare your current loan rate vs a new rate to see monthly savings, total interest saved and break-even.',
    icon: TrendingDown,
    path: '/tools/refinance-savings',
    available: true,
  },
  {
    id: 'buyer-readiness',
    name: 'Buyer Readiness Risk Score',
    description: 'Assess how prepared a buyer is to move forward with finance.',
    icon: ShieldCheck,
    path: null,
    available: false,
  },
  {
    id: 'auction-checklist',
    name: 'Auction Finance Checklist',
    description: 'Ensure buyers have everything ready before auction day.',
    icon: ClipboardCheck,
    path: null,
    available: false,
  },
  {
    id: 'private-sale-checklist',
    name: 'Private Sale Finance Checklist',
    description: 'Step-by-step finance readiness for private sale transactions.',
    icon: FileCheck2,
    path: null,
    available: false,
  },
  {
    id: 'pre-approval-tracker',
    name: 'Pre-Approval Expiry Tracker',
    description: 'Track pre-approval dates and get alerts before they expire.',
    icon: CalendarClock,
    path: null,
    available: false,
  },
  {
    id: 'vendor-fallover',
    name: 'Vendor Finance Fallover Protection Pack',
    description: 'Generate a PDF pack to protect vendors against finance fall-through.',
    icon: FileText,
    path: null,
    available: false,
  },
];

export default function Tools() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold">Tools</h1>
          <p className="text-muted-foreground">
            Interactive calculators and resources for client conversations
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className={`h-full flex flex-col ${!tool.available ? 'opacity-60' : 'hover:shadow-md transition-shadow'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <tool.icon className="w-5 h-5 text-primary" />
                    </div>
                    {!tool.available && (
                      <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button
                    className="w-full"
                    disabled={!tool.available}
                    onClick={() => tool.path && navigate(tool.path)}
                  >
                    {tool.available ? 'Open Tool' : 'Coming Soon'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
