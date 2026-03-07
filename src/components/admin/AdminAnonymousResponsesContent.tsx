import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Download, UserCheck, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportToCsv, formatCsvDate, type CsvColumn } from "@/lib/adminCsvExport";

interface InviteResponse {
  id: string;
  invite_id: string;
  visitor_session_id: string;
  response_state: string;
  created_at: string;
  updated_at: string;
}

export default function AdminAnonymousResponsesContent() {
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [responses, setResponses] = useState<InviteResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('partner_invite_responses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setResponses(data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const csvCols: CsvColumn<InviteResponse>[] = [
    { key: 'invite_id', header: 'Invite ID' },
    { key: 'response_state', header: 'Response State' },
    { key: 'visitor_session_id', header: 'Visitor Session' },
    { key: 'created_at', header: 'Created', format: r => formatCsvDate(r.created_at) },
    { key: 'updated_at', header: 'Updated', format: r => formatCsvDate(r.updated_at) },
  ];

  const stateColor = (s: string) =>
    s === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
    s === 'booked' ? 'bg-blue-500/10 text-blue-600' :
    s === 'accepted' ? 'bg-sky-500/10 text-sky-600' :
    s === 'plans_to_test' ? 'bg-amber-500/10 text-amber-600' :
    'bg-muted text-muted-foreground';

  const stateCounts = {
    accepted: responses.filter(r => r.response_state === 'accepted').length,
    plans: responses.filter(r => r.response_state === 'plans_to_test').length,
    booked: responses.filter(r => r.response_state === 'booked').length,
    completed: responses.filter(r => r.response_state === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{isTh ? 'การตอบรับแบบไม่ระบุตัว' : 'Anonymous Responses'}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetch} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="sm" onClick={() => exportToCsv(responses, csvCols, 'anonymous_responses')} className="gap-1"><Download className="h-3.5 w-3.5" /> CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isTh ? 'ตอบรับ' : 'Accepted', value: stateCounts.accepted, color: 'text-sky-600' },
          { label: isTh ? 'วางแผนตรวจ' : 'Plans', value: stateCounts.plans, color: 'text-amber-600' },
          { label: isTh ? 'จองแล้ว' : 'Booked', value: stateCounts.booked, color: 'text-blue-600' },
          { label: isTh ? 'ตรวจแล้ว' : 'Completed', value: stateCounts.completed, color: 'text-emerald-600' },
        ].map((s, i) => (
          <Card key={i} className="border border-border/50"><CardContent className="p-3 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="border border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : responses.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">{isTh ? 'ไม่มีข้อมูล' : 'No responses'}</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isTh ? 'วันที่' : 'Date'}</TableHead>
                    <TableHead>{isTh ? 'สถานะ' : 'State'}</TableHead>
                    <TableHead>Invite ID</TableHead>
                    <TableHead>Session</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(r.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", stateColor(r.response_state))}>{r.response_state}</span></TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{r.invite_id.slice(0, 8)}...</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{r.visitor_session_id.slice(0, 8)}...</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
