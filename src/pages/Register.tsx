import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasAnySuperAdmin, setHasAnySuperAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if any super_admin exists — if not, first user gets to register without a code
    supabase.from('user_roles').select('id').eq('role', 'super_admin' as any).limit(1)
      .then(({ data }) => setHasAnySuperAdmin(!!(data && data.length > 0)));

    const code = searchParams.get('code');
    if (code) {
      setInviteCode(code);
      validateCode(code);
    }
  }, [searchParams]);

  const validateCode = async (code: string) => {
    if (!code.trim()) { setCodeValid(null); return; }
    const { data } = await supabase
      .from('invite_codes')
      .select('id, is_active, max_uses, used_count, expires_at')
      .eq('code', code.trim())
      .eq('is_active', true)
      .maybeSingle();
    
    if (!data) { setCodeValid(false); return; }
    if (data.max_uses && data.used_count >= data.max_uses) { setCodeValid(false); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setCodeValid(false); return; }
    setCodeValid(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    const needsCode = hasAnySuperAdmin !== false;
    if (needsCode && !inviteCode.trim()) {
      toast.error('An invite code is required to register');
      return;
    }
    if (needsCode && codeValid === false) {
      toast.error('Invalid or expired invite code');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, company_name: companyName, invite_code: inviteCode.trim() },
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success('Check your email to confirm your account!');
    navigate('/login');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo className="h-16" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Register as a referral partner</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {hasAnySuperAdmin !== false && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code *</Label>
                <div className="relative">
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value);
                      validateCode(e.target.value);
                    }}
                    placeholder="Enter your invite code"
                    required
                    className={codeValid === true ? 'border-emerald-500 pr-10' : codeValid === false ? 'border-destructive' : ''}
                  />
                  {codeValid === true && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                </div>
                {codeValid === false && (
                  <p className="text-xs text-destructive">Invalid or expired invite code</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || codeValid === false}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
