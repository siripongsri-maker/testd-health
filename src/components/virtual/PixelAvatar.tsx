import type { AvatarPalette } from "@/config/pixelWorldConfig";

interface Props {
  palette: AvatarPalette;
  isWalking?: boolean;
  label?: string;
  isMe?: boolean;
  facingLeft?: boolean;
}

/*  8×12 pixel sprite.
    0 = transparent, h = hair, s = skin, e = eye, t = shirt, p = pants  */
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
    case "e": return "#111";
    case "t": return p.shirt;
    case "p": return p.pants;
    default:  return null;
  }
}

const PX = 3; // each sprite-pixel = 3 CSS px → 24×36 avatar

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
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 6,
            color: "#fff",
            textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
          }}
        >
          {label}
        </div>
      )}

      {/* Drop shadow */}
      <div
        className="absolute"
        style={{
          bottom: -2,
          left: "50%",
          transform: "translateX(-50%)",
          width: 16,
          height: 4,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.2)",
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
          animation: isWalking ? "pixel-bob 0.35s steps(2) infinite" : undefined,
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
