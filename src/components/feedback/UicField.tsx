import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { fetchUicVisitStats, getClientSeedId, setStoredUic, type UicVisitStats } from "@/lib/clientSeed";
import { isValidUic, normalizeUic } from "@/lib/uic";

interface Props {
  channel: string;
  uic: string;
  onUicChange: (uic: string) => void;
  onStatsLoaded?: (stats: UicVisitStats) => void;
  // Legacy props kept for backward-compatibility with parent (no-op)
  firstName?: string;
  lastName?: string;
  dob?: string;
  onFirstNameChange?: (v: string) => void;
  onLastNameChange?: (v: string) => void;
  onDobChange?: (v: string) => void;
}

export function UicField({ channel, uic, onUicChange, onStatsLoaded }: Props) {
  const { language } = useLanguage();
  const [stats, setStats] = useState<UicVisitStats | null>(null);
  const [checking, setChecking] = useState(false);

  const required = channel === 'clinic' || channel === 'outreach';
  const valid = isValidUic(uic);
  const hasInput = uic.trim().length > 0;

  // Lookup stats when UIC becomes valid
  useEffect(() => {
    if (!valid) { setStats(null); return; }
    let cancelled = false;
    (async () => {
      setChecking(true);
      const seed = getClientSeedId();
      const result = await fetchUicVisitStats(uic, seed);
      if (!cancelled) {
        setStats(result);
        onStatsLoaded?.(result);
        setStoredUic(uic);
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [uic, valid]);

  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <Label className="text-sm font-medium flex items-center gap-2 flex-wrap">
        <Fingerprint className="h-4 w-4 text-primary" />
        {language === 'th' ? 'รหัสประจำตัวผู้รับบริการ (UIC)' : 'Unique Identification Code (UIC)'}
        {required && <span className="text-destructive">*</span>}
        {!required && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {language === 'th' ? 'ไม่บังคับ' : 'Optional'}
          </Badge>
        )}
      </Label>

      {/* Compact example box */}
      <div className="rounded-lg border border-primary/20 bg-background/60 px-3 py-2 text-[11px] text-muted-foreground space-y-1">
        <div>
          {language === 'th' ? 'ตัวอย่าง (ไทย):' : 'Example (Thai):'}{' '}
          <span className="font-mono font-semibold text-primary">สจ140838</span>
          <span className="text-muted-foreground/80"> — สมชาย ใจเด็ด · 14/08/2538</span>
        </div>
        <div>
          {language === 'th' ? 'ตัวอย่าง (ต่างชาติ):' : 'Example (Foreign):'}{' '}
          <span className="font-mono font-semibold text-primary">JS140895</span>
          <span className="text-muted-foreground/80"> — John Smith · 14/08/1995</span>
        </div>
        <div className="pt-1 text-[10px] text-muted-foreground/80">
          {language === 'th'
            ? 'อักษรแรกของชื่อ + อักษรแรกของนามสกุล + วัน/เดือน/ปีเกิด (ไทย=พ.ศ. · ต่างชาติ=ค.ศ.)'
            : 'First letter of first name + first letter of last name + DDMMYY (Thai=BE · Foreign=AD)'}
        </div>
      </div>

      {/* Direct UIC input */}
      <div>
        <Input
          value={uic}
          onChange={e => onUicChange(normalizeUic(e.target.value))}
          placeholder={language === 'th' ? 'เช่น สจ140838 หรือ JS140895' : 'e.g. สจ140838 or JS140895'}
          className="rounded-lg font-mono text-base tracking-wider text-center"
          autoComplete="off"
          maxLength={8}
          aria-label="UIC"
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        🔒 {language === 'th'
          ? 'ใช้เพื่อเชื่อมประวัติการรับบริการและประเมินซ้ำเท่านั้น เก็บเป็นความลับ'
          : 'Used only to link service history & repeat assessments. Kept confidential.'}
      </p>

      {hasInput && !valid && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {language === 'th'
            ? 'รูปแบบ UIC ไม่ถูกต้อง — ต้องเป็น 2 อักษร + 6 ตัวเลข'
            : 'Invalid UIC format — must be 2 letters + 6 digits'}
        </div>
      )}

      {checking && valid && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          {language === 'th' ? 'กำลังตรวจสอบประวัติ...' : 'Looking up history...'}
        </div>
      )}

      {stats && valid && !checking && (
        <div className="flex flex-wrap gap-2 pt-1">
          {stats.is_repeat ? (
            <Badge className="bg-warning/15 text-warning border border-warning/30">
              🔁 {language === 'th'
                ? `ทำครั้งที่ ${stats.assessment_count + 1}`
                : `Assessment #${stats.assessment_count + 1}`}
            </Badge>
          ) : (
            <Badge className="bg-success/15 text-success border border-success/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {language === 'th' ? 'ประเมินครั้งแรก' : 'First-time assessment'}
            </Badge>
          )}
          {stats.visit_count > 0 && (
            <Badge variant="outline" className="text-xs">
              👁 {language === 'th' ? `เคย visit ${stats.visit_count} ครั้ง` : `${stats.visit_count} prior visits`}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
