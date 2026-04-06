import { useNavigate } from 'react-router-dom';
import { TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StickyTestCTA() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <Button
        variant="default"
        size="lg"
        className="shadow-xl shadow-primary/30 rounded-full px-6"
        onClick={() => navigate('/booking')}
      >
        <TestTube className="h-5 w-5" />
        ตรวจ HIV ฟรี
      </Button>
    </div>
  );
}
