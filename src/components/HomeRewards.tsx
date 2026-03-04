import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift } from "lucide-react";

interface Reward {
  id: string;
  reward_title: string;
  reward_description: string;
  reward_image_url: string | null;
  status_label: string | null;
  display_order: number;
}

export function HomeRewards() {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Check feature flag
      const { data: flag } = await supabase
        .from("app_feature_flags")
        .select("enabled")
        .eq("flag_key", "homepage_rewards_enabled")
        .single();

      if (!flag?.enabled) {
        setEnabled(false);
        setLoading(false);
        return;
      }

      setEnabled(true);

      const { data } = await supabase
        .from("homepage_rewards")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      setRewards((data as Reward[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-56 rounded-2xl shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!enabled || rewards.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" />
        <h2 className="font-bold text-foreground text-sm sm:text-base">
          {t("home.healthRewards")}
        </h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        {t("home.healthRewardsSubtitle")}
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {rewards.map((r) => (
          <div
            key={r.id}
            className="snap-start shrink-0 w-52 sm:w-56 glass rounded-2xl overflow-hidden flex flex-col"
          >
            {r.reward_image_url ? (
              <img
                src={r.reward_image_url}
                alt={r.reward_title}
                loading="lazy"
                className="h-28 w-full object-cover"
              />
            ) : (
              <div className="h-28 w-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Gift className="h-10 w-10 text-primary/40" />
              </div>
            )}
            <div className="p-3 flex flex-col gap-1 flex-1">
              <div className="flex items-start justify-between gap-1">
                <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2">
                  {r.reward_title}
                </h3>
                {r.status_label && (
                  <span className="shrink-0 text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {r.status_label}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {r.reward_description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
