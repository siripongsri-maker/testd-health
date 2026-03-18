import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { VIRTUAL_ZONES } from "@/config/virtualZones";
import { VirtualZoneCard } from "@/components/virtual/VirtualZoneCard";
import { VirtualIntroOverlay } from "@/components/virtual/VirtualIntroOverlay";
import { VirtualGuide } from "@/components/virtual/VirtualGuide";
import { useVirtualPresence } from "@/hooks/useVirtualPresence";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Users } from "lucide-react";

export default function VirtualMode() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const presence = useVirtualPresence("lobby");

  return (
    <>
      <VirtualIntroOverlay />

      <div className="min-h-[calc(100dvh-7rem)] px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            {language === "th" ? "กลับ" : "Back"}
          </Button>

          <div className="flex items-center gap-1.5 ml-auto">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Virtual Mode</span>
          </div>
        </div>

        {/* Online indicator */}
        {presence.totalOnline > 0 && (
          <div className="flex items-center justify-center gap-1.5 mb-3 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-muted-foreground">
              <Users className="inline h-3 w-3 mr-0.5 -mt-px" />
              {presence.totalOnline} {language === "th" ? "คนออนไลน์" : "online now"}
            </span>
          </div>
        )}

        {/* Perspective container */}
        <div className="mx-auto max-w-lg" style={{ perspective: "800px" }}>
          <div
            className="grid grid-cols-2 gap-3 sm:gap-4"
            style={{ transform: "rotateX(4deg)", transformOrigin: "center top" }}
          >
            {VIRTUAL_ZONES.map((zone, i) => (
              <VirtualZoneCard
                key={zone.id}
                zone={zone}
                index={i}
                presenceCount={presence.zoneCounts[zone.id] || 0}
              />
            ))}
          </div>
        </div>
      </div>

      {/* AI Guide FAB */}
      <VirtualGuide />
    </>
  );
}
