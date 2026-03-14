import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Check if PDPA compliance features are enabled */
export function usePdpaFeatureFlag() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('app_feature_flags')
      .select('enabled')
      .eq('flag_key', 'pdpa_compliance')
      .maybeSingle()
      .then(({ data }) => {
        setEnabled(data?.enabled ?? false);
        setLoading(false);
      });
  }, []);

  return { pdpaEnabled: enabled, loading };
}
