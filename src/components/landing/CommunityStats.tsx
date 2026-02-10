import { useEffect, useState } from "react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Heart, Package, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

interface StatsData {
  totalKits: number;
  totalMembers: number;
  peopleHelped: number;
}

export function CommunityStats() {
  const { language } = useLanguage();
  const [stats, setStats] = useState<StatsData>({
    totalKits: 0,
    totalMembers: 0,
    peopleHelped: 0,
  });
  const [isVisible, setIsVisible] = useState(false);

  const fetchStats = async () => {
    try {
      const { count: kitCount } = await supabase
        .from("kit_orders")
        .select("*", { count: "exact", head: true });

      const { count: memberCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: selftestCount } = await supabase
        .from("hiv_selftest_requests")
        .select("*", { count: "exact", head: true });

      setStats({
        totalKits: (kitCount || 0) + (selftestCount || 0),
        totalMembers: memberCount || 0,
        peopleHelped: (kitCount || 0) + (selftestCount || 0) + (memberCount || 0),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Re-fetch when import completes
    const handleImport = () => fetchStats();
    window.addEventListener("selftest-import-complete", handleImport);
    
    // Trigger animation after a short delay
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("selftest-import-complete", handleImport);
    };
  }, []);

  const statItems = [
    {
      icon: Package,
      value: stats.totalKits,
      labelTh: "ชุดตรวจส่งแล้ว",
      labelEn: "Kits Sent",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: Users,
      value: stats.totalMembers,
      labelTh: "สมาชิก",
      labelEn: "Members",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Heart,
      value: stats.peopleHelped,
      labelTh: "ผู้รับบริการ",
      labelEn: "People Helped",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div 
      className={`grid grid-cols-3 gap-2 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {statItems.map((item, index) => (
        <div
          key={index}
          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className={`p-2 rounded-xl ${item.bgColor}`}>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </div>
          <div className="text-xl font-bold text-foreground">
            <AnimatedCounter value={item.value} duration={1800} />
            <span className="text-primary">+</span>
          </div>
          <span className="text-[10px] text-muted-foreground text-center leading-tight">
            {language === "th" ? item.labelTh : item.labelEn}
          </span>
        </div>
      ))}
    </div>
  );
}
