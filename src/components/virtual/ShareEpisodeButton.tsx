import { useEffect, useRef, useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { trackEpisodeShare, trackEpisodeShareImpression } from '@/lib/virtualEpisodeAnalytics';
import { debugSharePayload } from '@/lib/virtualShareDebug';
import { toast } from '@/hooks/use-toast';

const emit = (event: string, payload: Record<string, unknown>) => {
  debugSharePayload(event, payload);
  trackEvent(event, payload);
};

interface Props {
  slug: string;
  title: string;
  /** Where this share UI is rendered, e.g. 'episode_screen' | 'result_screen' */
  surface?: string;
}

export function ShareEpisodeButton({ slug, title, surface = 'episode_screen' }: Props) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://testd.website';
  const url = `${origin}/virtual/${slug}?ref=share`;

  // Fire one impression per (slug + surface) per mount so the denominator for share-rate is reliable.
  const impressionFiredRef = useRef(false);
  useEffect(() => {
    if (impressionFiredRef.current) return;
    impressionFiredRef.current = true;
    trackEpisodeShareImpression({ slug, title }, surface);
  }, [slug, title, surface]);

  const handle = async () => {
    const ctx = { slug, title };
    emit('virtual_share_click', { slug, title, surface });
    trackEpisodeShare(ctx, 'click');
    const navAny = navigator as any;
    if (navAny.share) {
      try {
        await navAny.share({ title, text: title, url });
        emit('virtual_share_native', { slug, title, surface, method: 'web_share_api', url });
        trackEpisodeShare(ctx, 'web_share');
        return;
      } catch {
        emit('virtual_share_cancelled', { slug, title, surface });
        trackEpisodeShare(ctx, 'cancelled');
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      emit('virtual_share_copy', { slug, title, surface, method: 'clipboard', url });
      trackEpisodeShare(ctx, 'clipboard');
      toast({ title: 'คัดลอกลิงก์แล้ว', description: url });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      emit('virtual_share_failed', { slug, title, surface });
      trackEpisodeShare(ctx, 'failed');
      toast({ title: 'แชร์ไม่สำเร็จ', variant: 'destructive' });
    }
  };

  return (
    <button
      onClick={handle}
      className="absolute top-3 right-3 z-50 p-2 rounded-lg bg-background/80 backdrop-blur-sm text-foreground border border-border/30 shadow-sm hover:bg-background"
      aria-label="Share episode link"
      title="แชร์ลิงก์ตอนนี้"
    >
      {copied ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}
