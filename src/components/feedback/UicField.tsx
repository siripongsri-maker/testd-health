import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, CheckCircle2, AlertCircle, RefreshCw, User, Calendar as CalIcon } from "lucide-react";
import { fetchUicVisitStats, getClientSeedId, setStoredUic, type UicVisitStats } from "@/lib/clientSeed";
import { generateUic, isValidUic, detectNationality, isYearPlausibleForMode, type UicNationality } from "@/lib/uic";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  channel: string;
  firstName: string;
  lastName: string;
  /** Stored as "DD/MM/YYYY" — YYYY is BE for Thai, CE for foreign (no conversion applied). */
  dob: string;
  uic: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onDobChange: (v: string) => void;
  onUicChange: (uic: string) => void;
  onStatsLoaded?: (stats: UicVisitStats) => void;
}

const parseDob = (dob: string): { day: string; month: string; year: string } => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec((dob || '').trim());
  if (!m) return { day: '', month: '', year: '' };
  return { day: m[1], month: m[2], year: m[3] };
};

const composeDob = (day: string, month: string, year: string) => {
  if (!day && !month && !year) return '';
  return `${day}/${month}/${year}`;
};

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

  // Manual nationality override; defaults to auto-detect from name
  const detected = useMemo(() => detectNationality(firstName, lastName), [firstName, lastName]);
  const [nationalityOverride, setNationalityOverride] = useState<UicNationality | 'auto'>('auto');
  const nationality: UicNationality = nationalityOverride === 'auto' ? detected : nationalityOverride;

  const required = channel === 'clinic' || channel === 'outreach';

  // Local D/M/Y state, parsed from `dob` string ("DD/MM/YYYY")
  const initial = parseDob(dob);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  // When parent dob changes externally (rare), sync down
  useEffect(() => {
    const p = parseDob(dob);
    if (p.day !== day) setDay(p.day);
    if (p.month !== month) setMonth(p.month);
    if (p.year !== year) setYear(p.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dob]);

  // Push composed DOB up
  useEffect(() => {
    const composed = composeDob(day, month, year);
    if (composed !== dob) onDobChange(composed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, month, year]);

  // Auto-generate UIC whenever inputs or mode change
  useEffect(() => {
    const dNum = parseInt(day, 10);
    const mNum = parseInt(month, 10);
    const yNum = parseInt(year, 10);
    const result = generateUic({
      firstName,
      lastName,
      day: Number.isFinite(dNum) ? dNum : null,
      month: Number.isFinite(mNum) ? mNum : null,
      year: Number.isFinite(yNum) ? yNum : null,
      nationality,
    });
    if ((result.uic ?? '') !== uic) {
      onUicChange(result.uic ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, day, month, year, nationality]);

  const valid = isValidUic(uic);
  const yNum = parseInt(year, 10);
  const yearOkForMode = !year || (Number.isFinite(yNum) && isYearPlausibleForMode(yNum, nationality));

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

  const isThai = nationality === 'thai';
  const yearPlaceholder = isThai ? '2535' : '1995';
  const yearLabel = isThai
    ? (language === 'th' ? 'ปีเกิด (พ.ศ.)' : 'Year (BE)')
    : (language === 'th' ? 'ปีเกิด (ค.ศ.)' : 'Year (AD)');

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
      <div className="rounded-lg border border-primary/20 bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
        {language === 'th'
          ? <>เช่น <span className="font-mono font-semibold text-primary">ศศ310835</span> (ศิริพงษ์ ศรีเชื้อ · 31/08/2535)</>
          : <>e.g. <span className="font-mono font-semibold text-primary">JS140895</span> (John Smith · 14/08/1995)</>}
      </div>

      {/* Nationality selector */}
      <div className="flex items-center gap-2">
        <Label className="text-[11px] text-muted-foreground shrink-0">
          {language === 'th' ? 'สัญชาติ' : 'Nationality'}
        </Label>
        <Select value={nationalityOverride} onValueChange={(v) => setNationalityOverride(v as any)}>
          <SelectTrigger className="h-8 rounded-lg text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">
              {language === 'th' ? `อัตโนมัติ (${detected === 'thai' ? 'ไทย' : 'ต่างชาติ'})` : `Auto (${detected === 'thai' ? 'Thai' : 'Foreign'})`}
            </SelectItem>
            <SelectItem value="thai">{language === 'th' ? 'ไทย (พ.ศ.)' : 'Thai (BE)'}</SelectItem>
            <SelectItem value="foreign">{language === 'th' ? 'ต่างชาติ (ค.ศ.)' : 'Foreign (AD)'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            {language === 'th' ? 'ชื่อ' : 'First name'}
          </Label>
          <Input
            value={firstName}
            onChange={e => onFirstNameChange(e.target.value)}
            placeholder={language === 'th' ? 'เช่น ศิริพงษ์' : 'e.g. John'}
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
            placeholder={language === 'th' ? 'เช่น ศรีเชื้อ' : 'e.g. Smith'}
            className="rounded-lg mt-1"
            autoComplete="off"
          />
        </div>
      </div>

      {/* DOB — separate D / M / Y so the year stays as-typed */}
      <div>
        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <CalIcon className="h-3 w-3" />
          {language === 'th'
            ? `วันเดือนปีเกิด (${isThai ? 'พ.ศ.' : 'ค.ศ.'})`
            : `Date of birth (${isThai ? 'BE' : 'AD'})`}
        </Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <Input
            inputMode="numeric"
            maxLength={2}
            value={day}
            onChange={e => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder={language === 'th' ? 'วัน' : 'DD'}
            className="rounded-lg text-center"
            aria-label={language === 'th' ? 'วัน' : 'Day'}
          />
          <Input
            inputMode="numeric"
            maxLength={2}
            value={month}
            onChange={e => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder={language === 'th' ? 'เดือน' : 'MM'}
            className="rounded-lg text-center"
            aria-label={language === 'th' ? 'เดือน' : 'Month'}
          />
          <Input
            inputMode="numeric"
            maxLength={4}
            value={year}
            onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder={yearPlaceholder}
            className="rounded-lg text-center"
            aria-label={yearLabel}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {language === 'th'
            ? `เช่น 31 / 08 / ${yearPlaceholder}`
            : `e.g. 14 / 08 / ${yearPlaceholder}`}
        </p>
        {!yearOkForMode && (
          <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {isThai
              ? (language === 'th' ? 'ปีต้องเป็น พ.ศ. (เช่น 2535)' : 'Year must be Buddhist year (e.g. 2535)')
              : (language === 'th' ? 'ปีต้องเป็น ค.ศ. (เช่น 1995)' : 'Year must be Gregorian (e.g. 1995)')}
          </p>
        )}
      </div>

      {/* Generated UIC preview */}
      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-background/60 px-3 py-2">
        <div className="text-[11px] text-muted-foreground">
          {language === 'th' ? 'UIC ของคุณ' : 'Your UIC'}
          <span className="ml-2 text-[10px] uppercase tracking-wide text-primary/70">
            {isThai ? 'TH · พ.ศ.' : 'EN · CE'}
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

      {!valid && (firstName || lastName || day || month || year) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" />
          {language === 'th'
            ? 'กรอก ชื่อ + นามสกุล + วันเดือนปีเกิด ให้ครบเพื่อสร้าง UIC'
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
