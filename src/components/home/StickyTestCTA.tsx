import { useNavigate } from 'react-router-dom';
import { TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/hooks/useAnalytics';

export function StickyTestCTA() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <Button
        variant="default"
        size="lg"
        className="shadow-xl shadow-primary/30 rounded-full px-6"
        onClick={() => { trackEvent('sticky_cta_click', { source: 'homepage', target: '/booking' }); navigate('/booking'); }}
      >
        <TestTube className="h-5 w-5" />
        จองตรวจ HIV ฟรี
      </Button>
    </div>
  );
}
