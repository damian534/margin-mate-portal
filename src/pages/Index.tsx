import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToolVisibility } from '@/hooks/useToolVisibility';
import { ArrowRight, Users, BarChart3, Bell, Shield, TrendingUp, ShieldCheck, ClipboardCheck, FileCheck2, CalendarClock, FileText, Calculator, Gauge, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';


export default function Index() {
  const navigate = useNavigate();
  const { user, role, isBrokerOrAdmin } = useAuth();
  const { isToolEnabled } = useToolVisibility();

  const features = [
    { icon: Users, title: 'Easy Referrals', desc: 'Submit client leads in seconds with our simple form' },
    { icon: BarChart3, title: 'Track Progress', desc: 'Real-time status updates on every lead you send' },
    { icon: Bell, title: 'Stay Informed', desc: 'Get email notifications when your broker updates a lead' },
    { icon: Shield, title: 'Secure Portal', desc: 'Your data is protected with enterprise-grade security' },
  ];

  const tools = [
    { id: 'sell-upgrade-simulator', name: 'Sell & Upgrade Timeline Simulator', desc: 'Model what happens if a vendor sells now vs waits. Includes equity, costs, growth and upgrade gap.', icon: TrendingUp, path: '/tools/sell-upgrade-simulator' },
    { id: 'loan-repayment', name: 'Loan Repayment Calculator', desc: 'Enter loan amount, rate and term — see monthly, fortnightly and weekly repayments.', icon: Calculator, path: '/tools/loan-repayment' },
    { id: 'borrowing-power', name: 'Borrowing Power Estimator', desc: 'Enter income, expenses and debts — get an estimate of max borrowing capacity.', icon: Gauge, path: '/tools/borrowing-power' },
    { id: 'refinance-savings', name: 'Refinance Savings Calculator', desc: 'Compare current loan vs new rate to show potential savings.', icon: TrendingDown, path: '/tools/refinance-savings' },
    { id: 'buyer-readiness', name: 'Buyer Readiness Risk Score', desc: 'Assess how prepared a buyer is to move forward with finance.', icon: ShieldCheck, path: '/tools/buyer-readiness' },
    { id: 'auction-checklist', name: 'Auction Finance Checklist', desc: 'Ensure buyers have everything ready before auction day.', icon: ClipboardCheck, path: '/tools/auction-checklist' },
    { id: 'private-sale-checklist', name: 'Private Sale Finance Checklist', desc: 'Step-by-step finance readiness for private sale transactions.', icon: FileCheck2, path: '/tools/private-sale-checklist' },
    { id: 'pre-approval-tracker', name: 'Pre-Approval Expiry Tracker', desc: 'Track pre-approval dates and get alerts before they expire.', icon: CalendarClock, path: '/tools/pre-approval-tracker' },
    { id: 'vendor-fallover', name: 'Vendor Finance Fallover Protection Pack', desc: 'Generate a PDF pack to protect vendors against finance fall-through.', icon: FileText, path: '/tools/vendor-fallover' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-background">
        
        <div className="relative container py-24 lg:py-36 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <Shield className="w-4 h-4" />
              Trusted Referral Partner Portal
            </div>
            <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight">
              <span className="text-foreground">Margin</span>{' '}
              <span className="text-primary">Connect</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Making every connection count
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Button
                  size="lg"
                  disabled={!role}
                  onClick={() => navigate(isBrokerOrAdmin ? '/admin' : '/dashboard')}
                >
                  {!role ? 'Loading...' : 'Go to Dashboard'} {role && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/register')}
                    className="shadow-lg shadow-primary/25"
                  >
                    Register <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/login')}
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <h2 className="text-3xl font-heading font-bold text-center mb-12">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-card rounded-xl border p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tools Section */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-bold mb-3">Partner Tools</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Interactive calculators and resources to help you have better conversations with clients
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.filter(tool => isToolEnabled(tool.id)).map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="bg-card rounded-xl border p-6 flex flex-col hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <tool.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <h3 className="font-heading font-semibold mb-1">{tool.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 flex-1">{tool.desc}</p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => navigate(tool.path)}
              >
                Open Tool
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Margin Finance. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Referral Partner Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
