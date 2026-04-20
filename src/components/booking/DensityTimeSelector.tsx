import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import {
  Clock, Activity, ChevronDown, ChevronUp, AlertCircle, Timer, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { estimateWaitTime, getWaitLabel, type WaitEstimate, type WalkinPressure } from '@/lib/waitTimeEstimator';
import type { SlotHint } from '@/lib/forecast/publicDemand';
import { levelClasses } from '@/lib/forecast/publicDemand';

interface Props {
  openTime: string;
  closeTime: string;
  slotDurationMin: number;
  counselorCount: number;
  slotTimes?: string[];
  bookedSlots: Record<string, number>;
  blockedSlots?: Record<string, string>;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  serviceSlugs?: string[];
  walkinPressure?: WalkinPressure;
  /** Optional per-slot demand hints from Smart Forecast engine */
  slotHints?: SlotHint[];
}

interface TimeBlock {
  label: string;
  startHour: number;
  endHour: number;
  slots: SlotInfo[];
  totalSlots: number;
  bookedCount: number;
  occupancyPct: number;
  level: 'low' | 'medium' | 'high';
  waitEstimate: WaitEstimate;
}

interface SlotInfo {
  time: string;
  booked: number;
  available: number;
  isFull: boolean;
}

function generateSlots(openTime: string, closeTime: string, durationMin: number): string[] {
  const slots: string[] = [];
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  let current = oh * 60 + om;
  const end = ch * 60 + cm;
  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += durationMin;
  }
  return slots;
}

