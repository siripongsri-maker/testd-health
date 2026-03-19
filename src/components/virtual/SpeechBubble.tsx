import { useEffect, useState } from "react";

interface Props {
  message: string;
  name: string;
  x: number;
  y: number;
  /** Auto-dismiss after ms */
  duration?: number;
}

/**
 * A pixel-style speech bubble that floats above a position in the world.
 */
export function SpeechBubble({ message, name, x, y, duration = 6000 }: Props) {
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in
    requestAnimationFrame(() => setOpacity(1));
    const fadeTimer = setTimeout(() => setOpacity(0), duration - 400);
    const hideTimer = setTimeout(() => setVisible(false), duration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - 46,
        zIndex: 9999,
        transform: "translateX(-50%)",
        pointerEvents: "none",
        opacity,
        transition: "opacity 0.4s ease",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,.95)",
          backdropFilter: "blur(6px)",
          borderRadius: 10,
          padding: "4px 10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: "1px solid rgba(91,168,181,0.15)",
          maxWidth: 180,
          textAlign: "center",
          fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: "#5ba8b5",
            marginBottom: 1,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#2a4a54",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {message}
        </div>
      </div>
      {/* Tail */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "5px solid rgba(255,255,255,.95)",
          margin: "0 auto",
        }}
      />
    </div>
  );
}
