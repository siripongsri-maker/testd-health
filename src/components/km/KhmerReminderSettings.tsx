import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, BellRing, CalendarClock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/hooks/useAnalytics";

type Plan = "prep_daily" | "prep_ondemand" | "pep";

const STORAGE_KEY = "km_reminder_settings_v1";
const REMINDER_TIME_ZONE = "Asia/Bangkok";

type Settings = {
  enabled: boolean;
  plan: Plan;
  times: string[];
  browserNotify: boolean;
};

const DEFAULTS: Record<Plan, string[]> = {
  prep_daily: ["20:00"],
  prep_ondemand: ["20:00", "20:00"],
  pep: ["08:00", "20:00"],
};

const PLAN_LABELS: { key: Plan; title: string; desc: string }[] = [
  { key: "prep_daily", title: "PrEP រៀងរាល់ថ្ងៃ", desc: "លេបថ្នាំ ១ គ្រាប់ ក្នុងម៉ោងតែមួយរាល់ថ្ងៃ" },
  { key: "prep_ondemand", title: "PrEP 2-1-1 (តាមតម្រូវការ)", desc: "រំលឹក ២ ដង ក្នុងមួយថ្ងៃ បន្ទាប់ពីលេប ២ គ្រាប់ដំបូង" },
  { key: "pep", title: "PEP ២៨ ថ្ងៃ", desc: "លេបឱ្យទៀងទាត់ រហូតគ្រប់ ២៨ ថ្ងៃ" },
];

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...JSON.parse(raw) } as Settings;
  } catch {
    /* ignore */
  }
  return { enabled: false, plan: "prep_daily", times: DEFAULTS.prep_daily, browserNotify: false };
}

function getBangkokClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: REMINDER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, Number(value)])) as Record<string, number>;
}

function getNextReminder(times: string[], now: Date) {
  const clock = getBangkokClock(now);
  const currentMinutes = clock.hour * 60 + clock.minute;
  const upcoming = times
    .map((time) => {
      const [hour, minute] = time.split(":").map(Number);
      return { time, minutes: hour * 60 + minute };
    })
    .filter(({ minutes }) => Number.isFinite(minutes))
    .sort((a, b) => a.minutes - b.minutes)
    .find(({ minutes }) => minutes > currentMinutes);

  if (upcoming) return { ...upcoming, dayOffset: 0 };
  const first = times
    .map((time) => {
      const [hour, minute] = time.split(":").map(Number);
      return { time, minutes: hour * 60 + minute };
    })
    .filter(({ minutes }) => Number.isFinite(minutes))
    .sort((a, b) => a.minutes - b.minutes)[0];

  return first ? { ...first, dayOffset: 1 } : null;
}

