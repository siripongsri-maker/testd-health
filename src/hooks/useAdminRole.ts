import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AdminRole = 'admin' | 'moderator' | 'me_analyst' | 'outreach_staff' | 'counselor' | null;

interface AdminRoleState {
  role: AdminRole;
  isAdmin: boolean;
  isModerator: boolean;
  isMeAnalyst: boolean;
  isOutreachStaff: boolean;
  isCounselor: boolean;
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

      // admin
      const { data: adminData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (adminData) { setRole('admin'); setLoading(false); return; }

      // me_analyst
      const { data: meData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'me_analyst' });
      if (meData) { setRole('me_analyst'); setLoading(false); return; }

      // counselor (branch-scoped, must be active)
      const { data: counselorData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'counselor' as any });
      if (counselorData) {
        const { data: cp } = await (supabase as any)
          .from('counselor_profiles')
          .select('branch_id, is_active')
          .eq('user_id', user.id)
          .maybeSingle();
        const profile = cp as { branch_id: string | null; is_active: boolean } | null;
        if (!profile || profile.is_active === false) {
          // Inactive → force sign-out; block access
          await supabase.auth.signOut();
          setRole(null);
          setLoading(false);
          return;
        }
        setRole('counselor');
        setUserBranch(profile.branch_id ?? null);
        setLoading(false);
        return;
      }

      // moderator
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

      // outreach_staff
      const { data: outreachData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'outreach_staff' as any });
      if (outreachData) { setRole('outreach_staff'); setLoading(false); return; }

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
    isOutreachStaff: role === 'outreach_staff',
    isCounselor: role === 'counselor',
    readOnly: role === 'me_analyst' || role === 'outreach_staff',
    userBranch,
    loading: loading || authLoading,
  };
}
