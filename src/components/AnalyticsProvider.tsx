import { ReactNode, useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { initAttribution, linkVisitorToUser } from '@/lib/attribution';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  useAnalytics();

  // Init attribution capture on first load
  useEffect(() => {
    initAttribution();

    // Link visitor to user on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.id) {
        linkVisitorToUser(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
};
