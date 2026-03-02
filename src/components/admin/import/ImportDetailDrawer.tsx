import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ImportRow {
  id: string;
  row_number: number;
  outcome: string;
  error_message: string | null;
  external_ref: string | null;
}

interface BatchDetail {
  id: string;
  branch: string;
  uploaded_by: string;
  uploaded_at: string;
  filename: string;
  source_type: string;
  total_rows: number;
  inserted_rows: number;
  duplicate_rows: number;
  error_rows: number;
  skipped_rows: number;
  status: string;
  is_dry_run: boolean;
  notes: string | null;
}

interface Props {
  batchId: string | null;
  onClose: () => void;
}

export default function ImportDetailDrawer({ batchId, onClose }: Props) {
  const { language } = useLanguage();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowPage, setRowPage] = useState(0);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const rowPageSize = 50;

  useEffect(() => {
    if (!batchId) { setBatch(null); setRows([]); return; }
    setRowPage(0);
    loadBatch(batchId);
  }, [batchId]);

  useEffect(() => {
    if (batchId) loadRows(batchId, rowPage);
  }, [rowPage, batchId]);

  const loadBatch = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("selftest_import_batches")
      .select("*")
      .eq("id", id)
      .single();
    if (error) { toast.error(error.message); setLoading(false); return; }
    setBatch(data as any);
    await loadRows(id, 0);
    setLoading(false);
  };

  const loadRows = async (id: string, pg: number) => {
    const { data, count, error } = await supabase
      .from("selftest_import_rows")
      .select("*", { count: "exact" })
      .eq("batch_id", id)
      .order("row_number", { ascending: true })
      .range(pg * rowPageSize, (pg + 1) * rowPageSize - 1);
    if (!error) {
      setRows((data as any[]) || []);
      setTotalRowCount(count || 0);
    }
  };

  const outcomeBadge = (outcome: string) => {
    if (outcome === "inserted" || outcome === "will_insert") return <Badge className="bg-green-500/10 text-green-700 text-xs">Inserted</Badge>;
    if (outcome === "updated" || outcome === "will_update") return <Badge className="bg-blue-500/10 text-blue-700 text-xs">Updated</Badge>;
    if (outcome === "skipped") return <Badge className="bg-yellow-500/10 text-yellow-700 text-xs">Skipped</Badge>;
    if (outcome === "error") return <Badge variant="destructive" className="text-xs">Error</Badge>;
    return <Badge variant="outline" className="text-xs">{outcome}</Badge>;
  };

  const exportErrorCSV = async () => {
    if (!batch) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: errorRows } = await supabase
      .from("selftest_import_rows")
      .select("*")
      .eq("batch_id", batch.id)
      .in("outcome", ["error", "skipped"])
      .order("row_number");

    if (!errorRows?.length) { toast.info("No error rows"); return; }

    await supabase.from("export_audit_logs").insert({
      user_id: user.id, export_type: "error_rows", batch_id: batch.id, row_count: errorRows.length, is_full_export: false,
    });

    const csv = "Row,Outcome,Error Message,Ref\n" + errorRows.map((r: any) =>
      `${r.row_number},"${r.outcome}","${(r.error_message || '').replace(/"/g, '""')}","${r.external_ref || ''}"`
    ).join("\n");

    downloadCSV(csv, `errors-${batch.filename}-${batch.id.slice(0, 8)}.csv`);
  };

  const exportBatchCSV = async () => {
    if (!batch) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user is super_admin for full export
    const { data: staffProfile } = await supabase
      .from("staff_profiles")
      .select("staff_role")
      .eq("user_id", user.id)
      .single();

    const isSuperAdmin = staffProfile?.staff_role === "super_admin";

    // Fetch all rows for this batch
    const allRows: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await supabase
        .from("selftest_import_rows")
        .select("*")
        .eq("batch_id", batch.id)
        .order("row_number")
        .range(from, from + 999);
      if (!data?.length) break;
      allRows.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }

    await supabase.from("export_audit_logs").insert({
      user_id: user.id, export_type: "batch_data", batch_id: batch.id, row_count: allRows.length, is_full_export: isSuperAdmin,
    });

    const csv = "Row,Outcome,Error,Ref\n" + allRows.map((r: any) => {
      const ref = isSuperAdmin ? (r.external_ref || '') : (r.external_ref ? `****${r.external_ref.slice(-4)}` : '');
      return `${r.row_number},"${r.outcome}","${(r.error_message || '').replace(/"/g, '""')}","${ref}"`;
    }).join("\n");

    downloadCSV(csv, `batch-${batch.filename}-${batch.id.slice(0, 8)}.csv`);
    toast.success(isSuperAdmin
      ? (language === "th" ? "ส่งออกแบบเต็ม (Super Admin)" : "Full export (Super Admin)")
      : (language === "th" ? "ส่งออกแบบ masked" : "Masked export")
    );
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const totalRowPages = Math.ceil(totalRowCount / rowPageSize);

  return (
    <Drawer open={!!batchId} onOpenChange={open => { if (!open) onClose(); }}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {language === "th" ? "รายละเอียดการนำเข้า" : "Import Details"}
          </DrawerTitle>
          {batch && (
            <DrawerDescription>
              {batch.filename} — {format(new Date(batch.uploaded_at), "dd/MM/yyyy HH:mm")} — {batch.branch}
            </DrawerDescription>
          )}
        </DrawerHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : batch ? (
          <div className="px-4 space-y-4 overflow-auto">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <div className="text-lg font-bold">{batch.total_rows}</div>
                <div className="text-xs text-muted-foreground">{language === "th" ? "ทั้งหมด" : "Total"}</div>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10 text-center">
                <div className="text-lg font-bold text-green-600">{batch.inserted_rows}</div>
                <div className="text-xs text-muted-foreground">{language === "th" ? "เพิ่มใหม่" : "Inserted"}</div>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-center">
                <div className="text-lg font-bold text-blue-600">{batch.duplicate_rows}</div>
                <div className="text-xs text-muted-foreground">{language === "th" ? "อัปเดต" : "Updated"}</div>
              </div>
              <div className="p-2 rounded-lg bg-yellow-500/10 text-center">
                <div className="text-lg font-bold text-yellow-600">{batch.skipped_rows}</div>
                <div className="text-xs text-muted-foreground">{language === "th" ? "ข้าม" : "Skipped"}</div>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10 text-center">
                <div className="text-lg font-bold text-red-600">{batch.error_rows}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={exportErrorCSV} disabled={batch.error_rows === 0 && batch.skipped_rows === 0}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {language === "th" ? "ดาวน์โหลด Error CSV" : "Error Rows CSV"}
              </Button>
              <Button variant="outline" size="sm" onClick={exportBatchCSV}>
                <Download className="h-3 w-3 mr-1" />
                {language === "th" ? "ส่งออกข้อมูล Batch" : "Export Batch CSV"}
              </Button>
            </div>

            {/* Row results table */}
            <ScrollArea className="h-[300px] rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[60px]">Row</TableHead>
                    <TableHead className="text-xs w-[90px]">{language === "th" ? "ผลลัพธ์" : "Outcome"}</TableHead>
                    <TableHead className="text-xs">{language === "th" ? "ข้อผิดพลาด" : "Error"}</TableHead>
                    <TableHead className="text-xs w-[100px]">Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-mono">{r.row_number}</TableCell>
                      <TableCell>{outcomeBadge(r.outcome)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={r.error_message || ""}>
                        {r.error_message || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.external_ref ? `****${r.external_ref.slice(-4)}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {totalRowPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{rowPage + 1} / {totalRowPages}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={rowPage === 0} onClick={() => setRowPage(p => p - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={rowPage >= totalRowPages - 1} onClick={() => setRowPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">{language === "th" ? "ปิด" : "Close"}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
