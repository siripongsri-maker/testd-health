import { useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { AppointmentPill } from './AppointmentPill';
import type { EnrichedAppointment, BranchOption } from './types';

interface Props {
  appointments: EnrichedAppointment[];
  branches: BranchOption[];
  branchFilter: string;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onClickAppointment: (apt: EnrichedAppointment) => void;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function ScheduleView({ appointments, branches, branchFilter, selectedIds, onToggleSelect, onClickAppointment }: Props) {
  const { language } = useLanguage();
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Group appointments by time slot (30-min buckets) and branch
  const grid = useMemo(() => {
    const map: Record<string, Record<string, EnrichedAppointment[]>> = {};
    for (const slot of timeSlots) {
      map[slot] = {};
    }
    for (const apt of appointments) {
      const time = (apt.start_time as string).slice(0, 5);
      // Find the nearest 30-min slot
      const [h, m] = time.split(':').map(Number);
      const slotM = m < 30 ? 0 : 30;
      const slotKey = `${String(h).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
      const branchId = apt.branch_id;
      if (!map[slotKey]) map[slotKey] = {};
      if (!map[slotKey][branchId]) map[slotKey][branchId] = [];
      map[slotKey][branchId].push(apt);
    }
    return map;
  }, [appointments, timeSlots]);

  const displayBranches = branchFilter === 'all' ? branches : branches.filter(b => b.id === branchFilter);

  // Only show time slots that have appointments or are within working hours
  const activeSlotsSet = new Set<string>();
  for (const slot of timeSlots) {
    if (Object.values(grid[slot] || {}).some(arr => arr.length > 0)) {
      activeSlotsSet.add(slot);
    }
  }
  // Also show slots within working hours (8-18)
  const activeSlots = timeSlots.filter(slot => {
    const h = parseInt(slot.split(':')[0]);
    return (h >= 8 && h <= 18) || activeSlotsSet.has(slot);
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Branch column headers */}
        <div className="flex border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="w-16 shrink-0 p-2 text-[11px] font-semibold text-muted-foreground">
            {language === 'th' ? 'เวลา' : 'Time'}
          </div>
          {displayBranches.map(b => (
            <div key={b.id} className="flex-1 p-2 text-xs font-semibold text-center border-l border-border/20">
              {language === 'th' ? b.name_th : b.name_en}
            </div>
          ))}
        </div>

        {/* Time rows */}
        {activeSlots.map(slot => {
          const hasAny = displayBranches.some(b => (grid[slot]?.[b.id]?.length || 0) > 0);
          return (
            <div
              key={slot}
              className={`flex border-b border-border/10 ${hasAny ? 'bg-background' : 'bg-muted/20'}`}
            >
              <div className="w-16 shrink-0 p-1.5 text-[11px] font-mono text-muted-foreground flex items-start justify-end pr-3">
                {slot}
              </div>
              {displayBranches.map(b => {
                const apts = grid[slot]?.[b.id] || [];
                return (
                  <div key={b.id} className="flex-1 p-1 border-l border-border/10 min-h-[36px]">
                    <div className="space-y-1">
                      {apts.slice(0, 3).map(apt => (
                        <AppointmentPill
                          key={apt.id}
                          appointment={apt}
                          selected={selectedIds.has(apt.id)}
                          onToggleSelect={onToggleSelect}
                          onClick={onClickAppointment}
                          compact
                        />
                      ))}
                      {apts.length > 3 && (
                        <div className="text-[10px] text-muted-foreground text-center py-0.5">
                          +{apts.length - 3} {language === 'th' ? 'เพิ่มเติม' : 'more'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {appointments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {language === 'th' ? 'ไม่มีนัดหมายในวันนี้' : 'No appointments for this date'}
          </div>
        )}
      </div>
    </div>
  );
}
