import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { toast } from '@/hooks/use-toast';

interface Props {
  slug: string;
  title: string;
}

export function ShareEpisodeButton({ slug, title }: Props) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://testd.website'}/virtual/${slug}`;

  const handle = async () => {
    trackEvent('virtual_share_link', { slug });
    const navAny = navigator as any;
    if (navAny.share) {
      try {
        await navAny.share({ title, text: title, url });
        return;
      } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'คัดลอกลิงก์แล้ว', description: url });
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
