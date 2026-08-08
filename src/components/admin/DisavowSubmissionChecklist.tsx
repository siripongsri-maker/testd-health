import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, ExternalLink, RotateCcw } from "lucide-react";

const STORAGE_KEY = "disavow_submission_checklist_v1";
const GSC_DISAVOW_URL = "https://search.google.com/search-console/disavow-links";

interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
  link?: { href: string; label: string };
}

const ITEMS: ChecklistItem[] = [
  {
    id: "download",
    label: "ดาวน์โหลดไฟล์ disavow.txt ฉบับล่าสุด",
    hint: "ไฟล์ต้องรวมทุกโดเมนที่ต้องการปฏิเสธ เพราะไฟล์ใหม่จะแทนที่ไฟล์เดิมทั้งหมด",
  },
  {
    id: "review",
    label: "ตรวจไฟล์อีกครั้งว่าไม่มีลิงก์ดีปนอยู่",
    hint: "ถ้าไม่แน่ใจกับโดเมนไหน ให้กลับไปเลือก “เก็บไว้” ก่อน",
  },
  {
    id: "open_tool",
    label: "เปิด Google Disavow Links Tool",
    link: { href: GSC_DISAVOW_URL, label: "เปิดเครื่องมือ" },
  },
  {
    id: "property",
    label: "เลือก property ให้ถูกต้อง (testd.website)",
    hint: "ถ้ามีทั้งแบบ Domain และ URL-prefix ให้เลือกอันที่ใช้ดูรายงานลิงก์เป็นหลัก",
  },
  {
    id: "upload",
    label: "อัปโหลดไฟล์ แล้วกดยืนยัน",
    hint: "Google จะแสดงจำนวนบรรทัดที่อ่านได้ ให้เทียบกับจำนวนโดเมนในไฟล์",
  },
  {
    id: "record",
    label: "บันทึกวันที่ส่งด้านล่าง เพื่อให้ระบบตั้งเตือนรอบตรวจผล",
  },
  {
    id: "log",
    label: "ทำเครื่องหมาย “ส่ง Google แล้ว” ในหน้าประวัติ (ขั้นตอนที่ 5)",
  },
];

const REVIEW_POINTS = [
  { days: 14, title: "ตรวจรอบแรก", desc: "เช็กว่า Google รับไฟล์แล้ว และดูจำนวนโดเมนอ้างอิงใน Search Console" },
  { days: 42, title: "ตรวจรอบกลาง (6 สัปดาห์)", desc: "เปรียบเทียบลิงก์ใหม่/ลิงก์ที่หายไป และแนวโน้มคลิกจาก Search Console" },
  { days: 90, title: "ตรวจรอบสรุป (3 เดือน)", desc: "ประเมินผลรวม และรวบรวมลิงก์สแปมชุดใหม่ถ้ามี" },
];

interface StoredState {
  checked: string[];
  submittedAt: string | null;
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { checked: [], submittedAt: null };
    const parsed = JSON.parse(raw);
    return {
      checked: Array.isArray(parsed.checked) ? parsed.checked : [],
      submittedAt: typeof parsed.submittedAt === "string" ? parsed.submittedAt : null,
    };
  } catch {
    return { checked: [], submittedAt: null };
  }
}

