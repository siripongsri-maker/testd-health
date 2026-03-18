import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { VIRTUAL_ZONES } from "@/config/virtualZones";
import { VirtualZoneCard } from "@/components/virtual/VirtualZoneCard";
import { VirtualIntroOverlay } from "@/components/virtual/VirtualIntroOverlay";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin } from "lucide-react";

export default function VirtualMode() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <>
      <VirtualIntroOverlay />

      <div className="min-h-[calc(100dvh-7rem)] px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
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
            <span className="text-sm font-semibold text-foreground">
              {language === "th" ? "Virtual Mode" : "Virtual Mode"}
            </span>
          </div>
        </div>

        {/* Perspective container */}
        <div
          className="mx-auto max-w-lg"
          style={{ perspective: "800px" }}
        >
          <div
            className="grid grid-cols-2 gap-3 sm:gap-4"
            style={{ transform: "rotateX(4deg)", transformOrigin: "center top" }}
          >
            {VIRTUAL_ZONES.map((zone, i) => (
              <VirtualZoneCard key={zone.id} zone={zone} index={i} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
