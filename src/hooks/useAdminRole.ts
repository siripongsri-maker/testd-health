import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AdminRole = 'admin' | 'moderator' | 'me_analyst' | 'outreach_staff' | null;

interface AdminRoleState {
  role: AdminRole;
  isAdmin: boolean;
  isModerator: boolean;
  isMeAnalyst: boolean;
  isOutreachStaff: boolean;
  /** True for me_analyst or outreach_staff — all mutation UI should be hidden */
  readOnly: boolean;
  userBranch: string | null;
  loading: boolean;
}

export function useAdminRole(): AdminRoleState {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AdminRole>(null);
  const [userBranch, setUserBranch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (authLoading) return;
      if (!user) { setLoading(false); return; }

      // Check admin first
      const { data: adminData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (adminData) { setRole('admin'); setLoading(false); return; }

      // Check me_analyst
      const { data: meData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'me_analyst' });
      if (meData) { setRole('me_analyst'); setLoading(false); return; }

      // Check moderator
      const { data: modData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      if (modData) {
        setRole('moderator');
        const { data: branchData } = await supabase
          .from('staff_branch_assignments')
          .select('branch')
          .eq('user_id', user.id)
          .maybeSingle();
        if (branchData) setUserBranch(branchData.branch);
        setLoading(false);
        return;
      }

      setRole(null);
      setLoading(false);
    };
    check();
  }, [user, authLoading]);

  return {
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    isMeAnalyst: role === 'me_analyst',
    readOnly: role === 'me_analyst',
    userBranch,
    loading: loading || authLoading,
  };
}
