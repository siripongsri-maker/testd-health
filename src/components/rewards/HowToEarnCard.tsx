import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, BookOpen, ClipboardList, MessageSquare, Stethoscope, Zap } from "lucide-react";

interface Props {
  language: string;
}

const EARN_SOURCES = [
  {
    icon: Stethoscope,
    points: 1000,
    en: 'Complete a clinic visit',
    th: 'เข้ารับบริการที่คลินิก',
  },
  {
    icon: CalendarCheck,
    points: 500,
    en: 'Check in / Check out',
    th: 'เช็คอิน / เช็คเอาท์',
  },
  {
    icon: ClipboardList,
    points: 200,
    en: 'Complete a survey',
    th: 'ทำแบบสำรวจ',
  },
  {
    icon: BookOpen,
    points: 100,
    en: 'Read an article',
    th: 'อ่านบทความ',
  },
  {
    icon: MessageSquare,
    points: 50,
    en: 'Give feedback',
    th: 'ให้ฟีดแบ็ก',
  },
];

export function HowToEarnCard({ language }: Props) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          {language === 'th' ? 'วิธีสะสมคะแนน' : 'How to Earn Points'}
        </h3>
        <div className="space-y-2">
          {EARN_SOURCES.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="flex-1 text-sm">{language === 'th' ? s.th : s.en}</p>
              <span className="text-xs font-bold text-primary tabular-nums">+{s.points}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
