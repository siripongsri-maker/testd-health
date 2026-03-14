import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAdminRole } from './useAdminRole';

export type AuditActionType =
  | 'login' | 'logout' | 'password_reset'
  | 'consent_granted' | 'consent_withdrawn'
  | 'view_sensitive_record' | 'reveal_masked_field'
  | 'export_attempt' | 'export_success' | 'download_file'
  | 'data_update' | 'data_delete' | 'role_change'
  | 'failed_access' | 'suspicious_bulk_access'
  | 'print_action' | 'policy_change' | 'permission_change';

export type DataClassification =
  | 'public' | 'internal' | 'personal' | 'sensitive' | 'highly_restricted';

interface AuditLogEntry {
  action_type: AuditActionType;
  target_type?: string;
  target_id?: string;
  target_classification?: DataClassification;
  reason?: string;
  branch?: string;
  result?: 'allowed' | 'denied' | 'failed';
  metadata?: Record<string, unknown>;
}

/**
 * Hook for logging PDPA audit events.
 * Fire-and-forget: does not throw on failure.
 */
export function usePdpaAudit() {
  const { user } = useAuth();
  const { role } = useAdminRole();

  const log = useCallback(async (entry: AuditLogEntry) => {
    try {
      await supabase.from('pdpa_audit_logs').insert({
        actor_type: role ? 'staff' : user ? 'user' : 'anonymous',
        actor_id: user?.id || null,
        actor_role: role || 'user',
        action_type: entry.action_type,
        target_type: entry.target_type || null,
        target_id: entry.target_id || null,
        target_classification: entry.target_classification || null,
        reason: entry.reason || null,
        branch: entry.branch || null,
        ip_hint: null,
        device_info: navigator.userAgent.slice(0, 200),
        result: entry.result || 'allowed',
        metadata: entry.metadata || {},
      } as any);
    } catch {
      // Audit logging is best-effort — never block the user
    }
  }, [user, role]);

  return { log };
}
