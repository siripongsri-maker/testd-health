import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, KeyRound, Shield, RefreshCw, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import { AdminPasswordResetDialog } from './AdminPasswordResetDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number | null;
  level: number | null;
  streak: number | null;
  created_at: string | null;
  roles: string[];
}

export function AdminUsersContent() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleUser, setRoleUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const { language } = useLanguage();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, xp, level, streak, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const roleMap = new Map<string, string[]>();
      (allRoles || []).forEach(r => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        roles: roleMap.get(profile.id) || [],
      }));

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(user =>
          user.display_name?.toLowerCase().includes(query) ||
          user.id.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const handlePasswordReset = (user: UserProfile) => {
    setSelectedUser(user);
    setShowPasswordDialog(true);
  };

  const handleRoleChange = (user: UserProfile) => {
    setRoleUser(user);
    setNewRole('');
    setShowRoleDialog(true);
  };

  const saveRole = async () => {
    if (!roleUser || !newRole) return;
    setSavingRole(true);
    try {
      if (newRole === 'user') {
        // Remove all elevated roles
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', roleUser.id);
        if (error) throw error;
      } else {
        // Remove existing non-admin roles, then insert new one
        // Keep admin role if it exists and we're adding me_analyst
        const { error: delError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', roleUser.id)
          .neq('role', 'admin');
        if (delError) throw delError;

        // If setting to admin, also delete any remaining first
        if (newRole === 'admin') {
          await supabase.from('user_roles').delete().eq('user_id', roleUser.id);
        }

        const { error: insertError } = await supabase
          .from('user_roles')
          .upsert({ user_id: roleUser.id, role: newRole as any }, { onConflict: 'user_id,role' });
        if (insertError) throw insertError;
      }
      toast.success(language === 'th' ? 'อัปเดตบทบาทแล้ว' : 'Role updated');
      fetchUsers();
      setShowRoleDialog(false);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(language === 'th' ? 'ไม่สามารถอัปเดตบทบาทได้' : 'Failed to update role');
    } finally {
      setSavingRole(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const roleBadge = (roles: string[]) => {
    if (roles.includes('admin')) return <Badge variant="secondary" className="text-xs"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
    if (roles.includes('me_analyst')) return <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-600">M&E</Badge>;
    if (roles.includes('moderator')) return <Badge variant="outline" className="text-xs">Mod</Badge>;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {language === 'th' ? 'จัดการผู้ใช้' : 'Manage Users'}
          </h2>
          <p className="text-muted-foreground">{language === 'th' ? 'ดูและจัดการบัญชีผู้ใช้ทั้งหมด' : 'View and manage all user accounts'}</p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {language === 'th' ? 'รีเฟรช' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{users.length}</div><p className="text-sm text-muted-foreground">{language === 'th' ? 'ผู้ใช้ทั้งหมด' : 'Total Users'}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{users.filter(u => u.roles.includes('admin')).length}</div><p className="text-sm text-muted-foreground">{language === 'th' ? 'แอดมิน' : 'Admins'}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{users.filter(u => u.roles.includes('me_analyst')).length}</div><p className="text-sm text-muted-foreground">M&E Analysts</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{users.filter(u => (u.streak || 0) > 0).length}</div><p className="text-sm text-muted-foreground">{language === 'th' ? 'สตรีคที่ยังทำอยู่' : 'Active Streaks'}</p></CardContent></Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />{language === 'th' ? 'ค้นหาผู้ใช้' : 'Search Users'}</CardTitle></CardHeader>
        <CardContent>
          <Input placeholder={language === 'th' ? 'ค้นหาด้วยชื่อหรือ ID...' : 'Search by name or ID...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-md" />
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? (language === 'th' ? 'ไม่พบผู้ใช้ที่ค้นหา' : 'No users found') : (language === 'th' ? 'ยังไม่มีผู้ใช้' : 'No users yet')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'th' ? 'ผู้ใช้' : 'User'}</TableHead>
                    <TableHead className="text-center">Level</TableHead>
                    <TableHead className="text-center">XP</TableHead>
                    <TableHead className="text-center">Streak</TableHead>
                    <TableHead>{language === 'th' ? 'สมัครเมื่อ' : 'Joined'}</TableHead>
                    <TableHead className="text-right">{language === 'th' ? 'การดำเนินการ' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{user.display_name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.display_name || 'Unknown'}
                              {roleBadge(user.roles)}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{user.level || 1}</Badge></TableCell>
                      <TableCell className="text-center">{user.xp || 0}</TableCell>
                      <TableCell className="text-center">
                        {user.streak ? <Badge className="bg-orange-500">{user.streak}🔥</Badge> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleRoleChange(user)}>
                          <UserCog className="h-4 w-4 mr-1" />
                          {language === 'th' ? 'บทบาท' : 'Role'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePasswordReset(user)}>
                          <KeyRound className="h-4 w-4 mr-1" />
                          {language === 'th' ? 'รีเซ็ต' : 'Reset'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminPasswordResetDialog user={selectedUser} open={showPasswordDialog} onOpenChange={setShowPasswordDialog} />

      {/* Role Assignment Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{language === 'th' ? 'เปลี่ยนบทบาท' : 'Change Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {roleUser?.display_name || 'Unknown'} — {language === 'th' ? 'บทบาทปัจจุบัน:' : 'Current:'}{' '}
              <span className="font-medium">{roleUser?.roles.length ? roleUser.roles.join(', ') : 'user'}</span>
            </p>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue placeholder={language === 'th' ? 'เลือกบทบาท' : 'Select role'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="moderator">Moderator (Branch Staff)</SelectItem>
                <SelectItem value="me_analyst">M&E Analyst</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {newRole === 'me_analyst' && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {language === 'th' ? 'M&E Analyst จะเข้าถึงข้อมูลแบบอ่านอย่างเดียว ไม่สามารถแก้ไขข้อมูลได้' : 'M&E Analyst gets read-only access to all analytics and reporting data.'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button onClick={saveRole} disabled={!newRole || savingRole}>
              {savingRole ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {language === 'th' ? 'บันทึก' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