function thaiDate(d: Date) {
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export default function DisavowSubmissionChecklist({
  disavowCount,
  onDownload,
  onOpenHistory,
}: {
  disavowCount: number;
  onDownload: () => void;
  onOpenHistory: () => void;
}) {
  const [state, setState] = useState<StoredState>(() => loadState());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const checkedSet = useMemo(() => new Set(state.checked), [state.checked]);
  const progress = Math.round((checkedSet.size / ITEMS.length) * 100);

  const toggle = (id: string) =>
    setState((prev) => {
      const next = new Set(prev.checked);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, checked: [...next] };
    });

  const submittedDate = state.submittedAt ? new Date(state.submittedAt) : null;

  const reminders = useMemo(() => {
    if (!submittedDate) return [];
    const today = startOfDay(new Date());
    return REVIEW_POINTS.map((p) => {
      const due = startOfDay(new Date(submittedDate.getTime() + p.days * 86400000));
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
      return { ...p, due, diff };
    });
  }, [submittedDate]);

  const nextReminder = reminders.find((r) => r.diff >= 0);

  const reset = () => {
    setState({ checked: [], submittedAt: null });
    toast.success("ล้างเช็คลิสต์แล้ว");
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-[15px]">เช็คลิสต์ส่งไฟล์เข้า Google</CardTitle>
            <Badge variant="outline" className="text-[11px]">
              {checkedSet.size}/{ITEMS.length} ขั้นตอน
            </Badge>
          </div>
          <Progress value={progress} className="h-1.5 mt-2" />
        </CardHeader>
        <CardContent className="space-y-2.5">
          {ITEMS.map((item) => {
            const done = checkedSet.has(item.id);
            return (
              <div
                key={item.id}
                className={`flex gap-2.5 rounded-xl border p-2.5 transition-colors ${
                  done ? "bg-emerald-500/5 border-emerald-500/30" : ""
                }`}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={done}
                  onCheckedChange={() => toggle(item.id)}
                  aria-label={item.label}
                />
                <div className="min-w-0 space-y-1">
                  <p
                    className={`text-[13px] font-medium leading-snug ${
                      done ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {item.label}
                  </p>
                  {item.hint && (
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{item.hint}</p>
                  )}
                  {item.id === "download" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[12px]"
                      onClick={onDownload}
                      disabled={disavowCount === 0}
                    >
                      ดาวน์โหลด .txt ({disavowCount})
                    </Button>
                  )}
                  {item.link && (
                    <a
                      href={item.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-primary underline"
                    >
                      {item.link.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {item.id === "log" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[12px]"
                      onClick={onOpenHistory}
                    >
                      ไปหน้าประวัติ
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pt-1">
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              เริ่มเช็คลิสต์ใหม่
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px] flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            รอบตรวจผลหลังส่งไฟล์
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label
                htmlFor="disavow-submitted-at"
                className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider"
              >
                วันที่ส่งไฟล์เข้า Google
              </label>
              <Input
                id="disavow-submitted-at"
                type="date"
                className="w-44"
                value={state.submittedAt ?? ""}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, submittedAt: e.target.value || null }))
                }
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  submittedAt: new Date().toISOString().slice(0, 10),
                }))
              }
            >
              ส่งวันนี้
            </Button>
          </div>

          {!submittedDate ? (
            <p className="text-[12px] text-muted-foreground">
              ใส่วันที่ส่งไฟล์ แล้วระบบจะคำนวณวันที่ควรกลับมาตรวจผล (2 สัปดาห์ / 6 สัปดาห์ / 3 เดือน)
            </p>
          ) : (
            <div className="space-y-2">
              {nextReminder && (
                <div className="rounded-xl bg-primary/10 text-primary p-2.5 text-[12px]">
                  รอบตรวจถัดไป: <span className="font-semibold">{nextReminder.title}</span> —{" "}
                  {nextReminder.diff === 0
                    ? "ครบกำหนดวันนี้"
                    : `อีก ${nextReminder.diff} วัน (${thaiDate(nextReminder.due)})`}
                </div>
              )}
              {reminders.map((r) => {
                const overdue = r.diff < 0;
                return (
                  <div
                    key={r.days}
                    className={`flex flex-wrap items-start justify-between gap-2 rounded-xl border p-2.5 ${
                      overdue ? "bg-amber-500/5 border-amber-500/30" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{r.title}</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{r.desc}</p>
                    </div>
                    <Badge
                      className={`text-[11px] border-0 ${
                        overdue
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {overdue ? (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          ถึงรอบแล้ว · {thaiDate(r.due)}
                        </span>
                      ) : (
                        thaiDate(r.due)
                      )}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
