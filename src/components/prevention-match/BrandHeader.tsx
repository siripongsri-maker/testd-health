import testdLogo from '@/assets/testd-logo.png';
import swingLogo from '@/assets/swing-logo.webp';

interface Props {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { logo: 'h-5', sep: 'text-[9px]', label: 'text-[8px]' },
  md: { logo: 'h-8', sep: 'text-xs', label: 'text-[10px]' },
  lg: { logo: 'h-10', sep: 'text-sm', label: 'text-xs' },
};

export function BrandHeader({ variant = 'dark', size = 'md', className = '' }: Props) {
  const s = SIZES[size];
  const isLight = variant === 'light';

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div className={`
        inline-flex items-center gap-3 px-4 py-2 rounded-full
        ${isLight ? 'bg-white/10 backdrop-blur-sm' : 'bg-muted/40 backdrop-blur-sm'}
      `}>
        <img
          src={testdLogo}
          alt="testD"
          className={`${s.logo} object-contain ${isLight ? 'brightness-200' : ''}`}
        />
        <span className={`${s.sep} font-medium ${isLight ? 'text-white/40' : 'text-muted-foreground/40'}`}>
          ×
        </span>
        <img
          src={swingLogo}
          alt="SWING"
          className={`${s.logo} object-contain ${isLight ? 'brightness-200' : ''}`}
        />
      </div>
      <span className={`${s.label} tracking-[0.15em] uppercase font-medium ${isLight ? 'text-white/30' : 'text-muted-foreground/40'}`}>
        Prevention Match
      </span>
    </div>
  );
}
