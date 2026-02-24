import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, Heart, Settings, Trophy, LogOut } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { triggerHaptic } from "@/hooks/useHaptic";
import { PrefetchLink } from "@/components/PrefetchLink";
import { useState, useCallback, useRef } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  type: 'bubble' | 'petal';
  delay: number;
  angle: number;
  size: number;
}

let particleIdCounter = 0;

function NavParticles({ particles }: { particles: Particle[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-10">
      {particles.map((p) => (
        <span
          key={p.id}
          className={cn(
            "absolute rounded-full animate-nav-particle",
            p.type === 'bubble' ? "bg-primary/40 border border-primary/20" : "nav-petal"
          )}
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: p.size,
            height: p.size,
            '--angle': `${p.angle}deg`,
            '--delay': `${p.delay}ms`,
            animationDelay: `${p.delay}ms`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function BottomNav() {
  // Navigation is now handled by AppLayout sidebar/mobile sheet
  return null;
}
