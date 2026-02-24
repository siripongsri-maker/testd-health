import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { getDisplayServices, updateAppointmentStatusRPC, addStaffNoteRPC } from '@/lib/appointments';
import { toast } from 'sonner';
import { Clock, MapPin, Hash, User, MessageSquarePlus, Loader2, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrichedAppointment } from './types';
import { STATUS_OPTIONS, getStatusInfo } from './types';

interface Props {
  appointment: EnrichedAppointment | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function AppointmentDetailDrawer({ appointment: apt, onClose, onRefresh }: Props) {
  const { language } = useLanguage();
  const [updating, setUpdating] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  if (!apt) return null;

  const services = getDisplayServices(apt);
  const statusInfo = getStatusInfo(apt.status);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateAppointmentStatusRPC(apt.id, newStatus);
      toast.success(language === 'th' ? 'อัปเดตแล้ว' : 'Updated');
      onRefresh();
    } catch {
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error');
    }
    setUpdating(false);
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setAddingNote(true);
    try {
      await addStaffNoteRPC(apt.id, noteInput.trim());
      toast.success(language === 'th' ? 'เพิ่มหมายเหตุแล้ว' : 'Note added');
      setNoteInput('');
      onRefresh();
    } catch {
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด' : 'Error');
    }
    setAddingNote(false);
  };

  return (
    <Sheet open={!!apt} onOpenChange={() => onClose()}>
      <SheetContent className="w-[340px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {services[0]?.icon || '🩺'}
            <span className="truncate">
              {services.map(s => language === 'th' ? s.name_th : s.name_en).join(', ')}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Status + New/Returning */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", statusInfo.color)}>
              {language === 'th' ? statusInfo.labelTh : statusInfo.labelEn}
            </span>
            <span className={cn(
              "text-xs font-bold px-2 py-1 rounded-full",
              apt.is_returning
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
            )}>
              {apt.is_returning
                ? (language === 'th' ? 'กลับมาอีกครั้ง' : 'Returning')
                : (language === 'th' ? 'ใหม่' : 'New')
              }
            </span>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{apt.appointment_date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold">{(apt.start_time as string).slice(0, 5)}</span>
            </div>
            {apt.booking_branches && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{language === 'th' ? apt.booking_branches.name_th : apt.booking_branches.name_en}</span>
              </div>
            )}
            {apt.referral_code && (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <span className="font-mono font-bold text-primary">{apt.referral_code}</span>
              </div>
            )}
            {apt.staff && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{language === 'th' ? apt.staff.name_th : apt.staff.name_en}</span>
              </div>
            )}
            {apt.contact_email && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {apt.contact_email.slice(0, 3)}***@{apt.contact_email.split('@')[1]}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {apt.notes && (
            <div className="p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground italic">"{apt.notes}"</p>
            </div>
          )}
          {apt.staff_notes && (
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs font-medium mb-1">{language === 'th' ? 'หมายเหตุเจ้าหน้าที่' : 'Staff Notes'}</p>
              {apt.staff_notes.split('\n---\n').map((note, i) => (
                <p key={i} className="text-xs text-blue-700 dark:text-blue-300">{note}</p>
              ))}
            </div>
          )}

          {/* Activity log */}
          {apt.logs && apt.logs.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1">{language === 'th' ? 'ประวัติ' : 'Activity'}</p>
              <div className="space-y-1">
                {apt.logs.slice(0, 5).map(log => (
                  <div key={log.id} className="text-[11px] text-muted-foreground">
                    <span className="font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                    {' '}{log.action}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status update */}
          <div>
            <p className="text-xs font-semibold mb-1">{language === 'th' ? 'เปลี่ยนสถานะ' : 'Update Status'}</p>
            <Select value={apt.status} onValueChange={handleStatusChange} disabled={updating}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {language === 'th' ? s.labelTh : s.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Add note */}
          <div>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1">
              <MessageSquarePlus className="h-3 w-3" />
              {language === 'th' ? 'เพิ่มหมายเหตุ' : 'Add Note'}
            </p>
            <div className="flex gap-2">
              <Textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={language === 'th' ? 'หมายเหตุ...' : 'Note...'}
                className="text-xs min-h-[60px]"
                maxLength={2000}
              />
            </div>
            <Button
              size="sm"
              className="mt-1 w-full"
              disabled={addingNote || !noteInput.trim()}
              onClick={handleAddNote}
            >
              {addingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : (language === 'th' ? 'บันทึก' : 'Save')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
