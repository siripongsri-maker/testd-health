import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Play, CheckCircle2, Clock, Timer, Calendar, TestTube, Heart, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

function getParticipantSessionId(): string {
  let sid = sessionStorage.getItem('invite_participant_sid');
  if (!sid) {
    sid = `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('invite_participant_sid', sid);
  }
  return sid;
}

const TIMER_SECONDS = 15 * 60;

type PairState = 'waiting' | 'accepted' | 'plans_to_test' | 'booking_started' | 'booked' | 'active' | 'completed';

export default function InviteSession() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!session?.id) return;
    const channel = supabase
      .channel(`session-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_test_sessions', filter: `id=eq.${session.id}` }, () => loadSession())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'partner_test_session_participants', filter: `session_id=eq.${session.id}` }, () => loadSession())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, loadSession]);

  useEffect(() => {
    if (!timerActive) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimerActive(false);
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
    // Update session state to accepted
    await supabase.from('partner_test_sessions').update({ status: 'accepted' }).eq('id', session.id).eq('status', 'waiting');
    if (inviteCode) {
      await supabase.rpc('record_partner_invite_event', { p_code: inviteCode, p_visitor_session_id: sid, p_event_type: 'join_session' });
    }
    loadSession();
  };

  const handleUpdateState = async (newStatus: PairState) => {
    if (!session?.id) return;
    await supabase.from('partner_test_sessions').update({ status: newStatus }).eq('id', session.id);
    if (inviteCode) {
      await supabase.rpc('record_partner_invite_event', { p_code: inviteCode, p_visitor_session_id: getParticipantSessionId(), p_event_type: `pair_${newStatus}` });
    }
    loadSession();
  };

  const handleStartTimer = async () => {
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

  const status = session.status as PairState;
  const isTimerDone = status === 'completed' || (status === 'active' && timeLeft === 0);
  const isTimerRunning = status === 'active' && timeLeft > 0;
  const isPairPhase = ['waiting', 'accepted', 'plans_to_test', 'booking_started', 'booked'].includes(status);
  const progress = status === 'active' || status === 'completed' ? ((TIMER_SECONDS - timeLeft) / TIMER_SECONDS) * 100 : 0;

  const pairSteps: { status: PairState; labelTh: string; labelEn: string; icon: React.ElementType }[] = [
    { status: 'accepted', labelTh: 'ตอบรับแล้ว', labelEn: 'Accepted', icon: ThumbsUp },
    { status: 'plans_to_test', labelTh: 'ตั้งใจจะไปตรวจ', labelEn: 'Plans to test', icon: Heart },
    { status: 'booked', labelTh: 'จองแล้ว', labelEn: 'Booked', icon: Calendar },
  ];

  const statusOrder: Record<string, number> = { waiting: 0, accepted: 1, plans_to_test: 2, booking_started: 3, booked: 4, active: 5, completed: 6 };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-xl font-bold text-foreground">
          {isTh ? 'ไปตรวจด้วยกัน' : 'Test Together'}
        </h1>

        {/* Pair commitment flow */}
        {isPairPhase && (
          <div className="space-y-4">
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

            {/* Pair progress steps */}
            {joined && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {isTh ? 'ความคืบหน้า' : 'Progress'}
                </p>
                <div className="space-y-2">
                  {pairSteps.map(step => {
                    const Icon = step.icon;
                    const isReached = statusOrder[status] >= statusOrder[step.status];
                    const isCurrent = status === step.status;
                    const canAdvance = statusOrder[step.status] === statusOrder[status] + 1;

                    return (
                      <button
                        key={step.status}
                        onClick={() => canAdvance ? handleUpdateState(step.status) : null}
                        disabled={!canAdvance}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                          isReached ? "border-primary/30 bg-primary/5" :
                          canAdvance ? "border-primary/50 bg-background hover:bg-primary/5 cursor-pointer" :
                          "border-border bg-muted/30 opacity-50"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                          isReached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {isReached ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </div>
                        <span className={cn("text-sm font-medium", isReached ? "text-primary" : "text-foreground")}>
                          {isTh ? step.labelTh : step.labelEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Join / actions */}
            {!joined && status === 'waiting' && participants.length < session.max_participants && (
              <Button onClick={handleJoin} className="w-full" size="lg">
                <Users className="h-5 w-5 mr-2" />
                {isTh ? 'เข้าร่วม' : 'Join Session'}
              </Button>
            )}

            {/* Action buttons for pair flow */}
            {joined && (
              <div className="space-y-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { navigate('/booking'); }}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Calendar className="h-5 w-5" />
                  {isTh ? 'นัดตรวจด้วยกัน' : 'Book together'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { navigate('/hiv-selftest'); }}
                  className="w-full gap-2"
                  size="lg"
                >
                  <TestTube className="h-5 w-5" />
                  {isTh ? 'ขอชุดตรวจ' : 'Get self-test kit'}
                </Button>
                {participants.length >= 1 && statusOrder[status] >= statusOrder['accepted'] && (
                  <Button onClick={handleStartTimer} className="w-full gap-2" size="lg">
                    <Play className="h-5 w-5" />
                    {isTh ? 'ตรวจชุดตรวจพร้อมกัน (15 นาที)' : 'Self-test together (15 min)'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timer phase */}
        {(isTimerRunning || isTimerDone) && (
          <div className="space-y-4">
            <div className="relative mx-auto w-48 h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" strokeWidth="6" className="stroke-muted" />
                <circle
                  cx="50" cy="50" r="45" fill="none" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  className={cn(
                    "transition-all duration-1000",
                    isTimerDone ? "stroke-emerald-500" : "stroke-primary"
                  )}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isTimerDone ? (
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                ) : (
                  <>
                    <Timer className="h-6 w-6 text-primary mb-1" />
                    <span className="text-3xl font-bold font-mono text-foreground">{formatTime(timeLeft)}</span>
                  </>
                )}
              </div>
            </div>

            <div className={cn(
              "rounded-xl border px-4 py-3",
              isTimerDone ? "bg-emerald-500/10 border-emerald-500/30" : "bg-primary/10 border-primary/30"
            )}>
              <p className="font-medium text-foreground">
                {isTimerDone ? (isTh ? '✅ เสร็จสิ้น! อ่านผลได้เลย' : '✅ Done! You can read your result now') :
                 (isTh ? '⏱ กำลังจับเวลา...' : '⏱ Timer running...')}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {isTh
            ? 'ปลอดภัย ส่วนตัว ไม่ระบุตัวตน'
            : 'Safe, private, anonymous.'}
        </p>
      </div>
    </div>
  );
}
