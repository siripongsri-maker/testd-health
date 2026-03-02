import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, History, Filter, Loader2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ImportDetailDrawer from "./ImportDetailDrawer";

interface ImportBatch {
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

export default function ImportHistoryTab() {
  const { language } = useLanguage();
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Filters
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("selftest_import_batches")
        .select("*", { count: "exact" })
        .order("uploaded_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filterBranch !== "all") query = query.eq("branch", filterBranch);
      if (filterStatus !== "all") query = query.eq("status", filterStatus);
      if (filterDateFrom) query = query.gte("uploaded_at", filterDateFrom);
      if (filterDateTo) query = query.lte("uploaded_at", filterDateTo + "T23:59:59");

      const { data, count, error } = await query;
      if (error) throw error;
      setBatches((data as any[]) || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, [page, filterBranch, filterStatus, filterDateFrom, filterDateTo]);

  // Listen for new imports
  useEffect(() => {
    const handler = () => { setPage(0); fetchBatches(); };
    window.addEventListener("selftest-import-complete", handler);
    return () => window.removeEventListener("selftest-import-complete", handler);
  }, []);

  const statusBadge = (status: string, isDryRun: boolean) => {
    if (isDryRun) return <Badge variant="outline" className="text-xs">Dry Run</Badge>;
    if (status === "success") return <Badge className="bg-green-500/10 text-green-700 text-xs border-green-500/20">Success</Badge>;
    if (status === "partial") return <Badge className="bg-yellow-500/10 text-yellow-700 text-xs border-yellow-500/20">Partial</Badge>;
    return <Badge variant="destructive" className="text-xs">Failed</Badge>;
  };

  const exportHistoryCSV = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const csvRows = ["Uploaded At,Branch,Filename,Source Type,Total,Inserted,Duplicates,Errors,Skipped,Status,Dry Run"];
    for (const b of batches) {
      csvRows.push(`"${b.uploaded_at}","${b.branch}","${b.filename}","${b.source_type}",${b.total_rows},${b.inserted_rows},${b.duplicate_rows},${b.error_rows},${b.skipped_rows},"${b.status}",${b.is_dry_run}`);
    }

    // Log export
    await supabase.from("export_audit_logs").insert({
      user_id: user.id,
      export_type: "import_history",
      row_count: batches.length,
      is_full_export: false,
      filters: { branch: filterBranch, status: filterStatus, dateFrom: filterDateFrom, dateTo: filterDateTo },
    });

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(language === "th" ? "ส่งออกสำเร็จ" : "Export complete");
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            {language === "th" ? "ตัวกรอง" : "Filters"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">{language === "th" ? "สาขา" : "Branch"}</Label>
              <Select value={filterBranch} onValueChange={v => { setFilterBranch(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "th" ? "ทั้งหมด" : "All"}</SelectItem>
                  <SelectItem value="silom">Silom</SelectItem>
                  <SelectItem value="pattaya">Pattaya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{language === "th" ? "สถานะ" : "Status"}</Label>
              <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(0); }}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "th" ? "ทั้งหมด" : "All"}</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{language === "th" ? "ตั้งแต่" : "From"}</Label>
              <Input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(0); }} className="w-[150px]" />
            </div>
            <div>
              <Label className="text-xs">{language === "th" ? "ถึง" : "To"}</Label>
              <Input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(0); }} className="w-[150px]" />
            </div>
            <Button variant="outline" size="sm" onClick={exportHistoryCSV} disabled={batches.length === 0}>
              <Download className="h-3 w-3 mr-1" />
              {language === "th" ? "ส่งออก CSV" : "Export CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              {language === "th" ? "ประวัติการนำเข้า" : "Import History"}
              <Badge variant="secondary" className="text-xs">{totalCount}</Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : batches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {language === "th" ? "ยังไม่มีประวัติการนำเข้า" : "No import history yet"}
            </p>
          ) : (
            <>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{language === "th" ? "เวลา" : "Time"}</TableHead>
                      <TableHead className="text-xs">{language === "th" ? "สาขา" : "Branch"}</TableHead>
                      <TableHead className="text-xs">{language === "th" ? "ไฟล์" : "File"}</TableHead>
                      <TableHead className="text-xs">{language === "th" ? "รูปแบบ" : "Format"}</TableHead>
                      <TableHead className="text-xs text-center">{language === "th" ? "ทั้งหมด" : "Total"}</TableHead>
                      <TableHead className="text-xs text-center text-green-600">{language === "th" ? "เพิ่ม" : "New"}</TableHead>
                      <TableHead className="text-xs text-center text-blue-600">{language === "th" ? "ซ้ำ" : "Dup"}</TableHead>
                      <TableHead className="text-xs text-center text-red-600">{language === "th" ? "Error" : "Err"}</TableHead>
                      <TableHead className="text-xs">{language === "th" ? "สถานะ" : "Status"}</TableHead>
                      <TableHead className="text-xs"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map(b => (
                      <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedBatchId(b.id)}>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(b.uploaded_at), "dd/MM/yy HH:mm")}</TableCell>
                        <TableCell className="text-xs capitalize">{b.branch}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate" title={b.filename}>{b.filename}</TableCell>
                        <TableCell className="text-xs">{b.source_type === 'bangkok' ? 'BKK' : b.source_type === 'pattaya_reach' ? 'PTY' : '?'}</TableCell>
                        <TableCell className="text-xs text-center font-medium">{b.total_rows}</TableCell>
                        <TableCell className="text-xs text-center text-green-600 font-medium">{b.inserted_rows}</TableCell>
                        <TableCell className="text-xs text-center text-blue-600 font-medium">{b.duplicate_rows}</TableCell>
                        <TableCell className="text-xs text-center text-red-600 font-medium">{b.error_rows}</TableCell>
                        <TableCell>{statusBadge(b.status, b.is_dry_run)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    {language === "th" ? `หน้า ${page + 1} / ${totalPages}` : `Page ${page + 1} of ${totalPages}`}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <ImportDetailDrawer
        batchId={selectedBatchId}
        onClose={() => setSelectedBatchId(null)}
      />
    </div>
  );
}
