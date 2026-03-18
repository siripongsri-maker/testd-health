import React from "react";
import { Activity, Brain, Flame, Droplets, Eye } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
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

export const RiskIcon: React.FC<Props> = ({ name, color = "#f59e0b", size = 14 }) => {
  const Icon = ICON_MAP[name] || Activity;
  return (
    <span style={{ display: "inline-flex", flexShrink: 0, marginTop: 2 }}>
      <Icon size={size} color={color} />
    </span>
  );
};
