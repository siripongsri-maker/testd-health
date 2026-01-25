import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 animate-slide-up",
      "safe-top"
    )}>
      <Alert 
        variant="destructive" 
        className="rounded-none border-x-0 border-t-0 bg-destructive text-destructive-foreground"
      >
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="ml-2 font-medium">
          You're offline. Some features may be unavailable.
        </AlertDescription>
      </Alert>
    </div>
  );
}
