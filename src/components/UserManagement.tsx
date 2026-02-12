import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Shield, ShieldCheck, UserCog } from 'lucide-react';

interface UserWithRole {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  created_at: string;
}

export function UserManagement() {
  const { user, isPreviewMode, role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentUserRole === 'super_admin';

  useEffect(() => {
    if (isPreviewMode) {
      setUsers([
        { user_id: 'u1', email: 'damian@marginfinance.com', full_name: 'Damian Medici', role: 'super_admin', created_at: new Date().toISOString() },
        { user_id: 'u2', email: 'jane@example.com', full_name: 'Jane Smith', role: 'referral_partner', created_at: new Date().toISOString() },
        { user_id: 'u3', email: 'mike@example.com', full_name: 'Mike Johnson', role: 'referral_partner', created_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }
    fetchUsers();
  }, [isPreviewMode]);

  const fetchUsers = async () => {
    setLoading(true);
    // Fetch all profiles + their roles
    const { data: profiles } = await supabase.from('profiles').select('user_id, email, full_name, created_at');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');

    if (profiles) {
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const combined: UserWithRole[] = profiles.map(p => ({
        user_id: p.user_id,
        email: p.email,
        full_name: p.full_name,
        role: roleMap.get(p.user_id) || null,
        created_at: p.created_at,
      }));
      setUsers(combined);
    }
    setLoading(false);
  };

  const promoteToRole = async (userId: string, newRole: 'broker' | 'referral_partner') => {
    if (isPreviewMode) {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole} (preview)`);
      return;
    }

    // Check if user already has a role entry
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
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              {isSuperAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell>
              </TableRow>
            ) : (
              users.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                  <TableCell>{u.email || '—'}</TableCell>
                  <TableCell>{getRoleBadge(u.role)}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(u.created_at), 'dd MMM yyyy')}</TableCell>
                  {isSuperAdmin && (
                    <TableCell>
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
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
