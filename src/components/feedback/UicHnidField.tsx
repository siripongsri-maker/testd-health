import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { fetchUicVisitStats, getClientSeedId, getStoredUic, isValidUic, normalizeUic, setStoredUic, type UicVisitStats } from "@/lib/clientSeed";

interface Props {
  channel: string;
  value: string;
  onChange: (uic: string) => void;
  onStatsLoaded?: (stats: UicVisitStats) => void;
}

export function UicHnidField({ channel, value, onChange, onStatsLoaded }: Props) {
  const { language } = useLanguage();
  const [stats, setStats] = useState<UicVisitStats | null>(null);
  const [checking, setChecking] = useState(false);

  const required = channel === 'clinic' || channel === 'outreach';
  const valid = isValidUic(value);

  useEffect(() => {
    const stored = getStoredUic();
    if (stored && !value) onChange(stored);
  }, []);

  // Auto lookup when 13 digits are present
  useEffect(() => {
    if (!valid) {
      setStats(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setChecking(true);
      const seed = getClientSeedId();
      const result = await fetchUicVisitStats(value, seed);
      if (!cancelled) {
        setStats(result);
        onStatsLoaded?.(result);
        setStoredUic(value);
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [value, valid]);

  const handleChange = (raw: string) => {
    const normalized = normalizeUic(raw);
    onChange(normalized);
  };

  return (
    <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-primary" />
        {language === 'th' ? 'เลขประจำตัวประชาชน 13 หลัก (UIC/HN)' : 'National ID / UIC / HN (13 digits)'}
        {required && <span className="text-destructive">*</span>}
        {!required && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {language === 'th' ? 'ไม่บังคับ' : 'Optional'}
          </Badge>
        )}
      </Label>

      <Input
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        maxLength={13}
        placeholder="x-xxxx-xxxxx-xx-x"
        value={value}
        onChange={e => handleChange(e.target.value)}
        className="rounded-xl font-mono tracking-wider"
      />

      <p className="text-[11px] text-muted-foreground">
        {language === 'th'
          ? '🔒 ใช้เพื่อเชื่อมประวัติการรับบริการและประเมินซ้ำของคุณเท่านั้น เก็บเป็นความลับ'
          : '🔒 Used only to link your service history & repeat assessments. Kept confidential.'}
      </p>

      {value.length > 0 && !valid && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {language === 'th' ? `ต้องเป็นตัวเลข 13 หลัก (ตอนนี้ ${value.length})` : `Must be 13 digits (currently ${value.length})`}
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
