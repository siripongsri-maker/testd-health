import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarDays, HeartHandshake, ClipboardList, Banknote, Brain, History } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useSearchParams } from "react-router-dom";
import AdminCounselorSupportContent from "./AdminCounselorSupportContent";
import AdminDailyBranchBriefContent from "./AdminDailyBranchBriefContent";
import AdminConcernBriefContent from "./AdminConcernBriefContent";
import AdminCounselingPayoutsContent from "./AdminCounselingPayoutsContent";
import AdminAuditLogContent from "./AdminAuditLogContent";

/**
 * Daily Ops workspace — merges the four overlapping counseling menus
 * (queue, branch brief, concern brief, travel allowance) into one day-centric
 * screen. The selected day + branch are shared across every sub-tab so all the
 * numbers describe exactly the same slice of work.
 */

interface BranchInfo { id: string; name_th: string; name_en: string }

const bangkokToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

const shiftDay = (day: string, delta: number) => {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return format(d, "yyyy-MM-dd");
};

type SubTab = "queue" | "branch" | "concern" | "payouts" | "audit";

export default function AdminDailyOpsContent() {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);
  const { isAdmin } = useAdminRole();
  const [searchParams, setSearchParams] = useSearchParams();

  const [day, setDay] = useState(() => searchParams.get("day") || bangkokToday());
  const [branchFilter, setBranchFilter] = useState(() => searchParams.get("branch") || "all");
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [sub, setSub] = useState<SubTab>(() => (searchParams.get("sub") as SubTab) || "queue");
  // Case handed over from the queue overview to the work page (branch brief)
  const [focusSurveyId, setFocusSurveyId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("booking_branches")
      .select("id, name_th, name_en")
      .eq("is_active", true)
      .order("name_th")
      .then(({ data }) => setBranches((data as BranchInfo[]) || []));
  }, []);

  // Keep the URL shareable so staff can hand a specific day/branch view to each other.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "daily-ops");
    next.set("day", day);
    next.set("branch", branchFilter);
    next.set("sub", sub);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, branchFilter, sub]);

  const isToday = day === bangkokToday();
  const branchLabel = useMemo(() => {
    if (branchFilter === "all") return tx("ทุกสาขา", "All branches");
    const b = branches.find((x) => x.id === branchFilter);
    return b ? (language === "th" ? b.name_th : b.name_en) : branchFilter;
  }, [branchFilter, branches, language]);

  const tabs: { key: SubTab; icon: typeof HeartHandshake; th: string; en: string; adminOnly?: boolean }[] = [
    { key: "queue", icon: HeartHandshake, th: "คิวรวม (ดูอย่างเดียว)", en: "Queue overview" },
    { key: "branch", icon: ClipboardList, th: "สรุปรายสาขา (บันทึกผล)", en: "Branch brief (work page)" },
    { key: "concern", icon: Brain, th: "เรื่องที่กังวล", en: "Concerns" },
    { key: "payouts", icon: Banknote, th: "ค่าเดินทาง", en: "Travel allowance", adminOnly: true },
    { key: "audit", icon: History, th: "บันทึกกิจกรรม", en: "Audit log", adminOnly: true },
  ];
  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-teal-600" />
          {tx("ศูนย์งานรายวัน (ให้คำปรึกษา)", "Daily Ops — Counseling")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tx("รวมคิวให้คำปรึกษา สรุปรายสาขา เรื่องที่กังวล และค่าเดินทาง ไว้ในวันเดียวกัน",
              "Queue, branch brief, concerns and travel allowance — all for the same day.")}
        </p>
      </div>

      {/* Shared day + branch context for every sub-tab */}
      <Card className="p-4 no-print">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{tx("วันที่ทำงาน", "Working day")}</Label>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setDay(shiftDay(day, -1))} aria-label={tx("วันก่อนหน้า", "Previous day")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-44" />
              <Button variant="outline" size="icon" onClick={() => setDay(shiftDay(day, 1))} aria-label={tx("วันถัดไป", "Next day")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant={isToday ? "default" : "outline"} size="sm" onClick={() => setDay(bangkokToday())}>
                {tx("วันนี้", "Today")}
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{tx("สาขา", "Branch")}</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tx("ทุกสาขา", "All branches")}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{language === "th" ? b.name_th : b.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="mb-1">
            {day} · {branchLabel}
          </Badge>
        </div>
      </Card>

      <Tabs value={sub} onValueChange={(v) => setSub(v as SubTab)}>
        <TabsList className="flex flex-wrap h-auto">
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
              <t.icon className="h-4 w-4" />
              {tx(t.th, t.en)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <AdminCounselorSupportContent
            branchFilter={branchFilter}
            onBranchChange={setBranchFilter}
            viewOnly
            onOpenWorkbench={(surveyId) => { setFocusSurveyId(surveyId); setSub("branch"); }}
          />
        </TabsContent>
        <TabsContent value="branch" className="mt-4">
          <AdminDailyBranchBriefContent
            day={day} onDayChange={setDay}
            branchFilter={branchFilter} onBranchChange={setBranchFilter}
            focusSurveyId={focusSurveyId}
            hideToolbar
          />
        </TabsContent>
        <TabsContent value="concern" className="mt-4">
          <AdminConcernBriefContent
            day={day} onDayChange={setDay}
            branchFilter={branchFilter} onBranchChange={setBranchFilter}
            hideToolbar
          />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="payouts" className="mt-4">
            <AdminCounselingPayoutsContent dateFrom={day} dateTo={day} />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="audit" className="mt-4">
            <AdminAuditLogContent day={day} hideToolbar />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
