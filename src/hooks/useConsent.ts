import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ConsentVersion {
  id: string;
  consent_type: string;
  version: number;
  title_th: string;
  title_en: string;
  summary_th: string;
  summary_en: string;
  full_text_th: string;
  full_text_en: string;
}

export interface ConsentRecord {
  id: string;
  consent_type: string;
  granted: boolean;
  action: string;
  granted_at: string | null;
  revoked_at: string | null;
  consent_version_id: string | null;
  created_at: string | null;
}

export function useConsent() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [versions, setVersions] = useState<ConsentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const [recordsRes, versionsRes] = await Promise.all([
      supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('consent_versions')
        .select('*')
        .eq('is_active', true),
    ]);

    if (recordsRes.data) setRecords(recordsRes.data as unknown as ConsentRecord[]);
    if (versionsRes.data) setVersions(versionsRes.data as unknown as ConsentVersion[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasConsent = useCallback((consentType: string): boolean => {
    const latest = records.find(r => r.consent_type === consentType);
    return latest?.granted === true && latest?.action !== 'withdrawn';
  }, [records]);

  const needsReConsent = useCallback((consentType: string): boolean => {
    const activeVersion = versions.find(v => v.consent_type === consentType);
    if (!activeVersion) return false;
    const latestRecord = records.find(r => r.consent_type === consentType && r.granted);
    if (!latestRecord) return true;
    return latestRecord.consent_version_id !== activeVersion.id;
  }, [records, versions]);

  const grantConsent = useCallback(async (
    consentType: string,
    opts?: { sourcePage?: string; staffActorId?: string }
  ) => {
    if (!user) return;
    const activeVersion = versions.find(v => v.consent_type === consentType);

    const { error } = await supabase.from('consent_records').insert({
      user_id: user.id,
      consent_type: consentType,
      granted: true,
      granted_at: new Date().toISOString(),
      action: 'accepted',
      consent_version_id: activeVersion?.id || null,
      consent_text_snapshot: activeVersion
        ? `${activeVersion.title_en} v${activeVersion.version}`
        : consentType,
      source_page: opts?.sourcePage || window.location.pathname,
      staff_actor_id: opts?.staffActorId || null,
      device_info: navigator.userAgent.slice(0, 200),
    } as any);

    if (!error) await fetchData();
    return { error };
  }, [user, versions, fetchData]);

  const withdrawConsent = useCallback(async (consentType: string) => {
    if (!user) return;

    const { error } = await supabase.from('consent_records').insert({
      user_id: user.id,
      consent_type: consentType,
      granted: false,
      revoked_at: new Date().toISOString(),
      action: 'withdrawn',
      source_page: window.location.pathname,
      device_info: navigator.userAgent.slice(0, 200),
    } as any);

    if (!error) await fetchData();
    return { error };
  }, [user, fetchData]);

  return {
    records,
    versions,
    loading,
    hasConsent,
    needsReConsent,
    grantConsent,
    withdrawConsent,
    refetch: fetchData,
  };
}
