import { Volume2, Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTTS } from '@/hooks/useTTS';
import { useLanguage } from '@/lib/i18n';

interface ListenButtonProps {
  textTh: string;
  textEn: string;
  className?: string;
  size?: 'sm' | 'default';
}

export function ListenButton({ textTh, textEn, className, size = 'sm' }: ListenButtonProps) {
  const { language } = useLanguage();
  const { speak, stop, isPlaying, isLoading } = useTTS();

  const handleClick = () => {
    if (isPlaying) {
      stop();
    } else {
      const text = language === 'th' ? textTh : textEn;
      speak(text, language);
    }
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
      ) : isPlaying ? (
        <Square className="h-3.5 w-3.5 mr-1.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5 mr-1.5" />
      )}
      {isPlaying
        ? (language === 'th' ? 'หยุด' : 'Stop')
        : (language === 'th' ? '🔊 ฟังคำแนะนำ' : '🔊 Listen')}
    </Button>
  );
}
