import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, CheckCircle2, AlertCircle, RefreshCw, User, Calendar as CalIcon } from "lucide-react";
import { fetchUicVisitStats, getClientSeedId, setStoredUic, type UicVisitStats } from "@/lib/clientSeed";
import { generateUic, isValidUic, detectNationality } from "@/lib/uic";

interface Props {
  channel: string;
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD (Gregorian)
  uic: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onDobChange: (v: string) => void;
  onUicChange: (uic: string) => void;
  onStatsLoaded?: (stats: UicVisitStats) => void;
}

export function UicField({
  channel,
  firstName,
  lastName,
  dob,
  uic,
  onFirstNameChange,
  onLastNameChange,
  onDobChange,
  onUicChange,
  onStatsLoaded,
}: Props) {
  const { language } = useLanguage();
  const [stats, setStats] = useState<UicVisitStats | null>(null);
  const [checking, setChecking] = useState(false);

  const required = channel === 'clinic' || channel === 'outreach';
  const nationality = useMemo(() => detectNationality(firstName, lastName), [firstName, lastName]);

  // Auto-generate UIC whenever inputs change
  useEffect(() => {
    const result = generateUic({ firstName, lastName, dob });
    if (result.uic !== uic) {
      onUicChange(result.uic ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, dob]);

  const valid = isValidUic(uic);

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
      <Label className="text-sm font-medium flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-primary" />
        {language === 'th' ? 'รหัสประจำตัวผู้รับบริการ (UIC)' : 'Unique Identification Code (UIC)'}
        {required && <span className="text-destructive">*</span>}
        {!required && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {language === 'th' ? 'ไม่บังคับ' : 'Optional'}
          </Badge>
        )}
      </Label>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {language === 'th'
          ? 'UIC สร้างจาก: อักษรแรกของชื่อ + อักษรแรกของนามสกุล + วัน/เดือน/ปีเกิด (คนไทยใช้ พ.ศ. / ต่างชาติใช้ ค.ศ.)'
          : 'UIC = first letter of first name + first letter of last name + DDMMYY of birth (Thai uses Buddhist year / Foreign uses Gregorian year)'}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            {language === 'th' ? 'ชื่อ' : 'First name'}
          </Label>
          <Input
            value={firstName}
            onChange={e => onFirstNameChange(e.target.value)}
            placeholder={language === 'th' ? 'สมชาย' : 'John'}
            className="rounded-lg mt-1"
            autoComplete="off"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            {language === 'th' ? 'นามสกุล' : 'Last name'}
          </Label>
          <Input
            value={lastName}
            onChange={e => onLastNameChange(e.target.value)}
            placeholder={language === 'th' ? 'ใจดี' : 'Smith'}
            className="rounded-lg mt-1"
            autoComplete="off"
          />
        </div>
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <CalIcon className="h-3 w-3" />
          {language === 'th' ? 'วันเดือนปีเกิด (ค.ศ.)' : 'Date of birth'}
        </Label>
        <Input
          type="date"
          value={dob}
          onChange={e => onDobChange(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="rounded-lg mt-1"
        />
      </div>

      {/* Generated UIC preview */}
      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-background/60 px-3 py-2">
        <div className="text-[11px] text-muted-foreground">
          {language === 'th' ? 'UIC ของคุณ' : 'Your UIC'}
          <span className="ml-2 text-[10px] uppercase tracking-wide text-primary/70">
            {nationality === 'thai' ? 'TH · พ.ศ.' : 'EN · CE'}
          </span>
        </div>
        <div className={`font-mono text-base font-bold ${valid ? 'text-primary' : 'text-muted-foreground/60'}`}>
          {uic || '— — —'}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        🔒 {language === 'th'
          ? 'ใช้เพื่อเชื่อมประวัติการรับบริการและประเมินซ้ำเท่านั้น เก็บเป็นความลับ'
          : 'Used only to link service history & repeat assessments. Kept confidential.'}
      </p>

      {!valid && (firstName || lastName || dob) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" />
          {language === 'th'
            ? 'กรอก ชื่อ + นามสกุล + วันเกิด ให้ครบเพื่อสร้าง UIC'
            : 'Enter first name, last name, and date of birth to generate UIC'}
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
