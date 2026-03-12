import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/hooks/useAnalytics";
import { Smile, Moon, Brain, Flame, Check } from "lucide-react";

const CHECKIN_STORAGE_KEY = "hr_checkin_last";
const STREAK_STORAGE_KEY = "hr_checkin_streak";
const TOKEN_KEY = "hr_anon_token";

function getAnonToken(): string {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getStreak(): number {
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) return 0;
    const { count, lastDate } = JSON.parse(raw);
    const today = getToday();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (lastDate === today) return count;
    if (lastDate === yesterday) return count;
    return 0;
  } catch {
    return 0;
  }
}

function saveStreak(count: number) {
  localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify({ count, lastDate: getToday() }));
}

const MOOD_LABELS_TH = ["แย่มาก", "ไม่ดี", "เฉยๆ", "ดี", "ดีมาก"];
const MOOD_LABELS_EN = ["Very bad", "Bad", "Okay", "Good", "Great"];
const MOOD_EMOJI = ["😞", "😕", "😐", "🙂", "😊"];

export function DailyCheckin() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEn = language === "en";
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [sleep, setSleep] = useState(3);
  const [submitted, setSubmitted] = useState(() => {
    return localStorage.getItem(CHECKIN_STORAGE_KEY) === getToday();
  });
  const [streak, setStreak] = useState(getStreak);
  const [saving, setSaving] = useState(false);

  if (submitted) {
    return (
      <Card className="border border-emerald-200/60 dark:border-emerald-800/30 bg-emerald-50/30 dark:bg-emerald-950/10">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {isEn ? "Checked in today!" : "เช็คอินวันนี้แล้ว!"}
            </p>
            {streak > 1 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" />
                {isEn ? `${streak}-day streak` : `ต่อเนื่อง ${streak} วัน`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload: any = {
        mood,
        stress,
        sleep,
        checkin_date: getToday(),
      };
      if (user?.id) {
        payload.user_id = user.id;
      } else {
        payload.anonymous_token = getAnonToken();
      }

      await supabase.from("hr_checkins").insert(payload);

      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const lastDate = localStorage.getItem(CHECKIN_STORAGE_KEY);
      const newStreak = lastDate === yesterday ? getStreak() + 1 : 1;

      localStorage.setItem(CHECKIN_STORAGE_KEY, getToday());
      saveStreak(newStreak);
      setStreak(newStreak);
      setSubmitted(true);
      trackEvent("hr_daily_checkin", { mood, stress, sleep, streak: newStreak });
    } catch (err) {
      console.error("Check-in error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Smile className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {isEn ? "How are you today?" : "วันนี้เป็นยังไงบ้าง?"}
          </h3>
        </div>

        {/* Mood */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Smile className="h-3 w-3" />
              {isEn ? "Mood" : "อารมณ์"}
            </span>
            <span className="text-xs font-medium">
              {MOOD_EMOJI[mood - 1]} {isEn ? MOOD_LABELS_EN[mood - 1] : MOOD_LABELS_TH[mood - 1]}
            </span>
          </div>
          <Slider value={[mood]} min={1} max={5} step={1} onValueChange={([v]) => setMood(v)} />
        </div>

        {/* Stress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Brain className="h-3 w-3" />
              {isEn ? "Stress" : "ความเครียด"}
            </span>
            <span className="text-xs font-medium">{stress}/5</span>
          </div>
          <Slider value={[stress]} min={1} max={5} step={1} onValueChange={([v]) => setStress(v)} />
        </div>

        {/* Sleep */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Moon className="h-3 w-3" />
              {isEn ? "Sleep quality" : "คุณภาพการนอน"}
            </span>
            <span className="text-xs font-medium">{sleep}/5</span>
          </div>
          <Slider value={[sleep]} min={1} max={5} step={1} onValueChange={([v]) => setSleep(v)} />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full rounded-xl"
          size="sm"
        >
          {saving
            ? (isEn ? "Saving..." : "กำลังบันทึก...")
            : (isEn ? "Check in" : "เช็คอิน")}
        </Button>

        {streak > 0 && (
          <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            {isEn ? `${streak}-day streak! Keep it up!` : `ต่อเนื่อง ${streak} วัน! เก่งมาก!`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
