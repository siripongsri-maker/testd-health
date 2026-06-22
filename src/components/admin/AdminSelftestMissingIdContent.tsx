import { useEffect, useState } from "react";
import { Copy, Link as LinkIcon, Loader2, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";

type Row = {
  request_id: string;
  pii_id: string;
  full_name: string | null;
  phone: string | null;
  province: string | null;
  created_at: string;
  assigned_branch: string | null;
};

export default function AdminSelftestMissingIdContent() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    // Pull recent requests whose linked PII is missing thai_id.
    const { data: piiRows, error: piiErr } = await supabase
      .from("selftest_pii")
      .select("id, full_name, phone, province, created_at")
      .or("thai_id.is.null,thai_id.eq.")
      .order("created_at", { ascending: false })
      .limit(500);
    if (piiErr) {
      toast.error(piiErr.message);
      setLoading(false);
      return;
    }
    const piiIds = (piiRows || []).map((r) => r.id);
    if (piiIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: reqs, error: reqErr } = await supabase
      .from("hiv_selftest_requests")
      .select("id, pii_id, assigned_branch, created_at")
      .in("pii_id", piiIds);
    if (reqErr) {
      toast.error(reqErr.message);
      setLoading(false);
      return;
    }
    const piiMap = new Map((piiRows || []).map((r) => [r.id, r]));
    const merged: Row[] = (reqs || [])
      .map((r) => {
        const p = piiMap.get(r.pii_id);
        if (!p) return null;
        return {
          request_id: r.id,
          pii_id: r.pii_id,
          full_name: p.full_name,
          phone: p.phone,
          province: p.province,
          assigned_branch: r.assigned_branch,
          created_at: r.created_at || p.created_at,
        } as Row;
      })
      .filter(Boolean) as Row[];
    merged.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.full_name || "").toLowerCase().includes(q) ||
      (r.phone || "").toLowerCase().includes(q) ||
      (r.province || "").toLowerCase().includes(q) ||
      r.request_id.toLowerCase().includes(q)
    );
  });

  const generateLink = async (requestId: string) => {
    setGenerating(requestId);
    const { data, error } = await supabase.functions.invoke("selftest-create-update-id-link", {
      body: { request_id: requestId },
    });
    setGenerating(null);
    if (error || !data?.url) {
      toast.error((data as any)?.detail || (data as any)?.error || error?.message || "Failed");
      return;
    }
    setGeneratedUrl((m) => ({ ...m, [requestId]: data.url }));
    try {
      await navigator.clipboard.writeText(data.url);
      toast.success(isTh ? "คัดลอกลิงก์เรียบร้อย" : "Link copied");
    } catch {
      toast.success(isTh ? "สร้างลิงก์เรียบร้อย" : "Link generated");
    }
  };

  const copyAgain = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(isTh ? "คัดลอกแล้ว" : "Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            {isTh ? "ผู้ใช้ที่ไม่มีเลขบัตรประชาชน" : "Users Missing Thai National ID"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isTh
              ? "ส่งลิงก์ปลอดภัย (อายุ 14 วัน, ใช้ครั้งเดียว) ให้ผู้ใช้กรอกเลขบัตรประชาชนใหม่"
              : "Send a secure one-time link (14 day expiry) so the user can re-enter their Thai national ID."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isTh ? "ค้นหาชื่อ / เบอร์ / จังหวัด / รหัสคำขอ" : "Search name / phone / province / request id"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {isTh ? "รีเฟรช" : "Refresh"}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            {isTh ? "พบ" : "Found"} <span className="font-semibold text-foreground">{filtered.length}</span> {isTh ? "รายการ" : "records"}
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {isTh ? "ไม่พบรายการที่ไม่มีเลขบัตร 🎉" : "No records missing Thai ID 🎉"}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const url = generatedUrl[r.request_id];
                return (
                  <div key={r.request_id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">{r.full_name || (isTh ? "(ไม่มีชื่อ)" : "(no name)")}</span>
                        {r.assigned_branch && <Badge variant="outline">{r.assigned_branch}</Badge>}
                        {r.province && <Badge variant="secondary">{r.province}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {r.phone || "—"} · {new Date(r.created_at).toLocaleString(isTh ? "th-TH" : "en-US", { timeZone: "Asia/Bangkok" })}
                      </div>
                      {url && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <LinkIcon className="h-3 w-3 text-primary shrink-0" />
                          <code className="bg-muted px-2 py-1 rounded truncate flex-1">{url}</code>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {url ? (
                        <Button size="sm" variant="outline" onClick={() => copyAgain(url)}>
                          <Copy className="h-4 w-4 mr-1" />
                          {isTh ? "คัดลอกอีกครั้ง" : "Copy again"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => generateLink(r.request_id)}
                          disabled={generating === r.request_id}
                        >
                          {generating === r.request_id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <LinkIcon className="h-4 w-4 mr-1" />
                          )}
                          {isTh ? "สร้างลิงก์" : "Generate link"}
                        </Button>
                      )}
                    </div>
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
