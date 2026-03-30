import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import {
  aggregateIdentityStats,
  IDENTITY_LABELS,
  IDENTITY_COLORS,
  type GenderIdentityKey,
} from "@/lib/normalizeIdentity";

interface Statistics {
  totalRequests: number;
  identityData: { name: string; value: number; color: string }[];
  ageData: { name: string; value: number; color: string }[];
}

const AGE_COLORS: Record<string, string> = {
  under_18: "hsl(280, 70%, 60%)",
  "18_24": "hsl(221, 83%, 53%)",
  "25_34": "hsl(142, 71%, 45%)",
  "35_44": "hsl(45, 93%, 47%)",
  "45_54": "hsl(24, 95%, 53%)",
  "55_plus": "hsl(330, 81%, 60%)",
  unknown: "hsl(220, 9%, 70%)",
};

export function TestStatistics() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<Statistics>({
    totalRequests: 0,
    identityData: [],
    ageData: [],
  });
  const [loading, setLoading] = useState(true);

  const getIdentityLabel = (key: GenderIdentityKey): string => {
    const entry = IDENTITY_LABELS[key];
    return entry?.[language] || key;
  };

  const getAgeLabel = (range: string): string => {
    const labels: Record<string, { th: string; en: string }> = {
      under_18: { th: "ต่ำกว่า 18 ปี", en: "Under 18" },
      "18_24": { th: "18-24 ปี", en: "18-24" },
      "25_34": { th: "25-34 ปี", en: "25-34" },
      "35_44": { th: "35-44 ปี", en: "35-44" },
      "45_54": { th: "45-54 ปี", en: "45-54" },
      "55_plus": { th: "55+ ปี", en: "55+" },
      unknown: { th: "ไม่ระบุ", en: "Unknown" },
    };
    return labels[range]?.[language] || range;
  };

  const fetchStatistics = async () => {
    try {
      // Use the secure database function to get aggregated statistics
      const { data, error } = await supabase.rpc('get_selftest_statistics');

      if (error) {
        console.error("Error fetching statistics:", error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const result = data[0] as {
        total_count: number;
        gender_stats: Array<{ gender: string; count: number }> | null;
        age_stats: Array<{ age_range: string; count: number }> | null;
      };
      
      const totalRequests = result.total_count || 0;

      // Normalize + re-group gender identity stats to show real categories
      const genderStatsArray = Array.isArray(result.gender_stats) ? result.gender_stats : [];
      const identityRows = aggregateIdentityStats(genderStatsArray);
      const identityData = identityRows.map((item) => ({
        name: getIdentityLabel(item.key),
        value: item.count,
        color: IDENTITY_COLORS[item.key] || "hsl(220, 9%, 46%)",
      }));

      // Parse age stats from JSONB
      const ageOrder = ["under_18", "18_24", "25_34", "35_44", "45_54", "55_plus", "unknown"];
      const ageStatsArray = Array.isArray(result.age_stats) ? result.age_stats : [];
      const ageData = ageStatsArray.map((item) => ({
        name: getAgeLabel(item.age_range),
        value: item.count,
        color: AGE_COLORS[item.age_range] || AGE_COLORS.unknown,
        order: ageOrder.indexOf(item.age_range),
      }))
      .sort((a, b) => a.order - b.order)
      .map(({ name, value, color }) => ({ name, value, color }));

      setStats({ totalRequests, identityData, ageData });
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();

    // Set up real-time subscription for new requests
    const channel = supabase
      .channel("selftest-stats")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "selftest_pii",
        },
        () => {
          fetchStatistics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [language]);

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
      </Card>
    );
  }

  // Don't show if no data yet
  if (stats.totalRequests === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Total Count - Hero Number */}
        <div className="text-center py-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              {language === "th" ? "จำนวนผู้ใช้บริการ" : "Total Users"}
            </span>
          </div>
          <div className="text-4xl font-bold text-primary">
            <AnimatedCounter value={stats.totalRequests} duration={1000} />
          </div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3 text-success" />
            <span className="text-xs text-success font-medium">
              {language === "th" ? "อัปเดตแบบเรียลไทม์" : "Real-time updates"}
            </span>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
