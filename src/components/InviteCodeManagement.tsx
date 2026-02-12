import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Copy, Link2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface InviteCode {
  id: string;
  broker_id: string;
  code: string;
  label: string | null;
  used_count: number;
  max_uses: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function InviteCodeManagement() {
  const { user, isPreviewMode } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('');

  useEffect(() => {
    if (isPreviewMode) {
      setCodes([
        { id: '1', broker_id: 'preview', code: 'MARGIN-ABC123', label: 'General invite', used_count: 3, max_uses: null, expires_at: null, is_active: true, created_at: new Date().toISOString() },
        { id: '2', broker_id: 'preview', code: 'MARGIN-XYZ789', label: 'RE Agency', used_count: 1, max_uses: 10, expires_at: null, is_active: true, created_at: new Date().toISOString() },
      ]);
      setLoading(false);
      return;
    }
    fetchCodes();
  }, [isPreviewMode]);

  const fetchCodes = async () => {
    const { data } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });
    setCodes((data as InviteCode[]) || []);
    setLoading(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'MF-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const createCode = async () => {
    if (!user) return;
    const code = generateCode();

    if (isPreviewMode) {
      setCodes(prev => [{ id: `preview-${Date.now()}`, broker_id: user.id, code, label: newLabel || null, used_count: 0, max_uses: newMaxUses ? parseInt(newMaxUses) : null, expires_at: null, is_active: true, created_at: new Date().toISOString() }, ...prev]);
      toast.success('Invite code created (preview)');
      setDialogOpen(false);
      setNewLabel('');
      setNewMaxUses('');
      return;
    }

    const { error } = await supabase.from('invite_codes').insert({
      broker_id: user.id,
      code,
      label: newLabel.trim() || null,
      max_uses: newMaxUses ? parseInt(newMaxUses) : null,
    });

    if (error) { toast.error('Failed to create invite code'); return; }
    toast.success('Invite code created!');
    setDialogOpen(false);
    setNewLabel('');
    setNewMaxUses('');
    fetchCodes();
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    if (isPreviewMode) {
      setCodes(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentActive } : c));
      return;
    }
    await supabase.from('invite_codes').update({ is_active: !currentActive } as any).eq('id', id);
    fetchCodes();
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(url);
    toast.success('Invite link copied to clipboard!');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Invite Codes</CardTitle>
          <CardDescription>Generate invite links for referral partners to register</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> New Code</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Invite Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Label (optional)</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. RE Agency Partners"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Uses (leave empty for unlimited)</Label>
                <Input
                  type="number"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  min={1}
                />
              </div>
              <Button onClick={createCode} className="w-full">Generate Invite Code</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : codes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No invite codes yet. Create one to invite referral partners.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map(code => (
                <TableRow key={code.id}>
                  <TableCell className="font-mono font-medium">{code.code}</TableCell>
                  <TableCell className="text-muted-foreground">{code.label || '—'}</TableCell>
                  <TableCell>
                    {code.used_count}{code.max_uses ? ` / ${code.max_uses}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={code.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleActive(code.id, code.is_active)}
                    >
                      {code.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(code.created_at), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyCode(code.code)} title="Copy code">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(code.code)} title="Copy invite link">
                        <Link2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
