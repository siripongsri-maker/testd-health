import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import type { VirtualZone } from "@/config/virtualZones";
import {
  Home, TestTube, Calendar, ClipboardList, BookOpen,
  Heart, MessageCircle, Sparkles, ShieldHalf, Headphones,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, TestTube, Calendar, ClipboardList, BookOpen,
  Heart, MessageCircle, Sparkles, ShieldHalf, Headphones,
};

interface Props {
  zone: VirtualZone;
  index: number;
}

export function VirtualZoneCard({ zone, index }: Props) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const Icon = ICON_MAP[zone.icon] ?? Home;

  return (
    <button
      onClick={() => navigate(zone.targetRoute)}
      className={`
        group relative flex flex-col items-center gap-2 rounded-2xl
        border border-border/40 bg-gradient-to-br ${zone.color}
        backdrop-blur-md p-5 text-center
        transition-all duration-200
        hover:scale-[1.05] hover:shadow-lg hover:border-primary/40
        active:scale-[0.97]
        animate-fade-in
      `}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      {/* Glow dot */}
      <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />

      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/60 shadow-sm group-hover:shadow-md transition-shadow">
        <Icon className="h-6 w-6 text-primary" />
      </span>

      <span className="text-sm font-semibold text-foreground leading-tight">
        {language === "th" ? zone.labelTh : zone.labelEn}
      </span>
      <span className="text-[11px] text-muted-foreground leading-snug">
        {language === "th" ? zone.descriptionTh : zone.descriptionEn}
      </span>
    </button>
  );
}
