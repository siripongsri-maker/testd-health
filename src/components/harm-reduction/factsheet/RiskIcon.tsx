import { forwardRef } from "react";
import { Activity, Brain, Flame, Droplets, Eye } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  Activity,
  Brain,
  Flame,
  Droplets,
  Eye,
};

interface Props {
  name: string;
  color?: string;
  size?: number;
}

export const RiskIcon = forwardRef<HTMLSpanElement, Props>(({ name, color = "#f59e0b", size = 14 }, ref) => {
  const Icon = ICON_MAP[name] || Activity;
  return (
    <span ref={ref} style={{ display: "inline-flex", flexShrink: 0, marginTop: 2 }}>
      <Icon style={{ width: size, height: size, color }} />
    </span>
  );
});

RiskIcon.displayName = "RiskIcon";
