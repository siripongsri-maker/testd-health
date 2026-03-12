import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Droplets, Shield, TestTube, Pill, Car } from "lucide-react";
import { type Nudge, dismissNudge } from "@/lib/SafetyNudges";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/hooks/useAnalytics";

const ICON_MAP: Record<string, React.ElementType> = {
  droplets: Droplets,
  shield: Shield,
  "test-tube": TestTube,
  pill: Pill,
  car: Car,
};

interface Props {
  nudge: Nudge;
  onDismiss: () => void;
}

export function NudgeCard({ nudge, onDismiss }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const Icon = ICON_MAP[nudge.icon] || Droplets;

  const handleDismiss = () => {
    dismissNudge(nudge.id);
    trackEvent("hr_nudge_dismissed", { nudge_type: nudge.type });
    // Log to db anonymously
    supabase.from("hr_nudge_events").insert({ nudge_type: nudge.type, action: "dismissed" }).then();
    onDismiss();
  };

  return (
    <Card className="border border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
      <CardContent className="p-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">
            {isEn ? nudge.titleEn : nudge.titleTh}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {isEn ? nudge.descEn : nudge.descTh}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-6 w-6 p-0 flex-shrink-0">
          <X className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
