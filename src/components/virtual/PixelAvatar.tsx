import type { AvatarPalette } from "@/config/pixelWorldConfig";

interface Props {
  palette: AvatarPalette;
  isWalking?: boolean;
  label?: string;
  isMe?: boolean;
  facingLeft?: boolean;
}

type C = 0 | "h" | "s" | "e" | "t" | "p";

const SPRITE: C[][] = [
  [0, 0, "h", "h", "h", "h", 0, 0],
  [0, "h", "h", "h", "h", "h", "h", 0],
  [0, "h", "s", "s", "s", "s", "h", 0],
  [0, 0, "s", "s", "s", "s", 0, 0],
  [0, 0, "s", "e", "s", "e", 0, 0],
  [0, 0, 0, "s", "s", 0, 0, 0],
  [0, 0, "t", "t", "t", "t", 0, 0],
  [0, "t", "t", "t", "t", "t", "t", 0],
  [0, "s", "t", "t", "t", "t", "s", 0],
  [0, 0, "p", "p", "p", "p", 0, 0],
  [0, 0, "p", 0, 0, "p", 0, 0],
  [0, "p", "p", 0, 0, "p", "p", 0],
];

function fill(c: C, p: AvatarPalette): string | null {
  switch (c) {
    case "h": return p.hair;
    case "s": return p.skin;
    case "e": return "#445";
    case "t": return p.shirt;
    case "p": return p.pants;
    default:  return null;
  }
}

const PX = 3;

export function PixelAvatar({ palette, isWalking, label, isMe, facingLeft }: Props) {
  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: 8 * PX, transform: facingLeft ? "scaleX(-1)" : undefined }}
    >
      {/* Name label — only for the current user */}
      {isMe && label && (
        <div
          className="absolute -top-5 left-1/2 whitespace-nowrap pointer-events-none select-none"
          style={{
            transform: `translateX(-50%)${facingLeft ? " scaleX(-1)" : ""}`,
            fontFamily: "'Inter', 'Noto Sans Thai', sans-serif",
            fontSize: 8,
            fontWeight: 600,
            color: "#2a6a70",
            textShadow: "0 1px 2px rgba(255,255,255,.8)",
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </div>
      )}

      {/* "Me" indicator ring */}
      {isMe && (
        <div
          className="absolute"
          style={{
            bottom: -5,
            left: "50%",
            transform: "translateX(-50%)",
            width: 22,
            height: 8,
            borderRadius: "50%",
            border: "1.5px solid rgba(42,106,112,0.35)",
            background: "radial-gradient(ellipse, rgba(91,168,181,0.15) 0%, transparent 70%)",
          }}
        />
      )}

      {/* Drop shadow */}
      <div
        className="absolute"
        style={{
          bottom: -3,
          left: "50%",
          transform: "translateX(-50%)",
          width: 18,
          height: 5,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.1) 0%, transparent 70%)",
        }}
      />

      {/* SVG sprite */}
      <svg
        width={8 * PX}
        height={12 * PX}
        viewBox="0 0 8 12"
        shapeRendering="crispEdges"
        style={{
          imageRendering: "pixelated",
          animation: isWalking
            ? "pixel-walk 0.4s steps(2) infinite"
            : "pixel-breathe 3s ease-in-out infinite",
          filter: isMe
            ? "drop-shadow(0 1px 2px rgba(42,106,112,0.2))"
            : "drop-shadow(0 1px 1px rgba(0,0,0,0.08))",
          opacity: isMe ? 1 : 0.85,
        }}
      >
        {SPRITE.flatMap((row, ry) =>
          row.map((cell, cx) => {
            const color = fill(cell, palette);
            return color ? (
              <rect key={`${ry}-${cx}`} x={cx} y={ry} width={1} height={1} fill={color} />
            ) : null;
          }),
        )}
      </svg>
    </div>
  );
}
