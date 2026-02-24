import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { updateAppointmentStatusRPC, addStaffNoteRPC } from '@/lib/appointments';
import { toast } from 'sonner';
import { CheckSquare, XSquare, Loader2, Download, MessageSquarePlus, ArrowUpDown } from 'lucide-react';
import type { EnrichedAppointment } from './types';
import { STATUS_OPTIONS } from './types';
import { format } from 'date-fns';

interface Props {
  selectedIds: Set<string>;
  appointments: EnrichedAppointment[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  onRefresh: () => void;
  totalFiltered: number;
}

export function BatchActionBar({ selectedIds, appointments, onClearSelection, onSelectAll, onRefresh, totalFiltered }: Props) {
  const { language } = useLanguage();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [batchStatus, setBatchStatus] = useState('confirmed');
  const [batchNote, setBatchNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const count = selectedIds.size;

  const handleBatchStatus = async () => {
    setProcessing(true);
    let success = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        await updateAppointmentStatusRPC(id, batchStatus);
        success++;
      } catch {
        fail++;
      }
    }
    setProcessing(false);
    setShowStatusDialog(false);
    toast.success(
      language === 'th'
        ? `อัปเดตสำเร็จ ${success} รายการ${fail > 0 ? ` (ล้มเหลว ${fail})` : ''}`
        : `Updated ${success} appointments${fail > 0 ? ` (${fail} failed)` : ''}`
    );
    onClearSelection();
    onRefresh();
  };

  const handleBatchNote = async () => {
    if (!batchNote.trim()) return;
    setProcessing(true);
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
    const noteWithTimestamp = `[Batch ${timestamp}] ${batchNote.trim()}`;
    let success = 0;
    for (const id of selectedIds) {
      try {
        await addStaffNoteRPC(id, noteWithTimestamp);
        success++;
      } catch { /* skip */ }
    }
    setProcessing(false);
    setShowNoteDialog(false);
    setBatchNote('');
    toast.success(
      language === 'th' ? `เพิ่มโน้ต ${success} รายการ` : `Added note to ${success} appointments`
    );
    onClearSelection();
    onRefresh();
  };

  const handleExportCSV = () => {
    const selected = appointments.filter(a => selectedIds.has(a.id));
    const rows = selected.map(a => ({
      date: a.appointment_date,
      time: (a.start_time as string).slice(0, 5),
      branch: a.booking_branches?.name_en || '',
      services: (a.services || []).map(s => s.name_en).join('; '),
      referral_code: a.referral_code || '',
      status: a.status,
      type: a.is_returning ? 'Returning' : 'New',
    }));

    const header = 'Date,Time,Branch,Services,Referral Code,Status,Type\n';
    const csv = header + rows.map(r =>
      `${r.date},${r.time},"${r.branch}","${r.services}",${r.referral_code},${r.status},${r.type}`
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(language === 'th' ? 'ส่งออก CSV แล้ว' : 'CSV exported');
  };

  if (count === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onSelectAll}>
          <CheckSquare className="h-3 w-3" />
          {language === 'th' ? `เลือกทั้งหมด (${totalFiltered})` : `Select all (${totalFiltered})`}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border/40 p-2 flex items-center gap-2 flex-wrap shadow-lg rounded-t-xl">
        <span className="text-xs font-bold text-primary">
          {language === 'th' ? `เลือก ${count} รายการ` : `${count} selected`}
        </span>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onClearSelection}>
          <XSquare className="h-3 w-3" />
          {language === 'th' ? 'ล้าง' : 'Clear'}
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowStatusDialog(true)}>
          <ArrowUpDown className="h-3 w-3" />
          {language === 'th' ? 'เปลี่ยนสถานะ' : 'Change Status'}
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowNoteDialog(true)}>
          <MessageSquarePlus className="h-3 w-3" />
          {language === 'th' ? 'เพิ่มโน้ต' : 'Add Note'}
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExportCSV}>
          <Download className="h-3 w-3" />
          CSV
        </Button>
      </div>

      {/* Batch status dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'th' ? `เปลี่ยนสถานะ ${count} รายการ` : `Update status for ${count} appointments`}
            </DialogTitle>
          </DialogHeader>
          <Select value={batchStatus} onValueChange={setBatchStatus}>
            <SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button onClick={handleBatchStatus} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'th' ? 'ยืนยัน' : 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch note dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'th' ? `เพิ่มโน้ตให้ ${count} รายการ` : `Add note to ${count} appointments`}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={batchNote}
            onChange={(e) => setBatchNote(e.target.value)}
            placeholder={language === 'th' ? 'พิมพ์หมายเหตุ...' : 'Type note...'}
            maxLength={2000}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button onClick={handleBatchNote} disabled={processing || !batchNote.trim()}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'th' ? 'บันทึก' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
