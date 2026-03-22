import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAdminRole } from './useAdminRole';

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours (extended for booking flow)
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute
const RE_AUTH_ACTIONS = ['export_sensitive', 'delete_record', 'reveal_highly_restricted', 'role_change'];

interface StaffGovernanceState {
  isTimedOut: boolean;
  sessionId: string | null;
  requiresReAuth: boolean;
  lastActivity: number;
}

/**
 * Staff governance hook:
 * - Auto-timeout after inactivity
 * - Heartbeat to track active sessions
 * - Re-authentication requirement for high-risk actions
 * - Force-logout detection
 */
export function useStaffGovernance() {
  const { user } = useAuth();
  const { role, userBranch } = useAdminRole();
  const [state, setState] = useState<StaffGovernanceState>({
    isTimedOut: false,
    sessionId: null,
    requiresReAuth: false,
    lastActivity: Date.now(),
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const isStaff = role === 'admin' || role === 'moderator' || role === 'me_analyst';

  // Reset inactivity timer
  const resetActivity = useCallback(() => {
    setState(prev => ({ ...prev, isTimedOut: false, lastActivity: Date.now() }));

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isStaff) {
      timeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, isTimedOut: true }));
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [isStaff]);

  // Create session on mount
  useEffect(() => {
    if (!user || !isStaff) return;

    const createSession = async () => {
      const { data } = await supabase
        .from('staff_access_sessions')
        .insert({
          user_id: user.id,
          role: role || 'user',
          branch: userBranch,
          device_info: navigator.userAgent.slice(0, 200),
        } as any)
        .select('id')
        .single();

      if (data) {
        sessionIdRef.current = data.id;
        setState(prev => ({ ...prev, sessionId: data.id }));
      }
    };

    createSession();

    return () => {
      // Mark session as ended on unmount
      if (sessionIdRef.current) {
        supabase
          .from('staff_access_sessions')
          .update({ is_active: false, logout_at: new Date().toISOString() } as any)
          .eq('id', sessionIdRef.current)
          .then(() => {});
      }
    };
  }, [user, isStaff, role, userBranch]);

  // Heartbeat — update last_active_at and check force_logout
  useEffect(() => {
    if (!isStaff || !sessionIdRef.current) return;

    heartbeatRef.current = setInterval(async () => {
      if (!sessionIdRef.current) return;

      const { data } = await supabase
        .from('staff_access_sessions')
        .update({ last_active_at: new Date().toISOString() } as any)
        .eq('id', sessionIdRef.current)
        .select('force_logout, force_logout_reason')
        .single();

      if (data?.force_logout) {
        setState(prev => ({ ...prev, isTimedOut: true }));
        await supabase.auth.signOut();
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isStaff]);

  // Listen to user activity
  useEffect(() => {
    if (!isStaff) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));
    resetActivity();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isStaff, resetActivity]);

  /** Check if an action requires re-authentication */
  const needsReAuth = useCallback((action: string): boolean => {
    return RE_AUTH_ACTIONS.includes(action);
  }, []);

  /** Mark re-auth as completed */
  const confirmReAuth = useCallback(() => {
    setState(prev => ({ ...prev, requiresReAuth: false }));
  }, []);

  /** Request re-auth before proceeding */
  const requestReAuth = useCallback(() => {
    setState(prev => ({ ...prev, requiresReAuth: true }));
  }, []);

  return {
    isTimedOut: state.isTimedOut,
    sessionId: state.sessionId,
    requiresReAuth: state.requiresReAuth,
    isStaff,
    resetActivity,
    needsReAuth,
    confirmReAuth,
    requestReAuth,
  };
}
