import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Users, BarChart3, Bell, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Index() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const features = [
    { icon: Users, title: 'Easy Referrals', desc: 'Submit client leads in seconds with our simple form' },
    { icon: BarChart3, title: 'Track Progress', desc: 'Real-time status updates on every lead you send' },
    { icon: Bell, title: 'Stay Informed', desc: 'Get email notifications when your broker updates a lead' },
    { icon: Shield, title: 'Secure Portal', desc: 'Your data is protected with enterprise-grade security' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-navy-deep" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--gold)/0.15),_transparent_60%)]" />
        <div className="relative container py-24 lg:py-36 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-primary-foreground mb-6 leading-tight">
              Your Referrals,<br />
              <span className="text-accent">Rewarded</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
              The Margin Finance referral portal makes it simple to send us clients
              and track every lead from submission to settlement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-gold-dark"
                  onClick={() => navigate(role === 'broker' ? '/admin' : '/dashboard')}
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="bg-accent text-accent-foreground hover:bg-gold-dark"
                    onClick={() => navigate('/register')}
                  >
                    Become a Partner <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
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
