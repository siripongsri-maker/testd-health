import { ReactNode, useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { initAttribution, linkVisitorToUser } from '@/lib/attribution';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { setDomTranslatorLanguage } from '@/lib/domTranslator';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  useAnalytics();
  const language = useLanguage((s) => s.language);

  // Drive the site-wide DOM translator off the current language selection.
  useEffect(() => {
    setDomTranslatorLanguage(language);
  }, [language]);

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
