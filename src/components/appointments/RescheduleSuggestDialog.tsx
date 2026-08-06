import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarClock, Loader2, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Slot {
  suggested_date: string;
  start_time: string;
  load_count: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branchId?: string | null;
  branchSlug?: string | null;
}

/**
 * Shown right after a client cancels: keeps the door open by suggesting
 * quiet slots on other days instead of ending the journey.
 */
export function RescheduleSuggestDialog({ open, onOpenChange, branchId, branchSlug }: Props) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const tx = (th: string, en: string) => (language === 'th' ? th : en);

  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    if (!open || (!branchId && !branchSlug)) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let id = branchId || null;
      if (!id && branchSlug) {
        const { data: b } = await supabase
          .from('booking_branches').select('id').eq('slug', branchSlug).maybeSingle();
        id = b?.id || null;
      }
      if (!id) { if (!cancelled) { setSlots([]); setLoading(false); } return; }
      const { data } = await supabase.rpc('suggest_reschedule_slots', {
        _branch_id: id,
        _from_date: null,
        _limit: 6,
      } as any);
      if (!cancelled) {
        setSlots(((data as Slot[]) || []).filter((s) => s.start_time >= '08:00:00'));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, branchId, branchSlug]);


  const go = (slot?: Slot) => {
    const params = new URLSearchParams();
    if (branchSlug) params.set('branch', branchSlug);
    if (slot) {
      params.set('date', slot.suggested_date);
      params.set('time', slot.start_time.slice(0, 5));
    }
    onOpenChange(false);
    navigate(`/booking${params.toString() ? `?${params}` : ''}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {tx('ยกเลิกนัดแล้ว — จองวันอื่นไหม?', 'Appointment cancelled — book another day?')}
          </DialogTitle>
          <DialogDescription>
            {tx('เราแนะนำช่วงเวลาที่คนไม่แน่น จะได้ไม่ต้องรอนาน',
                'Here are quieter time slots so you spend less time waiting.')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : slots.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {slots.map((s) => (
              <button
                key={`${s.suggested_date}-${s.start_time}`}
                onClick={() => go(s)}
                className="rounded-2xl border p-3 text-left hover:border-primary transition-colors"
              >
                <p className="text-sm font-medium">
                  {format(parseISO(s.suggested_date), 'EEE d MMM')}
                </p>
                <p className="text-lg font-bold">{s.start_time.slice(0, 5)}</p>
                {s.load_count === 0 && (
                  <p className="text-[11px] text-teal-600 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />{tx('ว่างมาก', 'Very quiet')}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {tx('ยังไม่มีช่วงเวลาแนะนำตอนนี้ เลือกวันเองได้เลย', 'No suggestions right now — pick a day yourself.')}
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => onOpenChange(false)}>
            {tx('ไว้ก่อน', 'Not now')}
          </Button>
          <Button className="flex-1 rounded-full" onClick={() => go()}>
            {tx('เลือกวันเอง', 'Choose a day')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
