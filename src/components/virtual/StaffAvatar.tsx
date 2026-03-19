/**
 * Stationed SWING staff avatar — sits behind each desk.
 * Pink/magenta outfit, warm expression, gentle breathing animation.
 */

interface Props {
  name?: string;
  size?: number;
}

export function StaffAvatar({ size = 28 }: Props) {
  const px = size / 8;

  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 8 11"
      shapeRendering="crispEdges"
      style={{
        imageRendering: "pixelated",
        animation: "pixel-breathe 3s ease-in-out infinite",
        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.12))",
      }}
    >
      {/* Hair */}
      <rect x={2} y={0} width={4} height={1} fill="#3a2a20" />
      <rect x={1} y={1} width={6} height={1} fill="#3a2a20" />

      {/* Face */}
      <rect x={1} y={2} width={6} height={1} fill="#f4d4b8" />
      <rect x={2} y={3} width={4} height={1} fill="#f4d4b8" />

      {/* Eyes (friendly) */}
      <rect x={2} y={2} width={1} height={1} fill="#445" />
      <rect x={5} y={2} width={1} height={1} fill="#445" />

      {/* Smile */}
      <rect x={3} y={3} width={2} height={0.5} fill="#e8a090" rx={0.2} />

      {/* SWING shirt (pink/magenta) */}
      <rect x={2} y={4} width={4} height={1} fill="#d85a8a" />
      <rect x={1} y={5} width={6} height={1} fill="#d85a8a" />
      <rect x={1} y={6} width={6} height={1} fill="#c84878" />

      {/* Arms (skin) */}
      <rect x={0} y={5} width={1} height={2} fill="#f4d4b8" />
      <rect x={7} y={5} width={1} height={2} fill="#f4d4b8" />

      {/* Pants */}
      <rect x={2} y={7} width={4} height={1} fill="#485060" />
      <rect x={2} y={8} width={2} height={1} fill="#485060" />
      <rect x={4} y={8} width={2} height={1} fill="#485060" />

      {/* SWING badge on shirt */}
      <rect x={3} y={5} width={2} height={0.8} fill="#fff" rx={0.3} opacity={0.7} />
    </svg>
  );
}
