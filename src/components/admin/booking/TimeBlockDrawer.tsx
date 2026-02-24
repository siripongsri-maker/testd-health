import { useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { AppointmentPill } from './AppointmentPill';
import { BatchActionBar } from './BatchActionBar';
import type { EnrichedAppointment, BranchOption } from './types';
import { STATUS_OPTIONS } from './types';

interface Props {
  open: boolean;
  timeRange: string; // e.g. "14:00–15:00"
  appointments: EnrichedAppointment[];
  branches: BranchOption[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onClickAppointment: (apt: EnrichedAppointment) => void;
  onClose: () => void;
  onRefresh: () => void;
}

export function TimeBlockDrawer({
  open, timeRange, appointments, branches,
  selectedIds, onToggleSelect, onClickAppointment,
  onClose, onRefresh,
}: Props) {
  const { language } = useLanguage();
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // all | new | returning

  // Parse time range to filter appointments
  const filteredApts = useMemo(() => {
    if (!timeRange) return [];
    const [startStr] = timeRange.split('–');
    const startHour = parseInt(startStr);

    let result = appointments.filter(a => {
      const h = parseInt((a.start_time as string).slice(0, 2));
      return h === startHour;
    });

    if (branchFilter !== 'all') result = result.filter(a => a.branch_id === branchFilter);
    if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter);
    if (typeFilter === 'new') result = result.filter(a => !a.is_returning);
    if (typeFilter === 'returning') result = result.filter(a => a.is_returning);

    return result.sort((a, b) => (a.start_time as string).localeCompare(b.start_time as string));
  }, [timeRange, appointments, branchFilter, statusFilter, typeFilter]);

  const drawerSelectedIds = useMemo(() => {
    const ids = new Set(filteredApts.map(a => a.id));
    return new Set([...selectedIds].filter(id => ids.has(id)));
  }, [selectedIds, filteredApts]);

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-[360px] sm:w-[440px] overflow-y-auto p-4">
        <SheetHeader>
          <SheetTitle className="text-sm">
            🕐 {timeRange} — {filteredApts.length} {language === 'th' ? 'นัดหมาย' : 'appointments'}
          </SheetTitle>
        </SheetHeader>

        {/* Filters */}
        <div className="flex gap-2 mt-3 mb-3 flex-wrap">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-7 w-24 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'th' ? 'ทุกสาขา' : 'All'}</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {language === 'th' ? b.name_th : b.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 w-24 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'th' ? 'ทั้งหมด' : 'All'}</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{language === 'th' ? s.labelTh : s.labelEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-7 w-24 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'th' ? 'ทั้งหมด' : 'All'}</SelectItem>
              <SelectItem value="new">{language === 'th' ? 'ใหม่' : 'New'}</SelectItem>
              <SelectItem value="returning">{language === 'th' ? 'กลับมา' : 'Return'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-1.5">
          {filteredApts.map(apt => (
            <AppointmentPill
              key={apt.id}
              appointment={apt}
              selected={selectedIds.has(apt.id)}
              onToggleSelect={onToggleSelect}
              onClick={onClickAppointment}
            />
          ))}
          {filteredApts.length === 0 && (
            <p className="text-xs text-muted-foreground py-6 text-center">{language === 'th' ? 'ไม่มีนัดหมาย' : 'No appointments'}</p>
          )}
        </div>

        {/* Batch bar */}
        {drawerSelectedIds.size > 0 && (
          <div className="mt-3">
            <BatchActionBar
              selectedIds={drawerSelectedIds}
              appointments={filteredApts}
              onClearSelection={() => filteredApts.forEach(a => { if (selectedIds.has(a.id)) onToggleSelect(a.id); })}
              onSelectAll={() => filteredApts.forEach(a => { if (!selectedIds.has(a.id)) onToggleSelect(a.id); })}
              onRefresh={onRefresh}
              totalFiltered={filteredApts.length}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
