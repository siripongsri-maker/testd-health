import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SAFE_SPACE_QUIZ } from "@/data/safeSpaceQuiz";
import { format } from "date-fns";
import { Check, X } from "lucide-react";

export interface RespondentDetail {
  id: string;
  created_at: string;
  event_code: string;
  session_id: string | null;
  nickname: string;
  age: number;
  phone: string;
  score: number;
  total: number;
  outcome: string;
  answers: { q: number; category: string; answer: boolean; is_correct: boolean }[] | null;
}

export default function SafeSpaceRespondentDialog({
  row,
  sessionLabel,
  onOpenChange,
}: {
  row: RespondentDetail | null;
  sessionLabel?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const answers = row?.answers || [];
  const learned = answers.filter((a) => a.is_correct);
  const missed = answers.filter((a) => !a.is_correct);
  const rate = row && row.total > 0 ? (row.score / row.total) * 100 : 0;

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>รายละเอียดผู้ตอบควิซ</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">ชื่อเล่น</p>
                <p className="font-medium text-foreground">{row.nickname}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">อายุ</p>
                <p className="font-medium text-foreground">{row.age} ปี</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">เบอร์โทร</p>
                <p className="font-medium text-foreground">{row.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">เวลาที่ตอบ</p>
                <p className="font-medium text-foreground">
                  {format(new Date(row.created_at), "dd MMM yyyy HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">กิจกรรม (event)</p>
                <p className="font-medium text-foreground">{row.event_code}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">เซสชัน</p>
                <p className="font-medium text-foreground">{sessionLabel || "ไม่ได้ผูกเซสชัน"}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={rate >= 70 ? "default" : "destructive"}>
                คะแนน {row.score}/{row.total} ({rate.toFixed(0)}%)
              </Badge>
              <Badge variant="secondary">
                {row.outcome === "to_test_kit" ? "ขอชุดตรวจต่อ" : "จบกิจกรรม"}
              </Badge>
              <Badge variant="outline">ได้ความรู้ {learned.length} ข้อ · ยังพลาด {missed.length} ข้อ</Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">รายการที่ได้ความรู้ / ที่ยังพลาด</p>
              {answers.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีข้อมูลรายข้อ</p>
              ) : (
                SAFE_SPACE_QUIZ.map((item) => {
                  const a = answers.find((x) => x.q === item.q);
                  if (!a) return null;
                  return (
                    <div
                      key={item.q}
                      className="flex items-start gap-2 rounded-lg border p-2.5 text-sm"
                    >
                      {a.is_correct ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="min-w-0">
                        <p className="text-foreground">ข้อ {item.q} : {item.prompt}</p>
                        <p className="text-xs text-muted-foreground">
                          หมวด {item.category} · ตอบว่า {a.answer ? "ใช่" : "ไม่ใช่"} ·{" "}
                          {a.is_correct ? "ได้ความรู้" : "ยังเข้าใจคลาดเคลื่อน"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
