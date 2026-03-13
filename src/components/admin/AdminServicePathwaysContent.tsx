import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, ClipboardList, HeartHandshake, Phone, Calendar,
  AlertTriangle, CheckCircle2, Clock, Brain, Building2, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  started: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  missed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function AdminServicePathwaysContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const [activeTab, setActiveTab] = useState("requests");
  const [statusFilter, setStatusFilter] = useState("all");

  // Service events requiring attention (counseling/clinic/mental health requests)
  const { data: serviceRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ["admin-service-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("service_events")
        .select("*, booking_branches(name_en, name_th)")
        .order("service_date", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("service_status", statusFilter);
      }

      // Filter for HR clinical events
      query = query.or("counseling_needed.eq.true,clinic_referral_needed.eq.true,mental_health_referral_needed.eq.true");

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Service pathways
  const { data: pathways, isLoading: loadingPathways } = useQuery({
    queryKey: ["admin-service-pathways"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_pathways")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Follow-ups
  const { data: followups, isLoading: loadingFollowups } = useQuery({
    queryKey: ["admin-followups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("followup_events")
        .select("*")
        .eq("status", "pending")
        .order("scheduled_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const requests = serviceRequests || [];
    return {
      total: requests.length,
      pending: requests.filter((r: any) => r.service_status === "pending").length,
      counseling: requests.filter((r: any) => r.counseling_needed).length,
      clinic: requests.filter((r: any) => r.clinic_referral_needed).length,
      mental: requests.filter((r: any) => r.mental_health_referral_needed).length,
      followupsDue: (followups || []).length,
    };
  }, [serviceRequests, followups]);

  const isLoading = loadingRequests || loadingPathways || loadingFollowups;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{isTh ? "ระบบบริการ HR Clinical" : "HR Clinical Service System"}</h2>
        <p className="text-muted-foreground text-sm">{isTh ? "จัดการคำขอบริการ ติดตามผล และ pathway ของผู้ใช้บริการ" : "Manage service requests, follow-ups, and user pathways"}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">{isTh ? "คำขอทั้งหมด" : "Total Requests"}</p><p className="text-2xl font-bold text-foreground">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">{isTh ? "รอดำเนินการ" : "Pending"}</p><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">{isTh ? "คำปรึกษา" : "Counseling"}</p><p className="text-2xl font-bold text-rose-600">{stats.counseling}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">{isTh ? "ส่งต่อคลินิก" : "Clinic Ref"}</p><p className="text-2xl font-bold text-teal-600">{stats.clinic}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">{isTh ? "สุขภาพจิต" : "Mental Health"}</p><p className="text-2xl font-bold text-indigo-600">{stats.mental}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4"><p className="text-xs text-muted-foreground">{isTh ? "ติดตามผลค้าง" : "Follow-ups Due"}</p><p className="text-2xl font-bold text-orange-600">{stats.followupsDue}</p></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            {isTh ? "คำขอบริการ" : "Service Requests"}
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {isTh ? "ติดตามผล" : "Follow-ups"}
            {stats.followupsDue > 0 && <Badge variant="destructive" className="ml-1 h-5 text-xs">{stats.followupsDue}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pathways" className="gap-1.5">
            <HeartHandshake className="h-3.5 w-3.5" />
            {isTh ? "Pathways" : "Pathways"}
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isTh ? "ทั้งหมด" : "All"}</SelectItem>
                <SelectItem value="pending">{isTh ? "รอดำเนินการ" : "Pending"}</SelectItem>
                <SelectItem value="in_progress">{isTh ? "กำลังดำเนินการ" : "In Progress"}</SelectItem>
                <SelectItem value="completed">{isTh ? "เสร็จสิ้น" : "Completed"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(!serviceRequests || serviceRequests.length === 0) ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">{isTh ? "ไม่พบคำขอบริการ" : "No service requests found"}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "วันที่" : "Date"}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ประเภท" : "Type"}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "บริการที่ต้องการ" : "Services Needed"}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ความเร่งด่วน" : "Urgency"}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "สถานะ" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceRequests.map((req: any) => (
                        <tr key={req.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">{format(new Date(req.service_date), "dd MMM yyyy")}</td>
                          <td className="p-3 capitalize">{req.event_type?.replace(/_/g, " ")}</td>
                          <td className="p-3">
                            <div className="flex gap-1 flex-wrap">
                              {req.counseling_needed && <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">{isTh ? "คำปรึกษา" : "Counseling"}</Badge>}
                              {req.clinic_referral_needed && <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">{isTh ? "คลินิก" : "Clinic"}</Badge>}
                              {req.mental_health_referral_needed && <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">{isTh ? "สุขภาพจิต" : "Mental Health"}</Badge>}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary" className={req.urgency_level === "urgent" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}>
                              {req.urgency_level || "normal"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="secondary" className={STATUS_COLORS[req.service_status] || STATUS_COLORS.pending}>
                              {req.service_status || "pending"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="space-y-4">
          {(!followups || followups.length === 0) ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">{isTh ? "ไม่มีการติดตามผลค้าง" : "No pending follow-ups"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {followups.map((f: any) => {
                const isOverdue = new Date(f.scheduled_at) < new Date();
                return (
                  <Card key={f.id} className={isOverdue ? "border-red-300 dark:border-red-800" : "border-border/60"}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue ? "bg-red-100 text-red-600 dark:bg-red-900/40" : "bg-amber-100 text-amber-600 dark:bg-amber-900/40"}`}>
                        {isOverdue ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">
                          {f.followup_type?.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isTh ? "กำหนด:" : "Due:"} {format(new Date(f.scheduled_at), "dd MMM yyyy")}
                          {isOverdue && <span className="ml-2 text-red-600 font-medium">{isTh ? "(เลยกำหนด)" : "(Overdue)"}</span>}
                        </p>
                      </div>
                      <Badge variant="secondary" className={isOverdue ? STATUS_COLORS.overdue : STATUS_COLORS.pending}>
                        {f.status}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Pathways Tab */}
        <TabsContent value="pathways" className="space-y-4">
          {(!pathways || pathways.length === 0) ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <HeartHandshake className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">{isTh ? "ยังไม่มี service pathway" : "No service pathways yet"}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "วันที่" : "Date"}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "จุดเข้า" : "Entry"}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "เหตุผล" : "Reasons"}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ประเมิน" : "Screened"}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ระดับ" : "Distress"}</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "สถานะ" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pathways.map((p: any) => (
                        <tr key={p.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">{format(new Date(p.created_at), "dd MMM yyyy")}</td>
                          <td className="p-3 capitalize">{p.entry_point?.replace(/_/g, " ")}</td>
                          <td className="p-3">
                            <div className="flex gap-1 flex-wrap">
                              {(p.reason_for_visit || []).slice(0, 3).map((r: string) => (
                                <Badge key={r} variant="secondary" className="text-xs">{r.replace(/_/g, " ")}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">{p.screening_completed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : "—"}</td>
                          <td className="p-3">{p.screening_distress_level || "—"}</td>
                          <td className="p-3">
                            <Badge variant="secondary" className={STATUS_COLORS[p.service_status] || STATUS_COLORS.started}>
                              {p.service_status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
