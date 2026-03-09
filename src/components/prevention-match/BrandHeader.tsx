import testdLogo from '@/assets/testd-logo.png';
import swingLogo from '@/assets/swing-logo.webp';

interface Props {
  variant?: 'light' | 'dark';
  className?: string;
}

export function BrandHeader({ variant = 'dark', className = '' }: Props) {
  const textClass = variant === 'light' ? 'text-white/50' : 'text-muted-foreground/50';

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <img src={testdLogo} alt="testD" className="h-6 object-contain" />
      <span className={`text-[10px] ${textClass}`}>×</span>
      <img src={swingLogo} alt="SWING" className="h-6 object-contain" />
    </div>
  );
}