export function DensityTimeSelector({
  openTime, closeTime, slotDurationMin, counselorCount, slotTimes,
  bookedSlots, blockedSlots, selectedTime, onSelectTime, serviceSlugs, walkinPressure,
  slotHints,
}: Props) {
  const { language } = useLanguage();
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);
  const slotHintMap = useMemo(() => {
    const m = new Map<string, SlotHint>();
    (slotHints || []).forEach((h) => m.set(h.time, h));
    return m;
  }, [slotHints]);

  const hasWalkinPressure = walkinPressure && (walkinPressure.activeWalkins > 0 || walkinPressure.recentWalkins90min > 0);

  const allSlots = useMemo(
    () => (slotTimes && slotTimes.length > 0 ? slotTimes : generateSlots(openTime, closeTime, slotDurationMin)),
    [slotTimes, openTime, closeTime, slotDurationMin]
  );

  const blocks = useMemo(() => {
    const openH = parseInt(openTime.split(':')[0]);
    const closeH = parseInt(closeTime.split(':')[0]);
    const blockSize = 2;
    const result: TimeBlock[] = [];

    for (let h = openH; h < closeH; h += blockSize) {
      const endH = Math.min(h + blockSize, closeH);
      const blockSlots = allSlots.filter(s => {
        const sh = parseInt(s.split(':')[0]);
        return sh >= h && sh < endH;
      });
      if (blockSlots.length === 0) continue;

      const slotInfos: SlotInfo[] = blockSlots.map(time => {
        const booked = bookedSlots[time] || 0;
        const isBlocked = !!(blockedSlots && blockedSlots[time]);
        const available = isBlocked ? 0 : Math.max(0, counselorCount - booked);
        return { time, booked, available, isFull: available <= 0 };
      });

      const totalCapacity = blockSlots.length * counselorCount;
      const totalBooked = slotInfos.reduce((sum, s) => sum + s.booked, 0);
      const pct = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;
      const waitEstimate = estimateWaitTime(pct, counselorCount, serviceSlugs, walkinPressure);

      result.push({
        label: `${String(h).padStart(2, '0')}:00 – ${String(endH).padStart(2, '0')}:00`,
        startHour: h,
        endHour: endH,
        slots: slotInfos,
        totalSlots: blockSlots.length,
        bookedCount: totalBooked,
        occupancyPct: pct,
        level: pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low',
        waitEstimate,
      });
    }
    return result;
  }, [allSlots, bookedSlots, counselorCount, openTime, closeTime, serviceSlugs, walkinPressure]);

  // Day-level summary
  const totalAvailable = allSlots.length * counselorCount;
  const totalBooked = allSlots.reduce((sum, s) => sum + (bookedSlots[s] || 0), 0);
  const totalFree = Math.max(0, totalAvailable - totalBooked);
  const dayPct = totalAvailable > 0 ? Math.round((totalBooked / totalAvailable) * 100) : 0;
  const dayLevel: 'low' | 'medium' | 'high' = dayPct >= 70 ? 'high' : dayPct >= 40 ? 'medium' : 'low';
  const dayWait = useMemo(
    () => estimateWaitTime(dayPct, counselorCount, serviceSlugs, walkinPressure),
    [dayPct, counselorCount, serviceSlugs, walkinPressure]
  );
  const dayWaitLabel = getWaitLabel(dayWait, language as 'th' | 'en');

  const levelConfig = {
    low: {
      color: 'bg-emerald-500',
      bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/40',
      label: language === 'th' ? 'ว่างมาก' : 'Low',
    },
    medium: {
      color: 'bg-amber-500',
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/40',
      label: language === 'th' ? 'ปานกลาง' : 'Medium',
    },
    high: {
      color: 'bg-red-500',
      bgLight: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/40',
      label: language === 'th' ? 'หนาแน่น' : 'High',
    },
  };

  // Smart suggestion
  const selectedBlockIdx = selectedTime
    ? blocks.findIndex(b => b.slots.some(s => s.time === selectedTime))
    : -1;
  const selectedBlock = selectedBlockIdx >= 0 ? blocks[selectedBlockIdx] : null;
  const quieterBlock = selectedBlock?.level === 'high'
    ? blocks.find(b => b.level === 'low' || b.level === 'medium')
    : null;

  return (
    <div className="space-y-4">
      {/* A) Day Summary Card */}
      <Card className={cn("p-4 rounded-3xl", levelConfig[dayLevel].border, levelConfig[dayLevel].bgLight)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", levelConfig[dayLevel].bgLight)}>
              <Activity className={cn("h-5 w-5", levelConfig[dayLevel].text)} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {totalFree} {language === 'th' ? 'คิวว่าง' : 'slots available'}
              </p>
              <p className={cn("text-xs font-medium", levelConfig[dayLevel].text)}>
                {levelConfig[dayLevel].label} — {dayPct}% {language === 'th' ? 'ถูกจองแล้ว' : 'booked'}
              </p>
            </div>
          </div>
          <div className={cn("h-3 w-3 rounded-full animate-pulse", levelConfig[dayLevel].color)} />
        </div>

        {/* Capacity bar */}
        <div className="mt-3 h-2 rounded-full bg-muted/60 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", levelConfig[dayLevel].color)}
            style={{ width: `${dayPct}%` }}
          />
        </div>

        {/* Wait time estimate for the day */}
        <div className="mt-3 flex items-center gap-2">
          <Timer className={cn("h-3.5 w-3.5", dayWaitLabel.color)} />
          <p className={cn("text-xs font-semibold", dayWaitLabel.color)}>
            {language === 'th'
              ? `เวลารอโดยประมาณวันนี้: ${dayWait.low}–${dayWait.high} นาที`
              : `Typical wait today: ${dayWait.low}–${dayWait.high} min`}
            {' · '}{dayWaitLabel.text}
          </p>
        </div>

        {/* Walk-in pressure note */}
        {hasWalkinPressure && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <Users className="h-3 w-3 shrink-0" />
            <span>
              {language === 'th'
                ? `มี walk-in ${walkinPressure!.activeWalkins} คนรออยู่ อาจทำให้เวลารอเพิ่มขึ้น`
                : `${walkinPressure!.activeWalkins} walk-in${walkinPressure!.activeWalkins !== 1 ? 's' : ''} waiting — may increase wait time`}
            </span>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-2">
          {language === 'th'
            ? '💡 เลือกช่วงสีเขียวเพื่อรอคิวน้อยลง'
            : '💡 Choose a green time block for shorter wait times'}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">
          {language === 'th'
            ? 'เป็นการประมาณการจากข้อมูลคิวและ walk-in เวลารอจริงอาจเปลี่ยนแปลงได้'
            : 'Estimated from appointment + walk-in queue patterns. Actual waiting may vary.'}
        </p>
      </Card>

      {/* B) Density Time Blocks */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5 inline mr-1" />
          {language === 'th' ? 'เลือกช่วงเวลา' : 'Choose a time block'}
        </p>

        {blocks.map((block, idx) => {
          const isExpanded = expandedBlock === idx;
          const cfg = levelConfig[block.level];
          const availableInBlock = block.slots.filter(s => !s.isFull).length;
          const waitLabel = getWaitLabel(block.waitEstimate, language as 'th' | 'en');

          return (
            <div key={block.label} className="space-y-0">
              <button
                onClick={() => setExpandedBlock(isExpanded ? null : idx)}
                className={cn(
                  "w-full flex items-center gap-3 p-3.5 rounded-3xl transition-all text-left border-2",
                  isExpanded
                    ? "border-primary/30 shadow-md bg-card"
                    : "border-transparent bg-card hover:border-primary/20 hover:shadow-sm"
                )}
              >
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0", cfg.bgLight)}>
                  <p className={cn("text-xs font-black leading-none", cfg.text)}>{block.occupancyPct}%</p>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{block.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {availableInBlock} {language === 'th' ? 'คิวว่าง' : 'available'} · {cfg.label}
                  </p>
                  <p className={cn("text-[10px] font-medium mt-0.5 flex items-center gap-1", waitLabel.color)}>
                    <Timer className="h-2.5 w-2.5" />
                    {language === 'th'
                      ? `~${block.waitEstimate.low}–${block.waitEstimate.high} นาที`
                      : `~${block.waitEstimate.low}–${block.waitEstimate.high} min`}
                  </p>
                </div>

                <div className="w-16 shrink-0">
                  <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", cfg.color)}
                      style={{ width: `${block.occupancyPct}%` }}
                    />
                  </div>
                </div>

                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-2 pt-2 pb-1 animate-slide-up">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                    {block.slots.map(slot => {
                      const isSelected = selectedTime === slot.time;
                      const lowAvail = !slot.isFull && slot.available === 1;
                      return (
                        <button
                          key={slot.time}
                          disabled={slot.isFull}
                          onClick={() => onSelectTime(slot.time)}
                          className={cn(
                            "relative py-2.5 px-1 rounded-full text-center transition-all border-2",
                            slot.isFull
                              ? "bg-muted/50 text-muted-foreground border-transparent cursor-not-allowed opacity-40"
                              : isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                              : "bg-card border-border hover:border-primary/40 hover:shadow-sm"
                          )}
                        >
                          <span className="text-sm font-semibold">{slot.time}</span>
                          {!slot.isFull && (
                            <p className={cn(
                              "text-[9px] leading-tight mt-0.5",
                              isSelected ? "text-primary-foreground/70" : lowAvail ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"
                            )}>
                              {lowAvail
                                ? (language === 'th' ? 'เหลือ 1' : '1 left')
                                : `${slot.available}/${counselorCount}`}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Smart suggestion with wait comparison */}
      {quieterBlock && selectedTime && (
        <Card className={cn(
          "p-3 rounded-2xl flex items-start gap-2",
          levelConfig['low'].bgLight, levelConfig['low'].border
        )}>
          <AlertCircle className={cn("h-4 w-4 shrink-0 mt-0.5", levelConfig['low'].text)} />
          <div>
            <p className={cn("text-xs font-semibold", levelConfig['low'].text)}>
              {language === 'th'
                ? `💡 ช่วง ${quieterBlock.label} ว่างกว่า — รอประมาณ ${quieterBlock.waitEstimate.low}–${quieterBlock.waitEstimate.high} นาที แทน ${selectedBlock!.waitEstimate.low}–${selectedBlock!.waitEstimate.high} นาที`
                : `💡 ${quieterBlock.label} is quieter — ~${quieterBlock.waitEstimate.low}–${quieterBlock.waitEstimate.high} min wait vs ${selectedBlock!.waitEstimate.low}–${selectedBlock!.waitEstimate.high} min`}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 mt-1 text-xs rounded-full px-3"
              onClick={() => setExpandedBlock(blocks.indexOf(quieterBlock))}
            >
              {language === 'th' ? 'ดูช่วงนี้' : 'View this block'}
            </Button>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {language === 'th' ? 'ว่าง' : 'Low'}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> {language === 'th' ? 'ปานกลาง' : 'Medium'}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> {language === 'th' ? 'หนาแน่น' : 'Busy'}</span>
      </div>
    </div>
  );
}