function formatReminderDate(now: Date, dayOffset: number) {
  const date = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("km-KH", {
    timeZone: REMINDER_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function KhmerReminderSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [saved, setSaved] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep the next reminder current while the settings card is open.
  useEffect(() => {
    const clockRef = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(clockRef);
  }, []);

  // persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // in-app scheduler
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!settings.enabled) return;

    const check = () => {
      const current = new Date();
      const clock = getBangkokClock(current);
      const hhmm = `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;
      settings.times.forEach((t, i) => {
        if (t !== hhmm) return;
        const key = `km_reminded_${new Intl.DateTimeFormat("en-CA", { timeZone: REMINDER_TIME_ZONE }).format(current)}_${i}_${t}`;
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
        if (settings.browserNotify && "Notification" in window && Notification.permission === "granted") {
          new Notification("💊 ដល់ម៉ោងលេបថ្នាំហើយ", {
            body: settings.plan === "pep" ? "PEP៖ សូមលេបឱ្យទៀងទាត់ កុំភ្លេច — testD" : "PrEP៖ សូមលេបថ្នាំតាមកាលវិភាគ — testD",
            icon: "/pwa-192x192.png",
            tag: "km-med-reminder",
          });
        }
      });
    };

    check();
    timerRef.current = setInterval(check, 30_000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [settings]);

  const setPlan = (plan: Plan) => {
    setSettings((s) => ({ ...s, plan, times: DEFAULTS[plan] }));
    void trackEvent("km_reminder_plan", { language: "km", plan });
  };

  const setTime = (idx: number, value: string) =>
    setSettings((s) => ({ ...s, times: s.times.map((t, i) => (i === idx ? value : t)) }));

  const toggleEnabled = async (on: boolean) => {
    setSettings((s) => ({ ...s, enabled: on }));
    void trackEvent("km_reminder_toggle", { language: "km", enabled: on });
  };

  const enableBrowserNotify = async (on: boolean) => {
    if (on && "Notification" in window && Notification.permission !== "granted") {
      const res = await Notification.requestPermission();
      if (res !== "granted") {
        setSettings((s) => ({ ...s, browserNotify: false }));
        return;
      }
    }
    setSettings((s) => ({ ...s, browserNotify: on }));
  };

  const testNotify = async () => {
    void trackEvent("km_reminder_test", { language: "km", plan: settings.plan });
    const body =
      settings.plan === "pep"
        ? "PEP៖ សូមលេបឱ្យទៀងទាត់ កុំភ្លេច — testD"
        : "PrEP៖ សូមលេបថ្នាំតាមកាលវិភាគ — testD";

    if (!("Notification" in window)) {
      setTestMsg("ឧបករណ៍នេះមិនគាំទ្រការជូនដំណឹង — សូមបើកកម្មវិធីនេះពេលដល់ម៉ោង");
      return;
    }
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setTestMsg("មិនទាន់អនុញ្ញាតការជូនដំណឹង — សូមបើកក្នុងការកំណត់កម្មវិធីរុករក");
      return;
    }
    try {
      new Notification("🔔 សាកល្បងការរំលឹក", { body, icon: "/pwa-192x192.png", tag: "km-med-reminder-test" });
      setTestMsg("បានផ្ញើការជូនដំណឹងសាកល្បង ✓");
    } catch {
      setTestMsg("មិនអាចផ្ញើបានទេ — សូមព្យាយាមម្តងទៀត");
    }
    setTimeout(() => setTestMsg(null), 4000);
  };

  const save = () => {
    setSaved(true);
    void trackEvent("km_reminder_save", { language: "km", plan: settings.plan, times: settings.times.join(",") });
    setTimeout(() => setSaved(false), 2000);
  };

  const nextReminder = settings.enabled ? getNextReminder(settings.times, now) : null;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-semibold flex items-center gap-2">
              {settings.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              ការរំលឹក PrEP / PEP
            </h3>
            <p className="text-sm text-muted-foreground">ជ្រើសរើសរូបភាព និងម៉ោងរំលឹក។ ទិន្នន័យរក្សាទុកតែក្នុងទូរស័ព្ទរបស់អ្នក។</p>
          </div>
          <Switch checked={settings.enabled} onCheckedChange={toggleEnabled} aria-label="បើក/បិទ ការរំលឹក" />
        </div>

        {settings.enabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ប្រភេទការរំលឹក</Label>
              <div className="grid gap-2">
                {PLAN_LABELS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlan(p.key)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      settings.plan === p.key ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>ម៉ោងរំលឹក</Label>
              <div className="grid grid-cols-2 gap-2">
                {settings.times.map((t, i) => (
                  <Input key={i} type="time" value={t} onChange={(e) => setTime(i, e.target.value)} aria-label={`ម៉ោងទី ${i + 1}`} />
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3" role="status" aria-live="polite">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-sm font-medium">ការរំលឹកครั้งถัดไป</div>
                {nextReminder ? (
                  <p className="text-sm text-muted-foreground">
                    {formatReminderDate(now, nextReminder.dayOffset)} · <span className="font-semibold text-foreground">{nextReminder.time}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">សូមជ្រើសរើសម៉ោងរំលឹក</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">ម៉ោងប្រទេសកម្ពុជា/ថៃ (UTC+7)</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
              <div className="text-sm">
                <div className="font-medium">ការជូនដំណឹងលើទូរស័ព្ទ</div>
                <div className="text-xs text-muted-foreground">បើកដើម្បីទទួលសារជូនដំណឹង ពេលបើកកម្មវិធីនេះ</div>
              </div>
              <Switch checked={settings.browserNotify} onCheckedChange={enableBrowserNotify} aria-label="ការជូនដំណឹង" />
            </div>

            <Button className="w-full" onClick={save}>
              {saved ? (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" /> បានរក្សាទុក
                </span>
              ) : (
                "រក្សាទុកការកំណត់"
              )}
            </Button>

            <Button variant="outline" className="w-full" onClick={testNotify}>
              <BellRing className="mr-2 h-4 w-4" /> សាកល្បងការជូនដំណឹង (ทดสอบการแจ้งเตือน)
            </Button>
            {testMsg && (
              <p className="text-xs text-center text-muted-foreground" role="status">{testMsg}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
