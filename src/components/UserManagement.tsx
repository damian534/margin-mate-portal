import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Shield, ShieldCheck, KeyRound, Loader2, Plus, UserPlus } from 'lucide-react';
import { Company } from '@/components/CompanyManagement';

interface UserWithRole {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string;
  company_name: string | null;
  company_id: string | null;
}

interface UserManagementProps {
  companies?: Company[];
  onRefreshReferrers?: () => void;
}

export function UserManagement({ companies = [], onRefreshReferrers }: UserManagementProps) {
  const { user, isPreviewMode, role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    role: 'referral_partner' as 'broker' | 'referral_partner',
    companyId: '',
  });

  const isSuperAdmin = currentUserRole === 'super_admin';

  useEffect(() => {
    if (isPreviewMode) {
      setUsers([
        { user_id: 'u1', email: 'damian@marginfinance.com', full_name: 'Damian Medici', role: 'super_admin', created_at: new Date().toISOString(), company_name: null, company_id: null },
        { user_id: 'u2', email: 'jane@example.com', full_name: 'Jane Smith', role: 'referral_partner', created_at: new Date().toISOString(), company_name: 'Ray White Glenroy', company_id: null },
        { user_id: 'u3', email: 'mike@example.com', full_name: 'Mike Johnson', role: 'referral_partner', created_at: new Date().toISOString(), company_name: 'LJ Hooker Essendon', company_id: null },
      ]);
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [isPreviewMode]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('user_id, email, full_name, created_at, company_name, company_id');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');

    if (profiles) {
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const combined: UserWithRole[] = profiles.map(p => ({
        user_id: p.user_id,
        email: p.email,
        full_name: p.full_name,
        role: roleMap.get(p.user_id) || null,
        created_at: p.created_at,
        company_name: p.company_name,
        company_id: p.company_id,
      }));
      setUsers(combined);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ fullName: '', email: '', role: 'referral_partner', companyId: '' });
  };

  const handleAddUser = async () => {
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    if (isPreviewMode) {
      toast.success('User added (preview)');
      setAddOpen(false);
      resetForm();
      return;
    }

    setSaving(true);
    try {
      // Check if a profile with this email already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', form.email.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        toast.error('A user with this email already exists');
        setSaving(false);
        return;
      }

      const selectedCompany = companies.find(c => c.id === form.companyId);

      // Create a profile entry (no auth account yet — will link when they register)
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: crypto.randomUUID(), // placeholder until they register
        email: form.email.trim().toLowerCase(),
        full_name: form.fullName.trim(),
        broker_id: user?.id || null,
        company_id: form.companyId || null,
        company_name: selectedCompany?.name || null,
      });

      if (profileError) {
        toast.error('Failed to create user profile');
        console.error(profileError);
        setSaving(false);
        return;
      }

      toast.success(`${form.fullName.trim()} added as ${form.role === 'referral_partner' ? 'Referral Partner' : 'Broker'}`);
      setAddOpen(false);
      resetForm();
      fetchUsers();
      onRefreshReferrers?.();
    } catch (err) {
      toast.error('Failed to add user');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const promoteToRole = async (userId: string, newRole: 'broker' | 'referral_partner') => {
    if (isPreviewMode) {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole} (preview)`);
      return;
    }

    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', userId);
      if (error) { toast.error('Failed to update role'); return; }
    } else {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole as any });
      if (error) { toast.error('Failed to assign role'); return; }
    }

    toast.success(`Role updated to ${newRole.replace('_', ' ')}`);
    fetchUsers();
  };

  const resetUserPassword = async (email: string) => {
    if (isPreviewMode) {
      toast.success(`Password reset email sent to ${email} (preview)`);
      return;
    }
    setResettingEmail(email);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Failed to send reset email');
      } else {
        toast.success(`Password reset email sent to ${email}`);
      }
    } catch {
      toast.error('Failed to send reset email');
    }
    setResettingEmail(null);
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="default" className="gap-1"><ShieldCheck className="w-3 h-3" /> Super Admin</Badge>;
      case 'broker':
        return <Badge variant="secondary" className="gap-1"><Shield className="w-3 h-3" /> Broker</Badge>;
      case 'referral_partner':
        return <Badge variant="outline" className="gap-1">Partner</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">No Role</Badge>;
    }
  };

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading users...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">Users</h2>
        {isSuperAdmin && (
          <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add User</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Add User</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Lakshay Gupta" maxLength={100} />
                </div>
                <div>
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. lakshay@company.com" maxLength={255} />
                </div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v as 'broker' | 'referral_partner' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="referral_partner">Referral Partner</SelectItem>
                      <SelectItem value="broker">Broker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.role === 'referral_partner' && (
                  <div>
                    <Label className="text-xs">Company</Label>
                    <Select value={form.companyId} onValueChange={(v) => setForm(f => ({ ...f, companyId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select a company (optional)" /></SelectTrigger>
                      <SelectContent>
                        {companies.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  This creates a pre-registered profile. When they sign up with the same email, their account will automatically link.
                </p>
                <Button onClick={handleAddUser} disabled={saving || !form.fullName.trim() || !form.email.trim()} className="w-full">
                  {saving ? 'Adding...' : 'Add User'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isSuperAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell>
                </TableRow>
              ) : (
                users.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                    <TableCell>{u.email || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.company_name || '—'}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(u.created_at), 'dd MMM yyyy')}</TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {u.role !== 'super_admin' && u.user_id !== user?.id && (
                            <Select
                              value={u.role || ''}
                              onValueChange={(v) => promoteToRole(u.user_id, v as 'broker' | 'referral_partner')}
                            >
                              <SelectTrigger className="w-40 h-8">
                                <SelectValue placeholder="Set role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="broker">Broker</SelectItem>
                                <SelectItem value="referral_partner">Partner</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {u.email && u.user_id !== user?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 h-8"
                              disabled={resettingEmail === u.email}
                              onClick={() => resetUserPassword(u.email!)}
                            >
                              {resettingEmail === u.email ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <KeyRound className="w-3 h-3" />
                              )}
                              Reset PW
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
