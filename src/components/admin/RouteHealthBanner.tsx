import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

/**
 * Compact banner shown in AdminLayout when any enabled critical route is failing.
 * Polls once on mount + every 5 minutes. Admin-only via RLS.
 */
export function RouteHealthBanner() {
  const [failing, setFailing] = useState<{ path: string; label: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      const { data } = await supabase
        .from("route_health_targets")
        .select("path, label, last_ok, enabled")
        .eq("enabled", true)
        .eq("last_ok", false);
      if (!cancelled) setFailing((data ?? []) as any);
    };
    fetchOnce();
    const t = setInterval(fetchOnce, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (failing.length === 0) return null;

  return (
    <Link
      to="/admin?tab=route-health"
      className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/30 text-sm text-destructive hover:bg-destructive/15"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="font-medium">ลิงก์ใช้งานไม่ได้ {failing.length} รายการ:</span>
      <span className="truncate text-xs opacity-80">
        {failing.slice(0, 3).map((f) => f.path).join(", ")}
        {failing.length > 3 && ` +${failing.length - 3}`}
      </span>
      <span className="ml-auto text-xs underline">ดู Route Health →</span>
    </Link>
  );
}
