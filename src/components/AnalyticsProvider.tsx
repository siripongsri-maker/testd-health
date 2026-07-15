import { ReactNode, useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { initAttribution, linkVisitorToUser } from '@/lib/attribution';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage, isRtlLanguage } from '@/lib/i18n';
import { setDomTranslatorLanguage } from '@/lib/domTranslator';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => {
  useAnalytics();
  const language = useLanguage((s) => s.language);

  // Drive the site-wide DOM translator + direction off the current language.
  useEffect(() => {
    setDomTranslatorLanguage(language);
    const root = document.documentElement;
    const rtl = isRtlLanguage(language);
    root.setAttribute('lang', language);
    root.setAttribute('dir', rtl ? 'rtl' : 'ltr');
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
