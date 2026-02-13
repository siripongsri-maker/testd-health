import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PWAUpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      // New service worker took control — reload to get fresh assets
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Check for waiting service worker on load
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        setRegistration(reg);
        setShowUpdate(true);
        return;
      }

      // Listen for new service workers installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content available
            setRegistration(reg);
            setShowUpdate(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!showUpdate) return null;

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 z-50 animate-slide-up",
      "sm:left-auto sm:right-4 sm:max-w-sm"
    )}>
      <button
        onClick={handleUpdate}
        className="w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-card/95 backdrop-blur-lg p-4 shadow-lg hover:bg-accent/80 transition-colors"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">Update Available</p>
          <p className="text-xs text-muted-foreground">Tap to refresh and get the latest version</p>
        </div>
      </button>
    </div>
  );
}
