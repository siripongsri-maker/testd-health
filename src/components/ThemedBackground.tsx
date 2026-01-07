import { useTheme, themeConfig } from "@/lib/theme";
import { useEffect } from "react";

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
