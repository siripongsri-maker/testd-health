import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, Clock, Pill, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/lib/i18n';
import { getUserData, getTodayKey, recordCheckIn } from '@/lib/store';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const POSITION_KEY = 'medClockPosition';
const MEDICINES_KEY = 'medClockMedicines';

interface Medicine {
  id: string;
  name: string;
  time: string;
  enabled: boolean;
  dbId?: string; // database UUID
}

function getStoredPosition(): { x: number; y: number } {
  try {
    const stored = localStorage.getItem(POSITION_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { x: window.innerWidth - 80, y: window.innerHeight - 160 };
}

function getStoredMedicines(): Medicine[] {
  try {
    const stored = localStorage.getItem(MEDICINES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [{ id: '1', name: 'PrEP', time: '20:00', enabled: true }];
}

export function FloatingMedClock() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const userData = getUserData();

  const [position, setPosition] = useState(getStoredPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>(getStoredMedicines);
  const [countdown, setCountdown] = useState('');
  const [isLate, setIsLate] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMoved = useRef(false);
  const todayKey = getTodayKey();
  const todayTaken = userData.checkIns[todayKey] === 'taken';

  // Load medicines from DB on login
  useEffect(() => {
    if (!user) return;
    const loadFromDb = async () => {
      const { data, error } = await supabase
        .from('user_medicines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        const dbMeds: Medicine[] = data.map((m: any) => ({
          id: m.id,
          name: m.name,
          time: typeof m.time === 'string' ? m.time.slice(0, 5) : '20:00',
          enabled: m.enabled,
          dbId: m.id,
        }));
        setMedicines(dbMeds);
        localStorage.setItem(MEDICINES_KEY, JSON.stringify(dbMeds));
      }
    };
    loadFromDb();
  }, [user]);

  // Save medicines to localStorage
  useEffect(() => {
    localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
  }, [medicines]);

  // Save position
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    }
  }, [position, isDragging]);

  // Countdown to next medicine
  useEffect(() => {
    if (todayTaken) { setCountdown(''); setIsLate(false); return; }

    const activeMeds = medicines.filter(m => m.enabled);
    if (activeMeds.length === 0) { setCountdown(''); return; }

    const update = () => {
      const now = new Date();
      let nearestDiff = Infinity;

      for (const med of activeMeds) {
        const [h, m] = med.time.split(':').map(Number);
        const target = new Date();
        target.setHours(h, m, 0, 0);
        const diff = target.getTime() - now.getTime();
        if (Math.abs(diff) < Math.abs(nearestDiff)) {
          nearestDiff = diff;
        }
      }

      const abs = Math.abs(nearestDiff);
      const mins = Math.floor(abs / 60000);
      const hrs = Math.floor(mins / 60);
      const rm = mins % 60;

      if (nearestDiff > 0) {
        setIsLate(false);
        setCountdown(hrs > 0 ? `${hrs}h${rm}m` : `${rm}m`);
      } else {
        setIsLate(true);
        setCountdown(mins === 0 ? '!' : hrs > 0 ? `-${hrs}h${rm}m` : `-${rm}m`);
      }
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [todayTaken, medicines]);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    hasMoved.current = false;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;

    const newX = Math.max(0, Math.min(window.innerWidth - 56, dragStartRef.current.posX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, dragStartRef.current.posY + dy));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (!hasMoved.current) {
      setPanelOpen(prev => !prev);
    }
  }, []);

  // Sync medicines to DB
  const syncToDb = useCallback(async (meds: Medicine[]) => {
    if (!user) return;
    setSyncing(true);
    try {
      // Delete all existing then re-insert (simple sync)
      await supabase.from('user_medicines').delete().eq('user_id', user.id);

      if (meds.length > 0) {
        const rows = meds.map(m => ({
          user_id: user.id,
          name: m.name || 'Unnamed',
          time: m.time + ':00', // format as HH:MM:SS for TIME column
          enabled: m.enabled,
        }));
        const { data } = await supabase.from('user_medicines').insert(rows).select();
        if (data) {
          // Update local medicines with DB IDs
          const updated = meds.map((m, i) => ({
            ...m,
            dbId: data[i]?.id,
            id: data[i]?.id || m.id,
          }));
          setMedicines(updated);
          localStorage.setItem(MEDICINES_KEY, JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.error('Failed to sync medicines:', err);
    } finally {
      setSyncing(false);
    }
  }, [user]);

  const handleMarkTaken = async () => {
    // Local check-in
    recordCheckIn(todayKey, 'taken');

    // DB check-in for each enabled medicine
    if (user) {
      const activeMeds = medicines.filter(m => m.enabled && m.dbId);
      for (const med of activeMeds) {
        await supabase.from('medication_checkins').upsert({
          user_id: user.id,
          medicine_id: med.dbId!,
          date: todayKey,
          status: 'taken',
          taken_at: new Date().toISOString(),
          scheduled_time: med.time + ':00',
        }, { onConflict: 'user_id,medicine_id,date' });
      }
    }

    toast.success(
      language === 'th' ? 'ดีมาก! 💪' : 'Great job! 💪',
      { description: `Streak: ${getUserData().streak} 🔥` }
    );
    setPanelOpen(false);
  };

  const addMedicine = () => {
    const newMed: Medicine = {
      id: Date.now().toString(),
      name: '',
      time: '09:00',
      enabled: true,
    };
    setMedicines(prev => [...prev, newMed]);
  };

  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMedicine = (id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
  };

  // Save & sync when panel closes
  const handleClosePanel = () => {
    setPanelOpen(false);
    syncToDb(medicines);
  };

  // Ring progress
  const progress = todayTaken ? 100 : (() => {
    const activeMeds = medicines.filter(m => m.enabled);
    if (activeMeds.length === 0) return 0;
    const now = new Date();
    const earliest = activeMeds.reduce((min, m) => {
      const [h, mi] = m.time.split(':').map(Number);
      const t = new Date(); t.setHours(h, mi, 0, 0);
      return t < min ? t : min;
    }, new Date(8640000000000000));
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const total = earliest.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    if (now >= earliest) return 100;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  })();

  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <>
      {/* Floating Draggable Clock */}
      <div
        ref={dragRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`fixed z-50 touch-none select-none transition-shadow duration-200 ${
          isDragging ? 'scale-110 shadow-2xl' : 'shadow-lg hover:shadow-xl'
        }`}
        style={{
          left: position.x,
          top: position.y,
          width: 56,
          height: 56,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div className={`relative w-14 h-14 rounded-full glass-heavy border-2 flex items-center justify-center transition-all ${
          todayTaken
            ? 'border-emerald-400 bg-emerald-500/20'
            : isLate
              ? 'border-amber-400 bg-amber-500/20 animate-pulse'
              : 'border-primary/40 bg-primary/10'
        }`}>
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="20" stroke="currentColor" strokeWidth="3" fill="none" className="text-muted/20" />
            <circle
              cx="28" cy="28" r="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"
              className={todayTaken ? 'text-emerald-500' : isLate ? 'text-amber-500' : 'text-primary'}
              style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s' }}
            />
          </svg>

          {/* Center icon */}
          {todayTaken ? (
            <Check className="h-5 w-5 text-emerald-500 relative z-10" />
          ) : (
            <Pill className="h-5 w-5 text-primary relative z-10" />
          )}

          {/* Countdown badge */}
          {countdown && !todayTaken && (
            <span className={`absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full z-20 ${
              isLate ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'
            }`}>
              {countdown}
            </span>
          )}

          {/* Streak badge */}
          {userData.streak > 0 && todayTaken && (
            <span className="absolute -top-1 -right-1 text-[9px] font-bold px-1 py-0.5 rounded-full bg-amber-500 text-white z-20">
              🔥{userData.streak}
            </span>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={handleClosePanel} />
          <div
            className="fixed z-50 w-[calc(100%-2rem)] max-w-sm glass-heavy rounded-2xl p-4 shadow-2xl border border-border/50 animate-scale-in"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">
                  {language === 'th' ? 'ตั้งค่ายา' : 'Medication Settings'}
                </h3>
                {syncing && <span className="text-[10px] text-muted-foreground animate-pulse">syncing...</span>}
              </div>
              <button onClick={handleClosePanel} className="p-1 rounded-full hover:bg-muted/50">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Today Status */}
            <div className={`rounded-xl p-3 mb-4 ${todayTaken ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-primary/5 border border-primary/20'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-bold ${todayTaken ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                    {todayTaken
                      ? (language === 'th' ? '✓ กินยาแล้ววันนี้' : '✓ Taken today')
                      : (language === 'th' ? 'ยังไม่ได้กินยา' : 'Not taken yet')
                    }
                  </p>
                  {countdown && !todayTaken && (
                    <p className={`text-xs font-semibold mt-0.5 ${isLate ? 'text-amber-600' : 'text-primary'}`}>
                      {isLate ? '⚠️ ' : '⏰ '}{countdown}
                    </p>
                  )}
                </div>
                {!todayTaken && (
                  <Button size="sm" className="rounded-xl" onClick={handleMarkTaken}>
                    <Check className="h-4 w-4 mr-1" />
                    {language === 'th' ? 'กินแล้ว' : 'Taken'}
                  </Button>
                )}
              </div>
            </div>

            {/* Medicine List */}
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                {language === 'th' ? 'รายการยา' : 'Medicines'}
              </Label>
              {medicines.map((med) => (
                <div key={med.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/30">
                  <Switch
                    checked={med.enabled}
                    onCheckedChange={(v) => updateMedicine(med.id, { enabled: v })}
                    className="scale-75"
                  />
                  <Input
                    value={med.name}
                    onChange={(e) => updateMedicine(med.id, { name: e.target.value })}
                    placeholder={language === 'th' ? 'ชื่อยา' : 'Medicine name'}
                    className="h-8 text-sm bg-transparent border-none shadow-none focus-visible:ring-0 flex-1"
                  />
                  <input
                    type="time"
                    value={med.time}
                    onChange={(e) => updateMedicine(med.id, { time: e.target.value })}
                    className="h-8 w-[5.5rem] text-xs bg-transparent border border-border/30 rounded-lg px-2 text-foreground"
                  />
                  <button onClick={() => removeMedicine(med.id)} className="p-1 hover:bg-destructive/10 rounded-lg">
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Medicine */}
            <Button variant="outline" size="sm" onClick={addMedicine} className="w-full rounded-xl mb-3 border-dashed">
              + {language === 'th' ? 'เพิ่มยา' : 'Add Medicine'}
            </Button>

            {/* Streak & sync info */}
            <div className="text-center text-xs text-muted-foreground space-y-1">
              {userData.streak > 0 && (
                <p>🔥 Streak: <span className="font-bold text-amber-600">{userData.streak}</span> {language === 'th' ? 'วัน' : 'days'}</p>
              )}
              {user && (
                <p className="text-[10px]">☁️ {language === 'th' ? 'ซิงค์กับคลาวด์อัตโนมัติ' : 'Auto-synced to cloud'}</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
