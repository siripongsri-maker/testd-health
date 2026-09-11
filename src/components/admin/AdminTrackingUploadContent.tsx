import { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { FileUp, Loader2, Save, Truck, X } from 'lucide-react';
import {
  matchShipments,
  parseDelimitedText,
  parsePdfFile,
  type MatchResult,
  type RequestCandidate,
} from '@/lib/trackingImport';

/** Requests that are still waiting for (or can still receive) a tracking number. */
const OPEN_STATUSES = ['pending', 'approved', 'confirmed', 'shipped'];

interface PiiRow {
  full_name: string | null;
  phone: string | null;
}

export default function AdminTrackingUploadContent() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<MatchResult[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const loadCandidates = useCallback(async (): Promise<RequestCandidate[]> => {
    // Page through every open request — there are thousands, and an older order
    // must still be matchable.
    const PAGE = 1000;
    const data: unknown[] = [];
    for (let page = 0; ; page++) {
      const { data: chunk, error } = await supabase
        .from('hiv_selftest_requests')
        .select('id, status, tracking_number, created_at, selftest_pii ( full_name, phone )')
        .in('status', OPEN_STATUSES)
        .order('created_at', { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      data.push(...(chunk ?? []));
      if (!chunk || chunk.length < PAGE) break;
    }

    return (data as Record<string, unknown>[]).map((r) => {
      const pii = (r as unknown as { selftest_pii: PiiRow | PiiRow[] | null }).selftest_pii;
      const p = Array.isArray(pii) ? pii[0] : pii;
      return {
        id: r.id as string,
        status: r.status as string,
        tracking_number: (r.tracking_number as string | null) ?? null,
        created_at: r.created_at as string,
        full_name: p?.full_name ?? null,
        phone: p?.phone ?? null,
      };
    });
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setParsing(true);
    try {
      const shipments = [];
      for (const file of Array.from(files)) {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          shipments.push(...(await parsePdfFile(file)));
        } else {
          shipments.push(...parseDelimitedText(await file.text(), file.name));
        }
      }

      if (!shipments.length) {
        toast.error('ไม่พบเลขพัสดุในไฟล์ที่อัปโหลด');
        return;
      }

      const candidates = await loadCandidates();
      const matched = matchShipments(shipments, candidates);
      setRows(matched);
      setSelected(
        Object.fromEntries(matched.map((m, i) => [i, m.confidence !== 'none'])),
      );
      toast.success(
        `อ่านได้ ${matched.length} รายการ · จับคู่อัตโนมัติ ${matched.filter((m) => m.confidence !== 'none').length} รายการ`,
      );
    } catch (e) {
      console.error(e);
      toast.error('อ่านไฟล์ไม่สำเร็จ กรุณาตรวจสอบไฟล์อีกครั้ง');
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const readyCount = useMemo(
    () => rows.filter((r, i) => selected[i] && r.requestId).length,
    [rows, selected],
  );

  const save = async () => {
    const targets = rows
      .map((r, i) => ({ ...r, index: i }))
      .filter((r) => selected[r.index] && r.requestId);
    if (!targets.length) return;

    setSaving(true);
    let ok = 0;
    let failed = 0;
    for (const t of targets) {
      const { error } = await supabase
        .from('hiv_selftest_requests')
        .update({
          tracking_number: t.tracking,
          tracking_carrier: 'thailand_post',
          status: 'shipped',
        })
        .eq('id', t.requestId!);
      if (error) {
        console.error(error);
        failed++;
      } else {
        ok++;
      }
    }
    setSaving(false);
    toast[failed ? 'warning' : 'success'](
      `บันทึกเลขพัสดุแล้ว ${ok} รายการ${failed ? ` · ไม่สำเร็จ ${failed}` : ''}`,
    );
    if (ok) {
      setRows((prev) => prev.filter((_, i) => !targets.some((t) => t.index === i)));
      setSelected({});
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-primary" />
            อัปโหลดเลขพัสดุ (จับคู่ชื่อผู้ขอให้อัตโนมัติ)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            อัปโหลดไฟล์ใบจ่าหน้าไปรษณีย์ไทย (PDF) หรือไฟล์ CSV จากขนส่ง ระบบจะอ่านเลขพัสดุ
            แล้วจับคู่กับผู้ขอชุดตรวจจากเบอร์โทร (หากไม่พบจะใช้ชื่อ) ให้ตรวจสอบก่อนกดบันทึก
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.csv,.txt,.tsv"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileRef.current?.click()} disabled={parsing}>
              {parsing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4 mr-2" />
              )}
              เลือกไฟล์ (PDF / CSV)
            </Button>
            {rows.length > 0 && (
              <Button variant="outline" onClick={() => { setRows([]); setSelected({}); }}>
                <X className="h-4 w-4 mr-2" />
                ล้างรายการ
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">
              ตรวจสอบก่อนบันทึก ({readyCount}/{rows.length})
            </CardTitle>
            <Button size="sm" onClick={save} disabled={saving || readyCount === 0}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              บันทึกและตั้งสถานะ "จัดส่งแล้ว"
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.map((r, i) => (
              <div
                key={`${r.tracking}-${i}`}
                className="rounded-xl border border-border/60 p-3 flex flex-wrap items-center gap-3"
              >
                <Checkbox
                  checked={!!selected[i]}
                  disabled={!r.requestId}
                  onCheckedChange={(v) => setSelected((s) => ({ ...s, [i]: !!v }))}
                />
                <div className="min-w-[9rem]">
                  <p className="font-mono text-sm font-semibold">{r.tracking}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.source}</p>
                </div>
                <div className="flex-1 min-w-[12rem] text-sm">
                  <p className="text-muted-foreground text-xs">จากไฟล์: {r.name || '—'} {r.phone ? `· ${r.phone}` : ''}</p>
                  {r.requestId ? (
                    <p className="font-medium">
                      ผู้ขอ: {r.matchedName || '—'} {r.matchedPhone ? `· ${r.matchedPhone}` : ''}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-destructive">ไม่พบผู้ขอที่ตรงกัน</span>
                      <Input
                        placeholder="วางรหัสคำขอ (ID) เพื่อจับคู่เอง"
                        className="h-8 text-xs max-w-[18rem]"
                        onBlur={(e) => {
                          const id = e.target.value.trim();
                          if (!id) return;
                          setRows((prev) =>
                            prev.map((row, idx) =>
                              idx === i ? { ...row, requestId: id, confidence: 'name' } : row,
                            ),
                          );
                          setSelected((s) => ({ ...s, [i]: true }));
                        }}
                      />
                    </div>
                  )}
                </div>
                <Badge
                  variant={
                    r.confidence === 'phone'
                      ? 'default'
                      : r.confidence === 'name'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {r.confidence === 'phone'
                    ? 'ตรงเบอร์โทร'
                    : r.confidence === 'name'
                      ? 'ตรงชื่อ'
                      : 'ยังไม่จับคู่'}
                </Badge>
                {r.currentTracking && r.currentTracking !== r.tracking && (
                  <span className="text-[11px] text-amber-600">
                    เดิม: {r.currentTracking}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
