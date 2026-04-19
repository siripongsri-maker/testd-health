import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { trackEvent } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";

/**
 * "Living photograph" hero — a looping illustrated scene of the SWING clinic.
 * Whole surface is clickable and routes the visitor to the booking flow.
 */
export function HeroLivingScene() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isTh = language === "th";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reducedMotion) {
      v.pause();
    } else {
      v.play().catch(() => {/* autoplay blocked — poster will show */});
    }
  }, [reducedMotion]);

  const handleEnter = () => {
    trackEvent("hero_living_scene_click", { source: "landing", target: "/booking" });
    navigate("/booking");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleEnter();
    }
  };

  return (
    <button
      type="button"
      onClick={handleEnter}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      aria-label={isTh ? "เริ่มจองตรวจ HIV ฟรี ที่คลินิก SWING" : "Start booking a free HIV test at the SWING clinic"}
      className={cn(
        "group relative block w-full overflow-hidden rounded-3xl",
        "ring-1 ring-border/40 shadow-lg shadow-primary/10",
        "transition-all duration-500 ease-out",
        "hover:shadow-xl hover:shadow-primary/20 hover:ring-primary/30",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "cursor-pointer text-left",
      )}
      style={{ aspectRatio: "16 / 9" }}
    >
      {/* Looping video — the living photograph */}
      <video
        ref={videoRef}
        src="/hero/swing-clinic-loop.mp4"
        poster="/hero/swing-clinic-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          // Slight scale crops the bottom-right "Veo" watermark out of frame
          "scale-[1.06] origin-center",
          "transition-transform duration-700 ease-out",
          isHovered && "scale-[1.09]",
        )}
      />

      {/* Soft warm wash that reacts on hover — keeps brand palette */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          "bg-gradient-to-tr from-[hsl(7_100%_72%/0.10)] via-transparent to-[hsl(170_25%_55%/0.10)]",
          isHovered ? "opacity-100" : "opacity-60",
        )}
      />

      {/* Bottom gradient for legible CTA copy */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-background/85 via-background/30 to-transparent"
      />

      {/* Floating hint pill (top-right) — gentle pulse */}
      <div
        className={cn(
          "absolute top-3 right-3 sm:top-4 sm:right-4",
          "flex items-center gap-1.5 rounded-full",
          "bg-white/85 backdrop-blur-sm px-3 py-1.5",
          "text-[11px] sm:text-xs font-semibold text-foreground",
          "shadow-md shadow-black/10 ring-1 ring-white/60",
          "transition-transform duration-500",
          !reducedMotion && "animate-pulse-soft",
          isHovered && "scale-105",
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(7_90%_62%)]" />
        {isTh ? "เริ่มตรวจ" : "Start testing"}
        <ArrowRight className="h-3 w-3" />
      </div>

      {/* Bottom CTA — the action call */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5">
        <div
          className={cn(
            "flex items-center justify-between gap-3",
            "rounded-2xl bg-white/90 backdrop-blur-md",
            "px-4 py-3 sm:px-5 sm:py-3.5",
            "ring-1 ring-white/70 shadow-lg shadow-black/10",
            "transition-all duration-500",
            isHovered && "bg-white shadow-xl -translate-y-0.5",
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(7_100%_72%/0.15)]">
              <MapPin className="h-4 w-4 text-[hsl(7_75%_55%)]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold text-foreground leading-tight truncate">
                {isTh ? "ตรวจฟรี ใกล้คุณ" : "Find free testing near you"}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight truncate">
                {isTh ? "เป็นความลับ ปลอดภัย ไม่ต้องใช้บัตร" : "Private, safe, no ID required"}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              "bg-gradient-to-br from-[hsl(7_90%_65%)] to-[hsl(7_75%_55%)]",
              "text-white shadow-md shadow-[hsl(7_75%_55%/0.4)]",
              "transition-transform duration-300",
              isHovered && "translate-x-0.5 scale-105",
            )}
            aria-hidden="true"
          >
            <ArrowRight className="h-4.5 w-4.5" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </button>
  );
}
