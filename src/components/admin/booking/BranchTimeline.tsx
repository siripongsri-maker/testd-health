import { useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDisplayServices } from '@/lib/appointments';
import { AppointmentPill } from './AppointmentPill';
import { BatchActionBar } from './BatchActionBar';
import type { EnrichedAppointment, BranchOption } from './types';

interface Props {
  branchId: string;
  branches: BranchOption[];
  appointments: EnrichedAppointment[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onClickAppointment: (apt: EnrichedAppointment) => void;
  onBack: () => void;
  onRefresh: () => void;
}

export function BranchTimeline({
  branchId, branches, appointments, selectedIds,
  onToggleSelect, onSelectAll, onClearSelection,
  onClickAppointment, onBack, onRefresh,
}: Props) {
  const { language } = useLanguage();
  const branch = branches.find(b => b.id === branchId);
  const branchApts = useMemo(
    () => appointments.filter(a => a.branch_id === branchId),
    [appointments, branchId]
  );

  // Group by hour
  const hourGroups = useMemo(() => {
    const map: Record<string, EnrichedAppointment[]> = {};
    branchApts.forEach(a => {
      const h = (a.start_time as string).slice(0, 2) + ':00';
      if (!map[h]) map[h] = [];
      map[h].push(a);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [branchApts]);

  const [expandedHours, setExpandedHours] = useState<Set<string>>(new Set());
  const toggleExpand = (h: string) => {
    setExpandedHours(prev => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h); else next.add(h);
      return next;
    });
  };

  // Filter selectedIds to this branch only for batch actions
  const branchSelectedIds = useMemo(() => {
    const branchIdSet = new Set(branchApts.map(a => a.id));
    return new Set([...selectedIds].filter(id => branchIdSet.has(id)));
  }, [selectedIds, branchApts]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onBack}>
          <ChevronLeft className="h-3.5 w-3.5" />
          {language === 'th' ? 'กลับ' : 'Back'}
        </Button>
        <h3 className="text-sm font-bold flex-1">
          {branch ? (language === 'th' ? branch.name_th : branch.name_en) : 'Branch'}
        </h3>
        <span className="text-xs text-muted-foreground">{branchApts.length} {language === 'th' ? 'นัดหมาย' : 'appointments'}</span>
      </div>

      {/* Batch action bar */}
      <BatchActionBar
        selectedIds={branchSelectedIds}
        appointments={branchApts}
        onClearSelection={onClearSelection}
        onSelectAll={() => {
          branchApts.forEach(a => onToggleSelect(a.id));
        }}
        onRefresh={onRefresh}
        totalFiltered={branchApts.length}
      />

      {/* Timeline */}
      {hourGroups.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">{language === 'th' ? 'ไม่มีนัดหมาย' : 'No appointments'}</p>
      ) : (
        <div className="space-y-1">
          {hourGroups.map(([hour, apts]) => {
            const expanded = expandedHours.has(hour) || apts.length <= 3;
            const visible = expanded ? apts : apts.slice(0, 3);

            return (
              <div key={hour} className="relative">
                {/* Hour label */}
                <div className="flex items-center gap-2 mb-1 sticky top-0 bg-background/90 backdrop-blur-sm z-[5] py-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-bold font-mono text-muted-foreground">{hour}</span>
                  <div className="flex-1 h-px bg-border/30" />
                  <span className="text-[10px] text-muted-foreground">{apts.length}</span>
                </div>

                {/* Appointment pills */}
                <div className="ml-5 space-y-1">
                  {visible.map(apt => (
                    <AppointmentPill
                      key={apt.id}
                      appointment={apt}
                      selected={selectedIds.has(apt.id)}
                      onToggleSelect={onToggleSelect}
                      onClick={onClickAppointment}
                      compact
                    />
                  ))}
                  {!expanded && apts.length > 3 && (
                    <button
                      onClick={() => toggleExpand(hour)}
                      className="text-[10px] text-primary font-medium py-1 px-2 hover:underline"
                    >
                      +{apts.length - 3} {language === 'th' ? 'เพิ่มเติม' : 'more'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky batch bar */}
      {branchSelectedIds.size > 0 && (
        <BatchActionBar
          selectedIds={branchSelectedIds}
          appointments={branchApts}
          onClearSelection={onClearSelection}
          onSelectAll={() => branchApts.forEach(a => onToggleSelect(a.id))}
          onRefresh={onRefresh}
          totalFiltered={branchApts.length}
        />
      )}
    </div>
  );
}
