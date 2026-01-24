import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';
import { useLanguage } from '@/lib/i18n';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWA();
  const { language } = useLanguage();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // Show prompt after a short delay if installable
    if ((isInstallable || isIOS) && !isInstalled) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isIOS]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt || dismissed || isInstalled) return null;

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300",
      "sm:left-auto sm:right-4 sm:max-w-sm"
    )}>
      <div className="relative bg-card border border-border rounded-2xl p-5 shadow-xl">
        {/* Close button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <Smartphone className="h-7 w-7 text-primary-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-semibold text-foreground mb-1">
              {language === 'th' ? 'ติดตั้งแอป SWING' : 'Install SWING App'}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {language === 'th' 
                ? 'เพิ่มไปยังหน้าจอหลักเพื่อเข้าถึงได้เร็วขึ้น' 
                : 'Add to home screen for quick access'}
            </p>

            {isIOS ? (
              // iOS instructions
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                <Share className="h-4 w-4 flex-shrink-0" />
                <span>
                  {language === 'th' 
                    ? 'แตะ Share แล้วเลือก "Add to Home Screen"' 
                    : 'Tap Share, then "Add to Home Screen"'}
                </span>
                <Plus className="h-4 w-4 flex-shrink-0" />
              </div>
            ) : (
              // Android/Desktop install button
              <Button 
                onClick={handleInstall}
                size="sm"
                className="gap-2"
                haptic="success"
              >
                <Download className="h-4 w-4" />
                {language === 'th' ? 'ติดตั้งเลย' : 'Install Now'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
