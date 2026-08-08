import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Sparkles, Copy, Download, RefreshCw } from "lucide-react";

interface Draft {
  subject: string;
  body: string;
}

function slugify(domain: string) {
  return domain.replace(/[^a-z0-9.-]/gi, "-").toLowerCase();
}

function buildEml(draft: Draft) {
  const enc = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
  return [
    "MIME-Version: 1.0",
    "X-Unsent: 1",
    "To: ",
    `Subject: =?UTF-8?B?${enc(draft.subject)}?=`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    enc(draft.body).replace(/(.{76})/g, "$1\r\n"),
  ].join("\r\n");
}

export default function ProspectEmailDraft({
  prospectId,
  domain,
}: {
  prospectId: string;
  domain: string;
}) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const generate = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-outreach-emails", {
      body: {
        prospectIds: [prospectId],
        language: "th",
        senderName: "ทีมงาน testD (SWING Thailand)",
      },
    });
    setLoading(false);
    if (error || data?.error) {
      toast.error("สร้างร่างอีเมลไม่สำเร็จ: " + (data?.error ?? error?.message ?? ""));
      return;
    }
    const first = (data?.emails ?? [])[0];
    if (!first) {
      toast.error("ไม่ได้รับร่างอีเมลกลับมา");
      return;
    }
    setDraft({ subject: first.subject, body: first.body });
    toast.success("ร่างอีเมลสำหรับ " + domain + " แล้ว");
  };

  const copy = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
    toast.success("คัดลอกแล้ว");
  };

  const download = () => {
    if (!draft) return;
    const blob = new Blob([buildEml(draft)], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outreach-${slugify(domain)}.eml`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          ร่างอีเมลติดต่อ (AI)
        </span>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={generate} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : draft ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">{draft ? "สร้างใหม่" : "ร่างอีเมล"}</span>
          </Button>
          {draft && (
            <>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={copy}>
                <Copy className="h-3.5 w-3.5" />
                <span className="ml-1.5">คัดลอก</span>
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={download}>
                <Download className="h-3.5 w-3.5" />
                <span className="ml-1.5">.eml</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {draft ? (
        <div className="space-y-2">
          <Input
            aria-label={`หัวข้ออีเมลสำหรับ ${domain}`}
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            className="text-[13px] h-9"
          />
          <Textarea
            aria-label={`เนื้อหาอีเมลสำหรับ ${domain}`}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            className="text-[13px] min-h-[180px] leading-relaxed"
          />
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          สร้างอีเมลเฉพาะโดเมนนี้จาก “เหตุผลที่เหมาะ” เพื่อนำไปส่งได้ทันที
        </p>
      )}
    </div>
  );
}
