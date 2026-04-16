import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface Prefs {
  email_enabled: boolean;
  in_app_enabled: boolean;
  email_cooldown_minutes: number;
}

export function ChatNotificationSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isEn = language === "en";
  const [prefs, setPrefs] = useState<Prefs>({
    email_enabled: true,
    in_app_enabled: true,
    email_cooldown_minutes: 15,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("admin_chat_notification_prefs")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            email_enabled: data.email_enabled,
            in_app_enabled: data.in_app_enabled,
            email_cooldown_minutes: data.email_cooldown_minutes,
          });
        }
        setLoaded(true);
      });
  }, [user]);

  const save = useCallback(async (updates: Partial<Prefs>) => {
    if (!user) return;
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);
    const { error } = await supabase
      .from("admin_chat_notification_prefs")
      .upsert({
        user_id: user.id,
        ...newPrefs,
      }, { onConflict: "user_id" });
    if (error) toast.error(error.message);
    else toast.success(isEn ? "Saved" : "บันทึกแล้ว");
  }, [user, prefs, isEn]);

  if (!loaded) return null;

  return (
    <div className="space-y-4 p-4 rounded-xl border bg-card">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{isEn ? "Notification Settings" : "ตั้งค่าการแจ้งเตือน"}</h3>
      </div>

      <div className="space-y-3">
        {/* Email toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs">{isEn ? "Email notifications" : "แจ้งเตือนอีเมล"}</Label>
          </div>
          <Switch
            checked={prefs.email_enabled}
            onCheckedChange={(v) => save({ email_enabled: v })}
          />
        </div>

        {/* In-app toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs">{isEn ? "In-app notifications" : "แจ้งเตือนในแอป"}</Label>
          </div>
          <Switch
            checked={prefs.in_app_enabled}
            onCheckedChange={(v) => save({ in_app_enabled: v })}
          />
        </div>

        {/* Cooldown */}
        {prefs.email_enabled && (
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              {isEn ? "Email cooldown" : "เว้นช่วงอีเมล"}
            </Label>
            <Select
              value={String(prefs.email_cooldown_minutes)}
              onValueChange={(v) => save({ email_cooldown_minutes: parseInt(v) })}
            >
              <SelectTrigger className="w-24 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 {isEn ? "min" : "นาที"}</SelectItem>
                <SelectItem value="15">15 {isEn ? "min" : "นาที"}</SelectItem>
                <SelectItem value="30">30 {isEn ? "min" : "นาที"}</SelectItem>
                <SelectItem value="60">1 {isEn ? "hour" : "ชม."}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
