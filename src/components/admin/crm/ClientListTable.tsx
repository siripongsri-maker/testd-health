
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, User, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClientListTableProps {
  onSelectClient: (clientId: string) => void;
}

export default function ClientListTable({ onSelectClient }: ClientListTableProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const { data: branches } = useQuery({
    queryKey: ["crm-branches"],
    queryFn: async () => {
      const { data } = await supabase.from("booking_branches").select("id, name_en, name_th").eq("is_active", true);
      return data || [];
    },
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ["crm-clients", search, branchFilter],
    queryFn: async () => {
      // Get profiles with their most recent appointment info
      let query = supabase
        .from("profiles")
        .select("id, display_name, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (search) {
        query = query.ilike("display_name", `%${search}%`);
      }

      const { data: profiles } = await query;
      if (!profiles?.length) return [];

      const profileIds = profiles.map((p) => p.id);

      // Get latest appointment per client
      const { data: appointments } = await supabase
        .from("appointments")
        .select("user_id, appointment_date, branch_id, status")
        .in("user_id", profileIds)
        .order("appointment_date", { ascending: false });

      // Get pending followups
      const { data: followups } = await supabase
        .from("followup_events")
        .select("user_id, status, due_date")
        .in("user_id", profileIds)
        .eq("status", "pending");

      const appointmentMap = new Map<string, any>();
      appointments?.forEach((a) => {
        if (!appointmentMap.has(a.user_id!)) {
          appointmentMap.set(a.user_id!, a);
        }
      });

      const followupMap = new Map<string, number>();
      followups?.forEach((f) => {
        followupMap.set(f.user_id!, (followupMap.get(f.user_id!) || 0) + 1);
      });

      let results = profiles.map((p) => {
        const lastAppt = appointmentMap.get(p.id);
        return {
          id: p.id,
          name: p.display_name || "Anonymous",
          lastVisit: lastAppt?.appointment_date || null,
          branchId: lastAppt?.branch_id || null,
          lastStatus: lastAppt?.status || null,
          pendingFollowups: followupMap.get(p.id) || 0,
          registeredAt: p.created_at,
        };
      });

      if (branchFilter !== "all") {
        results = results.filter((r) => r.branchId === branchFilter);
      }

      return results;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === "th" ? "ค้นหาผู้รับบริการ..." : "Search clients..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={language === "th" ? "ทุกสาขา" : "All branches"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === "th" ? "ทุกสาขา" : "All branches"}</SelectItem>
            {branches?.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {language === "th" ? b.name_th : b.name_en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === "th" ? "ชื่อ" : "Name"}</TableHead>
                <TableHead>{language === "th" ? "เข้ารับบริการล่าสุด" : "Last Visit"}</TableHead>
                <TableHead>{language === "th" ? "สถานะ" : "Status"}</TableHead>
                <TableHead>{language === "th" ? "ติดตามค้าง" : "Pending Follow-ups"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {language === "th" ? "ไม่พบข้อมูล" : "No clients found"}
                  </TableCell>
                </TableRow>
              )}
              {clients?.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectClient(client.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {client.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.lastVisit ? format(new Date(client.lastVisit), "dd/MM/yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    {client.lastStatus ? (
                      <Badge variant={client.lastStatus === "completed" ? "default" : "secondary"} className="text-xs">
                        {client.lastStatus}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {client.pendingFollowups > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        {client.pendingFollowups}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
