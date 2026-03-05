import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Play, CheckCircle2, Clock, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

function getParticipantSessionId(): string {
  let sid = sessionStorage.getItem('invite_participant_sid');
  if (!sid) {
    sid = `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('invite_participant_sid', sid);
  }
  return sid;
}

const TIMER_SECONDS = 15 * 60; // 15 minutes

export default function InviteSession() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const { language } = useLanguage();
  const isTh = language === 'th';
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [joined, setJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionCode) return;
    const { data: sess } = await supabase
      .from('partner_test_sessions')
      .select('*, partner_invites!inner(code)')
      .eq('session_code', sessionCode)
      .maybeSingle();

    if (sess) {
      setSession(sess);
      setInviteCode((sess as any).partner_invites?.code || null);
      if (sess.status === 'active' && sess.started_at) {
        const elapsed = Math.floor((Date.now() - new Date(sess.started_at).getTime()) / 1000);
        const remaining = Math.max(0, TIMER_SECONDS - elapsed);
        setTimeLeft(remaining);
        if (remaining > 0) setTimerActive(true);
      }
      if (sess.status === 'completed') {
        setTimeLeft(0);
        setTimerActive(false);
      }
    }

    const { data: parts } = await supabase
      .from('partner_test_session_participants')
      .select('id, participant_session_id, joined_at')
      .eq('session_id', sess?.id);
    if (parts) {
      setParticipants(parts);
      const mySid = getParticipantSessionId();
      if (parts.some(p => p.participant_session_id === mySid)) setJoined(true);
    }

    setLoading(false);
  }, [sessionCode]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // Realtime subscription
  useEffect(() => {
    if (!session?.id) return;
    const channel = supabase
      .channel(`session-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_test_sessions', filter: `id=eq.${session.id}` }, () => loadSession())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'partner_test_session_participants', filter: `session_id=eq.${session.id}` }, () => loadSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, loadSession]);

  // Timer
  useEffect(() => {
    if (!timerActive) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimerActive(false);
          // Mark completed
          if (session?.id) {
            supabase.from('partner_test_sessions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', session.id).then();
            if (inviteCode) {
              supabase.rpc('record_partner_invite_event', { p_code: inviteCode, p_visitor_session_id: getParticipantSessionId(), p_event_type: 'timer_complete' }).then();
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [timerActive, session?.id, inviteCode]);

  const handleJoin = async () => {
    if (!session?.id) return;
    const sid = getParticipantSessionId();
    await supabase.from('partner_test_session_participants').insert({
      session_id: session.id,
      participant_session_id: sid,
    });
    setJoined(true);
    if (inviteCode) {
      await supabase.rpc('record_partner_invite_event', { p_code: inviteCode, p_visitor_session_id: sid, p_event_type: 'join_session' });
    }
    loadSession();
  };

  const handleStart = async () => {
    if (!session?.id) return;
    await supabase.from('partner_test_sessions').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', session.id);
    setTimerActive(true);
    setTimeLeft(TIMER_SECONDS);
    if (inviteCode) {
      await supabase.rpc('record_partner_invite_event', { p_code: inviteCode, p_visitor_session_id: getParticipantSessionId(), p_event_type: 'timer_start' });
    }
    loadSession();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">{isTh ? 'ไม่พบเซสชัน' : 'Session not found'}</h1>
        </div>
      </div>
    );
  }

  const isCompleted = session.status === 'completed' || timeLeft === 0;
  const isActive = session.status === 'active' && timeLeft > 0;
  const isWaiting = session.status === 'waiting';
  const progress = ((TIMER_SECONDS - timeLeft) / TIMER_SECONDS) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-xl font-bold text-foreground">
          {isTh ? 'ตรวจพร้อมกัน' : 'Test Together'}
        </h1>

        {/* Timer circle */}
        <div className="relative mx-auto w-48 h-48">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="stroke-muted" />
            <circle
              cx="50" cy="50" r="45" fill="none" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className={cn(
                "transition-all duration-1000",
                isCompleted ? "stroke-emerald-500" : "stroke-primary"
              )}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isCompleted ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            ) : (
              <>
                <Timer className="h-6 w-6 text-primary mb-1" />
                <span className="text-3xl font-bold font-mono text-foreground">{formatTime(timeLeft)}</span>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className={cn(
          "rounded-xl border px-4 py-3",
          isCompleted ? "bg-emerald-500/10 border-emerald-500/30" :
          isActive ? "bg-primary/10 border-primary/30" :
          "bg-muted border-border"
        )}>
          <p className="font-medium text-foreground">
            {isCompleted ? (isTh ? '✅ เสร็จสิ้น! อ่านผลได้เลย' : '✅ Done! You can read your result now') :
             isActive ? (isTh ? '⏱ กำลังจับเวลา...' : '⏱ Timer running...') :
             (isTh ? 'รอผู้เข้าร่วม...' : 'Waiting for participants...')}
          </p>
        </div>

        {/* Participants */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">
              {isTh ? `ผู้เข้าร่วม (${participants.length}/${session.max_participants})` : `Participants (${participants.length}/${session.max_participants})`}
            </span>
          </div>
          <div className="space-y-2">
            {participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {i + 1}
                </div>
                <span className="text-muted-foreground">
                  {isTh ? `ผู้เข้าร่วม ${i + 1}` : `Participant ${i + 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {!joined && isWaiting && participants.length < session.max_participants && (
          <Button onClick={handleJoin} className="w-full" size="lg">
            <Users className="h-5 w-5 mr-2" />
            {isTh ? 'เข้าร่วม' : 'Join Session'}
          </Button>
        )}

        {joined && isWaiting && participants.length >= 1 && (
          <Button onClick={handleStart} className="w-full" size="lg">
            <Play className="h-5 w-5 mr-2" />
            {isTh ? 'เริ่มจับเวลา 15 นาที' : 'Start 15-minute timer'}
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          {isTh
            ? 'ใส่ชุดตรวจ แล้วรอผลพร้อมกัน ปลอดภัย ส่วนตัว'
            : 'Run the test and wait for results together. Safe and private.'}
        </p>
      </div>
    </div>
  );
}
