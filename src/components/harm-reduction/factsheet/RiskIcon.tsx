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

export function RiskIcon({ name, color = "#f59e0b", size = 14 }: Props) {
  const Icon = ICON_MAP[name] || Activity;
  return <Icon style={{ width: size, height: size, color, flexShrink: 0, marginTop: 2 }} />;
}
