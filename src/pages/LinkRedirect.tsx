import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { setSessionAttribution } from '@/lib/attribution';
import { Loader2 } from 'lucide-react';

export default function LinkRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) { navigate('/'); return; }

    const resolve = async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('track-link-click', {
          body: { slug },
        });

        if (fnErr || !data || data.error) {
          setError(true);
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Store attribution in session
        setSessionAttribution({
          campaign: data.campaign,
          channel: data.channel,
          source: data.source,
          medium: data.medium,
          content: data.content,
          term: data.term,
          partner_name: data.partner_name,
          link_id: data.id,
          landing_page: data.destination_path,
        });

        // Build destination with params
        const dest = data.destination_path || '/';
        const params = new URLSearchParams();
        if (data.campaign) params.set('utm_campaign', data.campaign);
        if (data.channel) params.set('channel', data.channel);
        if (data.source) params.set('utm_source', data.source);
        if (data.medium) params.set('utm_medium', data.medium);
        if (data.id) params.set('link_id', data.id);

        const qs = params.toString();
        navigate(`${dest}${qs ? '?' + qs : ''}`, { replace: true });
      } catch {
        setError(true);
        setTimeout(() => navigate('/'), 3000);
      }
    };

    resolve();
  }, [slug, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      {error ? (
        <p className="text-muted-foreground">Link not found. Redirecting...</p>
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      )}
    </div>
  );
}
