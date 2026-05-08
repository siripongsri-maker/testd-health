import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/hooks/useAnalytics';
import { toast } from '@/hooks/use-toast';

interface VirtualShareCardProps {
  episodeSlug: string;
  episodeTitle: string;
  resultTitle?: string;
  resultDetail?: string;
  emoji?: string;
  /** Optional accent color (hsl(...) string) */
  accent?: string;
  /** Hint shown below the result */
  hint?: string;
}

/**
 * Renders a 1080x1350 (4:5) share-friendly card with the result, plus
 * "Save image" and "Share" buttons. Designed for IG / FB / LINE.
 */
export function VirtualShareCard({
  episodeSlug,
  episodeTitle,
  resultTitle,
  resultDetail,
  emoji = '✨',
  accent = 'hsl(333, 80%, 62%)',
  hint,
}: VirtualShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://testd.website'}/virtual/${episodeSlug}`;

  const generate = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#0f0f1a',
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const handleDownload = async () => {
    try {
      setBusy(true);
      const blob = await generate();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `testd-${episodeSlug}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      trackEvent('virtual_share_download', { slug: episodeSlug });
      toast({ title: 'บันทึกภาพแล้ว ✨', description: 'นำไปโพสต์ลง social ได้เลย' });
    } catch (e) {
      toast({ title: 'บันทึกไม่สำเร็จ', description: 'ลองใหม่อีกครั้ง', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    try {
      setBusy(true);
      const blob = await generate();
      if (!blob) return;
      const file = new File([blob], `testd-${episodeSlug}.png`, { type: 'image/png' });
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({
          files: [file],
          title: episodeTitle,
          text: `${episodeTitle} • testD`,
          url: shareUrl,
        });
        trackEvent('virtual_share_native', { slug: episodeSlug });
      } else if (navAny.share) {
        await navAny.share({ title: episodeTitle, text: episodeTitle, url: shareUrl });
        trackEvent('virtual_share_native_textonly', { slug: episodeSlug });
      } else {
        await handleDownload();
      }
    } catch {
      /* user cancelled */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden render target — sized to 1080x1350 then scaled down for preview */}
      <div className="overflow-hidden rounded-2xl border border-border/30 mx-auto" style={{ maxWidth: 320 }}>
        <div
          style={{
            transform: 'scale(0.296)',
            transformOrigin: 'top left',
            width: 1080,
            height: 1350,
          }}
        >
          <div
            ref={cardRef}
            style={{
              width: 1080,
              height: 1350,
              padding: 80,
              background: `linear-gradient(160deg, #0f0f1a 0%, #1a0420 50%, #0f0f1a 100%)`,
              color: '#f5e6c8',
              fontFamily: '"Noto Sans Thai", "Inter", system-ui, sans-serif',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Glow */}
            <div
              style={{
                position: 'absolute',
                top: -200,
                right: -200,
                width: 700,
                height: 700,
                background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            {/* Top brand */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '0.05em', color: '#fff' }}>testD</div>
              <div style={{ fontSize: 22, color: accent, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>VIRTUAL</div>
            </div>

            {/* Body */}
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 220, lineHeight: 1, marginBottom: 24 }}>{emoji}</div>
              <div style={{ fontSize: 30, color: accent, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 20 }}>
                {episodeTitle}
              </div>
              {resultTitle && (
                <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.15, color: '#fff', marginBottom: 28 }}>
                  {resultTitle}
                </div>
              )}
              {resultDetail && (
                <div style={{ fontSize: 32, lineHeight: 1.5, color: 'rgba(245,230,200,0.85)', maxWidth: 800, margin: '0 auto' }}>
                  {resultDetail}
                </div>
              )}
              {hint && (
                <div style={{ marginTop: 40, fontSize: 24, color: 'rgba(245,230,200,0.6)', fontStyle: 'italic' }}>
                  💡 {hint}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ position: 'relative', zIndex: 1, borderTop: `2px solid ${accent}55`, paddingTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 22, color: 'rgba(245,230,200,0.6)' }}>เล่นต่อได้ที่</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>testd.website/virtual/{episodeSlug}</div>
              </div>
              <div
                style={{
                  width: 88, height: 88, borderRadius: 18,
                  background: accent, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 44, fontWeight: 900,
                }}
              >
                ▶
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={handleDownload} variant="outline" disabled={busy} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          บันทึกภาพ
        </Button>
        <Button onClick={handleShare} disabled={busy} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          แชร์ผล
        </Button>
      </div>
    </div>
  );
}
