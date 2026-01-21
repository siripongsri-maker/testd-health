import { useCallback } from "react";
import confetti from "canvas-confetti";

type CelebrationType = "badge" | "levelUp" | "streak" | "achievement";

export function useCelebration() {
  const celebrate = useCallback((type: CelebrationType = "achievement") => {
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    switch (type) {
      case "badge":
        // Golden star burst for badges
        confetti({
          ...defaults,
          particleCount: 100,
          spread: 70,
          colors: ["#FFD700", "#FFA500", "#FF6B35", "#FFE066"],
          shapes: ["star", "circle"],
          scalar: 1.2,
        });
        break;

      case "levelUp":
        // Multi-burst celebration for level ups
        const duration = 1500;
        const animationEnd = Date.now() + duration;

        const levelUpInterval = setInterval(() => {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) {
            clearInterval(levelUpInterval);
            return;
          }

          const particleCount = 50 * (timeLeft / duration);

          // Left side burst
          confetti({
            ...defaults,
            particleCount: Math.floor(particleCount),
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: ["#8B5CF6", "#A855F7", "#C084FC", "#E879F9"],
          });

          // Right side burst
          confetti({
            ...defaults,
            particleCount: Math.floor(particleCount),
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: ["#8B5CF6", "#A855F7", "#C084FC", "#E879F9"],
          });
        }, 250);
        break;

      case "streak":
        // Fire-themed burst for streaks
        confetti({
          ...defaults,
          particleCount: 80,
          spread: 60,
          colors: ["#FF6B35", "#FF8C00", "#FFD700", "#FF4500"],
          shapes: ["circle"],
          scalar: 1.1,
        });
        break;

      case "achievement":
      default:
        // Rainbow celebration for general achievements
        const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];
        confetti({
          ...defaults,
          particleCount: 100,
          spread: 100,
          colors,
        });
        break;
    }
  }, []);

  const celebrateBadge = useCallback(() => celebrate("badge"), [celebrate]);
  const celebrateLevelUp = useCallback(() => celebrate("levelUp"), [celebrate]);
  const celebrateStreak = useCallback(() => celebrate("streak"), [celebrate]);
  const celebrateAchievement = useCallback(() => celebrate("achievement"), [celebrate]);

  return {
    celebrate,
    celebrateBadge,
    celebrateLevelUp,
    celebrateStreak,
    celebrateAchievement,
  };
}
