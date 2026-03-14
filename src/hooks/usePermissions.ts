import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAdminRole } from './useAdminRole';

export interface Permission {
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_reveal_pii: boolean;
  field_visibility: Record<string, boolean>;
  branch_scoped: boolean;
  requires_reason: boolean;
  data_classification: string;
}

const DEFAULT_PERMISSION: Permission = {
  can_view: false,
  can_create: false,
  can_update: false,
  can_delete: false,
  can_export: false,
  can_reveal_pii: false,
  field_visibility: {},
  branch_scoped: false,
  requires_reason: false,
  data_classification: 'internal',
};

interface PermissionRow {
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_reveal_pii: boolean;
  field_visibility: Record<string, boolean>;
  branch_scoped: boolean;
  requires_reason: boolean;
  data_classification: string;
}

/**
 * RBAC + ABAC permission system.
 * Loads the permission matrix and provides fine-grained access checks.
 */
export function usePermissions() {
  const { user } = useAuth();
  const { role, userBranch } = useAdminRole();
  const [matrix, setMatrix] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from('permission_matrix')
      .select('*')
      .then(({ data }) => {
        if (data) setMatrix(data as unknown as PermissionRow[]);
        setLoading(false);
      });
  }, [user]);

  /** Get permission for a specific module */
  const getPermission = useCallback((module: string): Permission => {
    if (!role) return DEFAULT_PERMISSION;

    const row = matrix.find(r => r.role === role && r.module === module);
    if (!row) return DEFAULT_PERMISSION;

    return {
      can_view: row.can_view,
      can_create: row.can_create,
      can_update: row.can_update,
      can_delete: row.can_delete,
      can_export: row.can_export,
      can_reveal_pii: row.can_reveal_pii,
      field_visibility: (row.field_visibility || {}) as Record<string, boolean>,
      branch_scoped: row.branch_scoped,
      requires_reason: row.requires_reason,
      data_classification: row.data_classification,
    };
  }, [role, matrix]);

  /** Check if a specific field is visible for the current role in a module */
  const canSeeField = useCallback((module: string, field: string): boolean => {
    const perm = getPermission(module);
    // If field_visibility is empty, default to can_view
    if (Object.keys(perm.field_visibility).length === 0) return perm.can_view;
    return perm.field_visibility[field] ?? false;
  }, [getPermission]);

  /** Check if current user can access records from a specific branch */
  const canAccessBranch = useCallback((module: string, recordBranch: string | null): boolean => {
    const perm = getPermission(module);
    if (!perm.can_view) return false;
    if (!perm.branch_scoped) return true; // no branch restriction
    if (!recordBranch || !userBranch) return false;
    return recordBranch === userBranch;
  }, [getPermission, userBranch]);

  /** Get all modules the current role has access to */
  const accessibleModules = useMemo(() => {
    if (!role) return [];
    return matrix
      .filter(r => r.role === role && r.can_view)
      .map(r => r.module);
  }, [role, matrix]);

  /** Get the full matrix for admin review */
  const fullMatrix = useMemo(() => matrix, [matrix]);

  return {
    loading,
    getPermission,
    canSeeField,
    canAccessBranch,
    accessibleModules,
    fullMatrix,
    currentRole: role,
    currentBranch: userBranch,
  };
}
