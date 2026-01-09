import { useTheme, themeConfig, ThemeType } from "@/lib/theme";
import { useEffect } from "react";
import { Heart, Sparkles, Star, Zap, Circle, Triangle, Plus, Sun, Moon, Flower2 } from "lucide-react";

export function ThemedBackground() {
  const { theme } = useTheme();
  const config = themeConfig[theme];

  useEffect(() => {
    const root = document.documentElement;
    
    // Update CSS variables
    root.style.setProperty('--primary', config.primary);
    root.style.setProperty('--accent', config.accent);
    root.style.setProperty('--background', config.background);
    root.style.setProperty('--gradient-hero', config.gradientHero);
    root.style.setProperty('--gradient-primary', config.gradientPrimary);
    root.style.setProperty('--theme-pattern', config.pattern);
    
    // Update ring to match primary
    root.style.setProperty('--ring', config.primary);
    root.style.setProperty('--level', config.primary);
    
  }, [theme, config]);

  return null;
}

export function PatternOverlay({ className = "" }: { className?: string }) {
  const { theme } = useTheme();
  const config = themeConfig[theme];
  
  return (
    <div 
      className={`pointer-events-none fixed inset-0 ${className}`}
      style={{ 
        backgroundImage: config.pattern,
        opacity: 0.6,
      }}
    />
  );
}

export function RainbowSwingBackground() {
  return (
    <>
      {/* Rainbow gradient overlay */}
      <div className="rainbow-swing-bg" />
      {/* Swinging rainbow waves at bottom */}
      <div className="rainbow-wave" />
      <div className="rainbow-wave-2" />
    </>
  );
}

// Floating decorative elements for each theme
const themeDecorations: Record<ThemeType, { 
  icons: React.ReactNode[];
  colors: string[];
}> = {
  casual: {
    icons: [
      <Plus key="1" className="w-full h-full" />,
      <Circle key="2" className="w-full h-full" />,
      <Star key="3" className="w-full h-full" />,
    ],
    colors: ['hsl(174 58% 39% / 0.15)', 'hsl(16 85% 66% / 0.12)', 'hsl(174 58% 50% / 0.1)'],
  },
  pride: {
    icons: [
      <Heart key="1" className="w-full h-full" />,
      <Sparkles key="2" className="w-full h-full" />,
      <Star key="3" className="w-full h-full" />,
      <Sun key="4" className="w-full h-full" />,
    ],
    colors: [
      'hsl(350 80% 60% / 0.2)', 
      'hsl(45 100% 55% / 0.18)', 
      'hsl(120 60% 50% / 0.15)', 
      'hsl(280 70% 55% / 0.18)'
    ],
  },
  lesbian: {
    icons: [
      <Heart key="1" className="w-full h-full" />,
      <Flower2 key="2" className="w-full h-full" />,
      <Moon key="3" className="w-full h-full" />,
      <Sparkles key="4" className="w-full h-full" />,
    ],
    colors: [
      'hsl(330 70% 50% / 0.18)', 
      'hsl(15 90% 65% / 0.15)', 
      'hsl(280 60% 50% / 0.12)',
      'hsl(330 60% 60% / 0.1)'
    ],
  },
  youth: {
    icons: [
      <Zap key="1" className="w-full h-full" />,
      <Triangle key="2" className="w-full h-full" />,
      <Star key="3" className="w-full h-full" />,
      <Sparkles key="4" className="w-full h-full" />,
    ],
    colors: [
      'hsl(200 100% 50% / 0.18)', 
      'hsl(160 84% 45% / 0.15)', 
      'hsl(200 80% 60% / 0.12)',
      'hsl(160 70% 50% / 0.1)'
    ],
  },
  testbkk: {
    icons: [
      <Star key="1" className="w-full h-full" />,
      <Zap key="2" className="w-full h-full" />,
      <Sparkles key="3" className="w-full h-full" />,
      <Circle key="4" className="w-full h-full" />,
    ],
    colors: [
      'hsl(45 100% 50% / 0.15)', 
      'hsl(35 90% 45% / 0.12)', 
      'hsl(45 90% 55% / 0.1)',
      'hsl(350 80% 55% / 0.08)'
    ],
  },
};

// Predefined positions for floating elements
const floatingPositions = [
  { top: '8%', left: '5%', size: 32, delay: 0, duration: 8 },
  { top: '15%', right: '8%', size: 24, delay: 1.5, duration: 10 },
  { top: '35%', left: '3%', size: 20, delay: 3, duration: 9 },
  { top: '50%', right: '5%', size: 28, delay: 0.5, duration: 11 },
  { top: '65%', left: '8%', size: 22, delay: 2, duration: 7 },
  { top: '75%', right: '10%', size: 18, delay: 4, duration: 12 },
  { top: '25%', left: '85%', size: 26, delay: 1, duration: 9 },
  { top: '85%', left: '15%', size: 16, delay: 2.5, duration: 10 },
];

export function FloatingDecorations() {
  const { theme } = useTheme();
  const decorations = themeDecorations[theme];
  
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {floatingPositions.map((pos, index) => {
        const iconIndex = index % decorations.icons.length;
        const colorIndex = index % decorations.colors.length;
        
        return (
          <div
            key={`${theme}-${index}`}
            className="absolute animate-float"
            style={{
              top: pos.top,
              left: pos.left,
              right: pos.right,
              width: pos.size,
              height: pos.size,
              color: decorations.colors[colorIndex],
              animationDelay: `${pos.delay}s`,
              animationDuration: `${pos.duration}s`,
            }}
          >
            {decorations.icons[iconIndex]}
          </div>
        );
      })}
    </div>
  );
}
