import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

// Smoothly tweens a number toward `value` for a friendly count-up effect.
function AnimatedNumber({ value, className, format }: { value: number; className?: string; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (value === display) return;
    fromRef.current = display;
    startRef.current = performance.now();
    const from = fromRef.current;
    const delta = value - from;
    const duration = 900;
    setBump(true);
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setTimeout(() => setBump(false), 200);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span
      className={`inline-block tabular-nums transition-transform duration-300 ${bump ? 'scale-110' : 'scale-100'} ${className ?? ''}`}
    >
      {format ? format(display) : display}
    </span>
  );
}

const CROWD_C = ['#3B6D11', '#534AB7', '#BA7517', '#0F6E56', '#993556', '#185FA5'];
const R_COLORS = ['#5DCAA5', '#AFA9EC', '#EF9F27', '#ED93B1', '#85B7EB'];
const P = 4;

interface Runner {
  x: number;
  lane: number;
  color: string;
  speed: number;
  phase: number;
}

export function PixelStadiumWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { language } = useLanguage();
  const animRef = useRef<number>(0);
  const runnersRef = useRef<Runner[]>([]);
  const crowdPhaseRef = useRef(0);

  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [ticker, setTicker] = useState(language === 'th' ? 'LIVE · ยินดีต้อนรับสู่ testD' : 'LIVE · Welcome to testD');

  // Fetch real stats via SECURITY DEFINER RPC (works for anonymous visitors)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_home_community_stats');
        if (error) throw error;
        const row: any = Array.isArray(data) ? data[0] : data;
        if (!row) return;
        setTodayCount(Number(row.today_events) || 0);
        setTotalCount(Number(row.total_events) || 0);
        setViewerCount(Number(row.total_members) || 0);
      } catch (e) {
        console.error('[PixelStadium] stats fetch failed', e);
      }
    };
    fetchStats();
  }, []);

  // Init runners
  useEffect(() => {
    runnersRef.current = Array.from({ length: 4 }, (_, i) => ({
      x: 5 + Math.random() * 55,
      lane: i % 3,
      color: R_COLORS[i % R_COLORS.length],
      speed: 0.15 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const W = 400, H = 180;
    const LANE_YS = [15, 18, 20];

    function px(x: number, y: number, w: number, h: number, col: string) {
      ctx!.fillStyle = col;
      ctx!.fillRect(x * P, y * P, w * P, h * P);
    }

    function drawStadium() {
      ctx!.fillStyle = '#0a0e1a';
      ctx!.fillRect(0, 0, W, H);
      for (let y = 0; y < 13; y++)
        for (let x = 0; x < 100; x++)
          px(x, y, 1, 1, y % 2 === 0 ? '#252a50' : '#1c2040');
      for (let x = 0; x < 7; x++)
        for (let y = 0; y < 13; y++)
          px(x * 14, y, 1, 1, '#0c1020');
      px(0, 12, 100, 2, '#141830');
      for (let y = 14; y < 22; y++)
        for (let x = 0; x < 100; x++)
          px(x, y, 1, 1, '#28241a');
      px(0, 14, 100, 1, '#484030');
      px(0, 21, 100, 1, '#484030');
      px(0, 17, 100, 1, '#383020');
      px(0, 19, 100, 1, '#383020');
      for (let x = 0; x < 100; x += 4) { px(x, 17, 2, 1, '#484030'); px(x, 19, 2, 1, '#484030'); }
      for (let y = 22; y < 30; y++)
        for (let x = 0; x < 100; x++)
          px(x, y, 1, 1, '#091508');
      for (let y = 30; y < 45; y++)
        for (let x = 0; x < 100; x++)
          px(x, y, 1, 1, '#06080f');
      px(2, 13, 2, 9, '#1D9E75');
      px(96, 13, 2, 9, '#E24B4A');
      for (let i = 0; i < 5; i++) { px(96, 13 + i * 2, 4, 1, '#E24B4A'); px(96, 14 + i * 2, 4, 1, '#050505'); }
      px(86, 2, 13, 7, '#080808');
      px(86, 2, 13, 1, '#222');
      px(86, 8, 13, 1, '#222');
      px(86, 2, 1, 7, '#222');
      px(98, 2, 1, 7, '#222');
    }

    function drawCrowd() {
      for (let x = 0; x < 100; x++) {
        const b = Math.sin(crowdPhaseRef.current + x * 0.5) > 0.4 ? -1 : 0;
        const ci = Math.floor((x * 5 + 13)) % CROWD_C.length;
        px(x, 2 + b, 1, 2, CROWD_C[ci]);
        px(x, 4 + b, 1, 1, CROWD_C[ci] + '88');
      }
    }

    function drawRunner(r: Runner) {
      const x = Math.round(r.x), ly = LANE_YS[r.lane];
      const bob = Math.sin(r.phase * 2) > 0 ? 0 : -1;
      const leg = Math.sin(r.phase) > 0;
      px(x + 1, ly - 4 + bob, 2, 2, r.color);
      px(x, ly - 2 + bob, 3, 3, r.color);
      if (leg) { px(x, ly + 1, 1, 2, r.color); px(x + 2, ly, 1, 2, r.color); }
      else { px(x, ly, 1, 2, r.color); px(x + 2, ly + 1, 1, 2, r.color); }
      if (leg) { px(x - 1, ly - 1 + bob, 1, 2, r.color); px(x + 3, ly - 2 + bob, 1, 2, r.color); }
      else { px(x - 1, ly - 2 + bob, 1, 2, r.color); px(x + 3, ly - 1 + bob, 1, 2, r.color); }
    }

    function loop() {
      crowdPhaseRef.current += 0.05;
      drawStadium();
      drawCrowd();
      runnersRef.current.forEach(r => {
        r.x += r.speed;
        r.phase += 0.18;
        if (r.x > 97) r.x = 3;
        drawRunner(r);
      });
      // Scoreboard text
      ctx!.fillStyle = '#080808';
      ctx!.fillRect(87 * P, 3 * P, 11 * P, 4 * P);
      ctx!.fillStyle = '#1D9E75';
      ctx!.font = 'bold 7px monospace';
      ctx!.textAlign = 'center';
      ctx!.fillText(String(todayCountRef.current).padStart(3, '0'), 92 * P, 7 * P);
      ctx!.fillStyle = '#444';
      ctx!.font = '5px monospace';
      ctx!.fillText('TODAY', 92 * P, 9 * P);

      animRef.current = requestAnimationFrame(loop);
    }

    const todayCountRef = { current: 0 };
    const interval = setInterval(() => {
      todayCountRef.current = todayCount;
    }, 500);

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(interval);
    };
  }, [todayCount]);

  // Simulated ticker updates
  useEffect(() => {
    const ACTS_TH = ['จองตรวจแล้ว', 'เริ่ม PrEP', 'บันทึกยาครบ', 'ตรวจ HIV เสร็จ'];
    const ACTS_EN = ['booked a test', 'started PrEP', 'logged meds', 'completed HIV test'];
    const acts = language === 'th' ? ACTS_TH : ACTS_EN;

    const interval = setInterval(() => {
      if (Math.random() < 0.45) {
        setTodayCount(p => p + 1);
        setTotalCount(p => p + 1);
        const act = acts[Math.floor(Math.random() * acts.length)];
        setTicker(`LIVE · ${language === 'th' ? 'ผู้ใช้ใหม่' : 'Someone'} ${act}`);
      }
    }, 7000);

    const viewerInterval = setInterval(() => {
      setViewerCount(p => p + Math.floor(Math.random() * 3));
    }, 3500);

    return () => { clearInterval(interval); clearInterval(viewerInterval); };
  }, [language]);

  const pct = Math.min(100, totalCount > 0 ? Math.round((todayCount / Math.max(todayCount, 100)) * 100) : 0);

  return (
    <div className="rounded-2xl overflow-hidden border border-border/30" style={{ fontFamily: 'monospace', background: '#0a0e1a' }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={180}
        className="w-full block"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Stats grid — simplified, single label per cell, animated count-up */}
      <div className="grid grid-cols-3" style={{ background: '#0a0e1a' }}>
        <div className="p-2.5 text-center relative" style={{ borderTop: '2px solid #1D9E75', borderRight: '1px solid #1a1f3a' }}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#1D9E75', boxShadow: '0 0 6px #1D9E75' }} />
            <span className="text-[9px] tracking-wider font-semibold" style={{ color: '#1D9E75' }}>
              {language === 'th' ? 'วันนี้' : 'TODAY'}
            </span>
          </div>
          <AnimatedNumber value={todayCount} className="text-xl font-bold text-white leading-none" />
        </div>
        <div className="p-2.5 text-center" style={{ borderTop: '2px solid #7F77DD', borderRight: '1px solid #1a1f3a' }}>
          <div className="text-[9px] tracking-wider font-semibold mb-1" style={{ color: '#AFA9EC' }}>
            {language === 'th' ? 'ทั้งหมด' : 'ALL-TIME'}
          </div>
          <AnimatedNumber value={totalCount} className="text-xl font-bold text-white leading-none" format={(n) => n.toLocaleString()} />
        </div>
        <div className="p-2.5 text-center" style={{ borderTop: '2px solid #EF9F27' }}>
          <div className="text-[9px] tracking-wider font-semibold mb-1" style={{ color: '#FAC775' }}>
            {language === 'th' ? 'สมาชิก' : 'MEMBERS'}
          </div>
          <AnimatedNumber value={viewerCount} className="text-xl font-bold text-white leading-none" format={(n) => n.toLocaleString()} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-3 py-1.5" style={{ background: '#0a0e1a', borderTop: '1px solid #1a1f3a' }}>
        <div className="flex justify-between mb-1">
          <span className="text-[8px]" style={{ color: '#444' }}>DAILY GOAL</span>
          <span className="text-[8px]" style={{ color: '#1D9E75' }}>{todayCount} / 100</span>
        </div>
        <div className="relative h-[5px] overflow-hidden" style={{ background: '#111', border: '1px solid #1a1f3a' }}>
          <div
            className="h-full transition-all duration-600"
            style={{ width: `${pct}%`, background: '#1D9E75', transitionTimingFunction: 'steps(8)' }}
          />
          <div className="absolute inset-0" style={{
            background: 'repeating-linear-gradient(90deg, transparent, transparent 9%, rgba(0,0,0,.4) 9%, rgba(0,0,0,.4) 10%)'
          }} />
        </div>
      </div>

      {/* Ticker */}
      <div className="px-3 py-1 flex items-center justify-between gap-2" style={{ background: '#060810', borderTop: '1px solid #111' }}>
        <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
          <div className="w-[5px] h-[5px] flex-shrink-0 animate-pulse" style={{ background: '#E24B4A' }} />
          <div className="text-[8px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: '#555' }}>
            {ticker}
          </div>
        </div>
      </div>
    </div>
  );
}
