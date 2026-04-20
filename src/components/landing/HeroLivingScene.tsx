import { useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { trackEvent } from "@/hooks/useAnalytics";
import { cn } from "@/lib/utils";

/**
 * "Living photograph" hero — a looping illustrated scene of the SWING clinic.
 * Clean, frameless, blends with the page background. Whole surface routes to /booking.
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
      aria-label={isTh ? "เริ่มจองตรวจฟรี ที่คลินิก SWING" : "Start booking a free test at the SWING clinic"}
      className={cn(
        "group relative block w-full overflow-hidden rounded-3xl",
        "bg-gradient-to-br from-[hsl(170_40%_92%)] via-[hsl(160_35%_94%)] to-[hsl(30_45%_95%)]",
        "transition-all duration-500 ease-out",
        "hover:shadow-xl hover:shadow-primary/10",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "cursor-pointer text-left",
      )}
      style={{ aspectRatio: "4 / 3" }}
    >
      {/* Looping video — the living photograph. Slight scale crops out the watermark. */}
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
          "scale-[1.12] origin-center",
          "transition-transform duration-700 ease-out",
          isHovered && "scale-[1.15]",
        )}
      />

      {/* Teal/mint tint to blend with site palette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-tr from-[hsl(170_50%_70%/0.18)] via-[hsl(160_40%_85%/0.08)] to-[hsl(30_50%_88%/0.12)] mix-blend-soft-light"
      />

      {/* Soft edge fade so the video melts into the surrounding background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, hsl(170 35% 94% / 0.55) 100%)",
        }}
      />
    </button>
  );
}
