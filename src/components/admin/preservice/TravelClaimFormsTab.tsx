import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Eye, EyeOff, FileSignature, IdCard, Banknote, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

interface ClaimRow {
  id: string;
  created_at: string;
  branch_id: string | null;
  amount: number;
  status: string;
  account_holder_name: string;
  bank_name: string;
  bank_account_no: string;
  payout_method: string | null;
  promptpay_no: string | null;
  phone_last4: string | null;
  id_card_path: string | null;
  signature_path: string | null;
  id_card_watermarked: boolean | null;
  evaluation_id: string | null;
  note_id: string | null;
  claim_seq: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  paid: "จ่ายแล้ว",
  rejected: "ปฏิเสธ",
};

function mask(no: string | null) {
  const d = (no || "").replace(/\D/g, "");
  if (!d) return "—";
  return d.length <= 4 ? d : "•".repeat(d.length - 4) + d.slice(-4);
}

/**
 * "แบบฟอร์มค่าเดินทาง" — the form-style view of every payout claim linked to a
 * pre-service survey case: identity document (watermarked), signature and the
 * bank / PromptPay account, with PII masked until staff explicitly reveal it.
 */
export default function TravelClaimFormsTab() {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => (language === "th" ? th : en);

  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [branches, setBranches] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [docs, setDocs] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: brs }] = await Promise.all([
      supabase
        .from("counseling_payout_claims")
        .select("id, created_at, branch_id, amount, status, account_holder_name, bank_name, bank_account_no, payout_method, promptpay_no, phone_last4, id_card_path, signature_path, id_card_watermarked, evaluation_id, note_id, claim_seq")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("booking_branches").select("id, name_th"),
    ]);
    if (error) toast({ title: tx("โหลดข้อมูลไม่สำเร็จ", "Could not load"), description: error.message, variant: "destructive" });
    setRows((data as ClaimRow[]) ?? []);
    setBranches(Object.fromEntries(((brs as any[]) ?? []).map((b) => [b.id, b.name_th])));
    setLoading(false);
  }, [language]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("preservice-claim-forms-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "counseling_payout_claims" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const openDoc = async (key: string, path: string) => {
    if (docs[key]) { setDocs((d) => ({ ...d, [key]: "" })); return; }
    const { data, error } = await supabase.storage.from("identity-docs").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      toast({ title: tx("เปิดไฟล์ไม่สำเร็จ", "Could not open file"), description: error?.message, variant: "destructive" });
      return;
    }
    setDocs((d) => ({ ...d, [key]: data.signedUrl }));
  };

  // Cases carrying an ID document come first — those are the ones finance needs.
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => !q ||
        r.account_holder_name?.toLowerCase().includes(q) ||
        (r.phone_last4 || "").includes(q) ||
        (branches[r.branch_id ?? ""] || "").toLowerCase().includes(q))
      .sort((a, b) => {
        const score = (r: ClaimRow) => (r.id_card_path ? 2 : 0) + (r.signature_path ? 1 : 0);
        return score(b) - score(a) || b.created_at.localeCompare(a.created_at);
      });
  }, [rows, search, branches]);

  const complete = list.filter((r) => r.id_card_path && r.signature_path).length;

  if (loading) {
    return <div className="py-20 flex justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Banknote className="h-5 w-5 text-amber-600" />
            {tx("แบบฟอร์มรับค่าเดินทาง", "Travel allowance forms")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {tx(`ทั้งหมด ${list.length} รายการ · เอกสารครบ ${complete} รายการ · บัตรประชาชนถูกขีดคร่อม “ใช้เพื่อรับค่าเดินทางในกิจกรรมของ SWING เท่านั้น”`,
                `${list.length} claims · ${complete} with complete documents · ID photos are watermarked for SWING travel reimbursement only`)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tx("ค้นหา ชื่อ / เลขท้าย / สาขา", "Search name / last4 / branch")} className="h-9 w-56" />
          <Button variant="outline" size="sm" onClick={load} className="h-9">
            <RefreshCw className="h-4 w-4 mr-1" />{tx("รีเฟรช", "Refresh")}
          </Button>
        </div>
      </div>

      {list.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {tx("ยังไม่มีแบบฟอร์มขอค่าเดินทาง", "No travel allowance forms yet")}
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((r) => {
          const show = !!revealed[r.id];
          return (
            <Card key={r.id} className="p-4 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">
                    {show ? r.account_holder_name : `${(r.account_holder_name || "—").slice(0, 1)}•••`}
                    {r.claim_seq ? <span className="text-muted-foreground font-normal"> · #{r.claim_seq}</span> : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {branches[r.branch_id ?? ""] || tx("ไม่ระบุสาขา", "Unknown branch")} ·{" "}
                    {new Date(r.created_at).toLocaleString(language === "th" ? "th-TH" : "en-GB")}
                    {r.phone_last4 ? ` · •••${r.phone_last4}` : ""}
                  </p>
                </div>
                <Badge variant="outline">{tx(STATUS_LABEL[r.status] ?? r.status, r.status)}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">{tx("ช่องทาง", "Method")}</p>
                  <p className="font-medium">{r.payout_method === "promptpay" ? tx("พร้อมเพย์", "PromptPay") : r.bank_name || tx("ธนาคาร", "Bank")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{tx("เลขบัญชี / พร้อมเพย์", "Account / PromptPay")}</p>
                  <p className="font-mono">{show ? (r.payout_method === "promptpay" ? r.promptpay_no : r.bank_account_no) : mask(r.payout_method === "promptpay" ? r.promptpay_no : r.bank_account_no)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs"
                  onClick={() => setRevealed((s) => ({ ...s, [r.id]: !show }))}>
                  {show ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {show ? tx("ซ่อนข้อมูล", "Hide") : tx("แสดงข้อมูล", "Reveal")}
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!r.id_card_path}
                  onClick={() => r.id_card_path && openDoc(`id-${r.id}`, r.id_card_path)}>
                  <IdCard className="h-3.5 w-3.5 mr-1" />
                  {r.id_card_path ? tx("บัตรประชาชน", "ID card") : tx("ไม่มีบัตร", "No ID")}
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!r.signature_path}
                  onClick={() => r.signature_path && openDoc(`sig-${r.id}`, r.signature_path)}>
                  <FileSignature className="h-3.5 w-3.5 mr-1" />
                  {r.signature_path ? tx("ลายมือชื่อ", "Signature") : tx("ไม่มีลายเซ็น", "No signature")}
                </Button>
              </div>

              {docs[`id-${r.id}`] && (
                <div className="space-y-1">
                  <img src={docs[`id-${r.id}`]} alt={tx("บัตรประชาชน (ขีดคร่อม)", "Watermarked ID card")} className="rounded-xl border w-full object-contain max-h-64" />
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-teal-600" />
                    {r.id_card_watermarked
                      ? tx("ขีดคร่อม “ใช้เพื่อรับค่าเดินทางในกิจกรรมของ SWING เท่านั้น”", "Watermarked for SWING travel reimbursement only")
                      : tx("รูปเก่า — ยังไม่มีการขีดคร่อมอัตโนมัติ", "Legacy upload — no automatic watermark")}
                  </p>
                </div>
              )}
              {docs[`sig-${r.id}`] && (
                <img src={docs[`sig-${r.id}`]} alt={tx("ลายมือชื่อ", "Signature")} className="rounded-xl border bg-white w-full object-contain max-h-32" />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
