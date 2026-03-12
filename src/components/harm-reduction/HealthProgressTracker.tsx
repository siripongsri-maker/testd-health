import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, ClipboardCheck, Shield, HeartHandshake, Bell } from "lucide-react";

interface Props {
  userId?: string;
}

const PROGRESS_KEY = "hr_progress";

interface ProgressData {
  screenings: number;
  plans: number;
  counseling: number;
  nudgesFollowed: number;
}

function getProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { screenings: 0, plans: 0, counseling: 0, nudgesFollowed: 0 };
}

export function trackProgress(key: keyof ProgressData) {
  const data = getProgress();
  data[key] = (data[key] || 0) + 1;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

export function HealthProgressTracker({ userId }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const progress = getProgress();

  const total = progress.screenings + progress.plans + progress.counseling + progress.nudgesFollowed;
  const maxScore = 20;
  const score = Math.min(Math.round((total / maxScore) * 100), 100);

  const items = [
    { icon: ClipboardCheck, label: isEn ? "Screenings" : "การประเมิน", value: progress.screenings, color: "text-amber-500" },
    { icon: Shield, label: isEn ? "Safety Plans" : "แผนความปลอดภัย", value: progress.plans, color: "text-emerald-500" },
    { icon: HeartHandshake, label: isEn ? "Counseling" : "ปรึกษา", value: progress.counseling, color: "text-rose-500" },
    { icon: Bell, label: isEn ? "Nudges Followed" : "ทำตามแจ้งเตือน", value: progress.nudgesFollowed, color: "text-blue-500" },
  ];

  const getMessage = () => {
    if (score >= 80) return isEn ? "Amazing! You're taking great care of yourself!" : "เยี่ยมมาก! คุณดูแลตัวเองได้ดีมาก!";
    if (score >= 50) return isEn ? "Good progress! Keep going!" : "ก้าวหน้าดี! ทำต่อไป!";
    if (score >= 20) return isEn ? "You've started your journey!" : "คุณเริ่มต้นแล้ว!";
    return isEn ? "Start your health journey today" : "เริ่มดูแลสุขภาพวันนี้";
  };

  return (
    <Card className="border border-border/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {isEn ? "Health Progress" : "ความก้าวหน้าสุขภาพ"}
          </h3>
          <span className="ml-auto text-xs font-bold text-primary">{score}%</span>
        </div>

        <Progress value={score} className="h-2" />

        <p className="text-[11px] text-muted-foreground text-center">{getMessage()}</p>

        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                <div>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-xs font-semibold text-foreground">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
